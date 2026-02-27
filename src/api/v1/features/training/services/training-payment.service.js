const trainingPaymentRepository = require("../repositories/training-payment.repository");
const trainingRepository = require("../repositories/training.repository");
const {
  validateMemberExists,
  validatePaymentAmount,
} = require("../../../../../shared/helpers/subscription.helper");

class TrainingPaymentService {
  async recordPayment(data) {
    if (!data.orgId) {
      throw new Error("Organization ID is required");
    }
    if (!data.memberId) {
      throw new Error("Member ID is required");
    }
    if (!data.amount || data.amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    await validateMemberExists(data.memberId);

    if (data.trainingId) {
      const training = await trainingRepository.findByIdWithDetails(
        data.trainingId,
      );
      if (!training) {
        throw new Error("Training not found");
      }

      const paidAmount = await trainingPaymentRepository.getPaidAmountForTraining(
        data.trainingId,
      );
      validatePaymentAmount(data.amount, training.finalPrice, paidAmount, "Training");
    }

    const payment = await trainingPaymentRepository.create({
      orgId: data.orgId,
      memberId: data.memberId,
      trainingId: data.trainingId || null,
      amount: data.amount,
      method: data.method || "cash",
      status: data.status || "paid",
      reference: data.reference || null,
      notes: data.notes || null,
      paidAt: data.status === "paid" ? new Date() : null,
    });

    return payment;
  }

  async getPaymentById(paymentId) {
    const payment = await trainingPaymentRepository.get(paymentId, {
      include: {
        member: true,
        training: {
          include: { planVariant: { include: { planType: true } } },
        },
      },
    });
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  }

  async getPaymentsByTraining(trainingId) {
    return await trainingPaymentRepository.findByTraining(trainingId);
  }

  async getPaymentsByMember(memberId, page = 1, limit = 10) {
    const result = await trainingPaymentRepository.findByMember(
      memberId,
      page,
      limit,
    );
    return {
      payments: result.data,
      pagination: result.pagination,
    };
  }

  async getAllPayments(orgId, page = 1, limit = 10, filters = {}) {
    const result = await trainingPaymentRepository.findByOrganization(
      orgId,
      page,
      limit,
      filters,
    );
    return {
      payments: result.data,
      pagination: result.pagination,
    };
  }

  async updatePaymentStatus(paymentId, status) {
    const payment = await trainingPaymentRepository.get(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    const updateData = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    return await trainingPaymentRepository.update(paymentId, updateData);
  }

  async getPaymentStats(orgId) {
    return await trainingPaymentRepository.getPaymentStats(orgId);
  }
}

module.exports = new TrainingPaymentService();
