const trainingRepository = require("../repositories/training.repository");
const paymentRepository = require("../../../../../shared/repositories/payment.repository");
const { prisma } = require("../../../../../config/prisma.config");
const {
  createError,
  validateMemberExists,
  validatePlanVariant,
  calculateDates,
  calculatePricing,
  validateStatusTransition,
  calculateDues,
  resolveOfferDiscount,
  resolveOfferConfig,
} = require("../../../../../shared/helpers/subscription.helper");

class TrainingService {
  async _getTrainingOrThrow(trainingId) {
    const training = await trainingRepository.findByIdWithDetails(trainingId);
    if (!training) {
      throw createError("Training not found", 404);
    }
    return training;
  }

  async createTraining(data) {
    await validateMemberExists(data.memberId);
    const planVariant = await validatePlanVariant(data.planVariantId, "training");

    const { startDate, endDate } = calculateDates(
      data.startDate,
      planVariant.durationDays,
    );

    // Try enhanced offer config first, fall back to legacy
    const offerConfig = await resolveOfferConfig(
      data.offerId, data.orgId, data.memberId,
      data.membershipPlanVariantId || null, data.planVariantId,
    );
    let effectiveDiscount;
    let offerTrainerPayout = null;
    if (offerConfig) {
      effectiveDiscount = offerConfig.trainingDiscount;
      // Offer trainer payout overrides form input
      if (offerConfig.trainerFixedPayout != null) offerTrainerPayout = offerConfig.trainerFixedPayout;
    } else {
      const offerDiscount = await resolveOfferDiscount(data.offerId, data.orgId, planVariant.price);
      effectiveDiscount = offerDiscount !== null ? offerDiscount : (data.discountAmount || 0);
    }

    const { priceAtPurchase, discountAmount, finalPrice } = calculatePricing(
      planVariant.price,
      effectiveDiscount,
    );

    // Priority: offer payout > form input > null (uses trainer default split)
    const resolvedTrainerPayout = offerTrainerPayout ?? (data.trainerFixedPayout != null ? parseFloat(data.trainerFixedPayout) : null);

    const result = await prisma.$transaction(async (tx) => {
      const training = await tx.training.create({
        data: {
          orgId: data.orgId,
          memberId: data.memberId,
          planVariantId: data.planVariantId,
          trainerId: data.trainerId,
          startDate,
          endDate,
          status: startDate > new Date() ? "upcoming" : "active",
          priceAtPurchase,
          discountAmount,
          finalPrice,
          autoRenew: data.autoRenew || false,
          notes: data.notes || null,
          offerId: data.offerId || null,
          trainerFixedPayout: resolvedTrainerPayout,
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
            paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
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
      await paymentRepository.getPaidAmountForSubscription(trainingId, "trainingId");

    return calculateDues(training, paidAmount, "trainingId");
  }

  async updateTraining(trainingId, updateData) {
    const training = await this._getTrainingOrThrow(trainingId);

    const dbData = {};
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.autoRenew !== undefined)
      dbData.autoRenew = updateData.autoRenew;
    if (updateData.notes !== undefined) dbData.notes = updateData.notes;
    if (updateData.startDate !== undefined)
      dbData.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined)
      dbData.endDate = new Date(updateData.endDate);
    if (updateData.trainerId !== undefined)
      dbData.trainerId = updateData.trainerId;
    if (updateData.trainerFixedPayout !== undefined)
      dbData.trainerFixedPayout = updateData.trainerFixedPayout != null ? parseFloat(updateData.trainerFixedPayout) : null;
    if (updateData.discountAmount !== undefined) {
      const { discountAmount, finalPrice } = calculatePricing(
        training.priceAtPurchase,
        updateData.discountAmount,
      );
      dbData.discountAmount = discountAmount;
      dbData.finalPrice = finalPrice;
    }

    await trainingRepository.update(trainingId, dbData);
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async deleteTraining(trainingId) {
    await this._getTrainingOrThrow(trainingId);

    await prisma.$transaction(async (tx) => {
      await tx.trainerPayout.deleteMany({ where: { trainingId } });
      await tx.payment.deleteMany({ where: { trainingId } });
      await tx.training.delete({ where: { id: trainingId } });
    });
  }

  async cancelTraining(trainingId) {
    const training = await this._getTrainingOrThrow(trainingId);
    validateStatusTransition(training.status, "cancel", "Training");

    await trainingRepository.update(trainingId, { status: "cancelled" });
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async freezeTraining(trainingId, { reason, freezeStartDate, freezeEndDate } = {}) {
    const training = await this._getTrainingOrThrow(trainingId);

    if (training.freezeCount >= 3) {
      throw createError("Maximum freeze limit (3) reached for this training", 400);
    }

    validateStatusTransition(training.status, "freeze", "Training");

    const start = freezeStartDate ? new Date(freezeStartDate) : new Date();
    const isFuture = start > new Date();

    await trainingRepository.update(trainingId, {
      status: isFuture ? training.status : "frozen",
      freezeReason: reason || null,
      freezeStartDate: start,
      freezeEndDate: freezeEndDate ? new Date(freezeEndDate) : null,
      freezeCount: training.freezeCount + 1,
    });
    return await trainingRepository.findByIdWithDetails(trainingId);
  }

  async unfreezeTraining(trainingId, { extendEndDate = true } = {}) {
    const training = await this._getTrainingOrThrow(trainingId);
    validateStatusTransition(training.status, "unfreeze", "Training");

    // Extend endDate by the number of days actually frozen so far,
    // mirroring the cron job logic for consistency.
    let newEndDate = new Date(training.endDate);
    if (extendEndDate && training.freezeStartDate) {
      const actualFreezeEnd = new Date();
      const daysFrozen = Math.ceil(
        (actualFreezeEnd - new Date(training.freezeStartDate)) / (1000 * 60 * 60 * 24)
      );
      if (daysFrozen > 0) {
        newEndDate.setDate(newEndDate.getDate() + daysFrozen);
      }
    }

    await trainingRepository.update(trainingId, {
      status: "active",
      endDate: newEndDate,
      freezeReason: null,
      freezeStartDate: null,
      freezeEndDate: null,
    });
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
      paymentRepository.getPaymentStats(orgId, { trainingOnly: true }),
    ]);

    return { ...trainingStats, ...paymentStats };
  }
}

module.exports = new TrainingService();
