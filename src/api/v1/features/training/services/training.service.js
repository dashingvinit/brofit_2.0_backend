const trainingRepository = require("../repositories/training.repository");
const trainingPaymentRepository = require("../repositories/training-payment.repository");
const { prisma } = require("../../../../../config/prisma.config");
const {
  validateMemberExists,
  validatePlanVariant,
  calculateDates,
  calculatePricing,
  validateStatusTransition,
  calculateDues,
} = require("../../../../../shared/helpers/subscription.helper");

class TrainingService {
  async _getTrainingOrThrow(
    trainingId,
    errorMessage = "Training not found",
  ) {
    const training =
      await trainingRepository.findByIdWithDetails(trainingId);
    if (!training) {
      throw new Error(errorMessage);
    }
    return training;
  }

  async createTraining(data) {
    if (!data.orgId) {
      throw new Error("Organization ID is required");
    }
    if (!data.memberId) {
      throw new Error("Member ID is required");
    }
    if (!data.planVariantId) {
      throw new Error("Plan variant ID is required");
    }
    if (!data.trainerName) {
      throw new Error("Trainer name is required");
    }

    await validateMemberExists(data.memberId);
    const planVariant = await validatePlanVariant(data.planVariantId, "training");

    const { startDate, endDate } = calculateDates(
      data.startDate,
      planVariant.durationDays,
    );
    const { priceAtPurchase, discountAmount, finalPrice } = calculatePricing(
      planVariant.price,
      data.discountAmount,
    );

    const result = await prisma.$transaction(async (tx) => {
      const training = await tx.training.create({
        data: {
          orgId: data.orgId,
          memberId: data.memberId,
          planVariantId: data.planVariantId,
          trainerName: data.trainerName,
          startDate,
          endDate,
          status: "active",
          priceAtPurchase,
          discountAmount,
          finalPrice,
          autoRenew: data.autoRenew || false,
          notes: data.notes || null,
        },
        include: {
          member: true,
          planVariant: { include: { planType: true } },
        },
      });

      let payment = null;
      if (data.paymentAmount && data.paymentAmount > 0) {
        payment = await tx.payment.create({
          data: {
            orgId: data.orgId,
            memberId: data.memberId,
            trainingId: training.id,
            amount: data.paymentAmount,
            method: data.paymentMethod || "cash",
            status: "paid",
            reference: data.paymentReference || null,
            notes: data.paymentNotes || null,
            paidAt: new Date(),
          },
        });
      }

      return { training, payment };
    });

    return await trainingRepository.findByIdWithDetails(
      result.training.id,
    );
  }

  async getTrainingById(trainingId) {
    return await this._getTrainingOrThrow(trainingId);
  }

  async getAllTrainings(orgId, page = 1, limit = 10, filters = {}) {
    const result = await trainingRepository.findByOrganization(
      orgId,
      page,
      limit,
      filters,
    );

    return {
      trainings: result.data,
      pagination: result.pagination,
    };
  }

  async getMemberTrainings(memberId) {
    return await trainingRepository.findByMember(memberId);
  }

  async getActiveTraining(memberId, orgId) {
    return await trainingRepository.findActiveTraining(memberId, orgId);
  }

  async getTrainingDues(trainingId) {
    const training = await this._getTrainingOrThrow(trainingId);
    const paidAmount =
      await trainingPaymentRepository.getPaidAmountForTraining(trainingId);

    return calculateDues(training, paidAmount, "trainingId");
  }

  async updateTraining(trainingId, updateData) {
    await this._getTrainingOrThrow(trainingId);

    const dbData = {};
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.autoRenew !== undefined)
      dbData.autoRenew = updateData.autoRenew;
    if (updateData.notes !== undefined) dbData.notes = updateData.notes;
    if (updateData.endDate !== undefined)
      dbData.endDate = new Date(updateData.endDate);
    if (updateData.trainerName !== undefined)
      dbData.trainerName = updateData.trainerName;

    await trainingRepository.update(trainingId, dbData);
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async cancelTraining(trainingId) {
    const training = await this._getTrainingOrThrow(trainingId);
    validateStatusTransition(training.status, "cancel", "Training");

    await trainingRepository.update(trainingId, { status: "cancelled" });
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async freezeTraining(trainingId) {
    const training = await this._getTrainingOrThrow(trainingId);
    validateStatusTransition(training.status, "freeze", "Training");

    await trainingRepository.update(trainingId, { status: "frozen" });
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async unfreezeTraining(trainingId) {
    const training = await this._getTrainingOrThrow(trainingId);
    validateStatusTransition(training.status, "unfreeze", "Training");

    await trainingRepository.update(trainingId, { status: "active" });
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async getExpiringTrainings(orgId, daysAhead = 7) {
    return await trainingRepository.findExpiringTrainings(
      orgId,
      daysAhead,
    );
  }

  async getTrainingStats(orgId) {
    const [trainingStats, paymentStats] = await Promise.all([
      trainingRepository.getTrainingStats(orgId),
      trainingPaymentRepository.getPaymentStats(orgId),
    ]);

    return { ...trainingStats, ...paymentStats };
  }
}

module.exports = new TrainingService();
