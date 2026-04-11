const paymentRepository = require("../repositories/payment.repository");
const {
  createError,
  validateMemberExists,
  validatePaymentAmount,
} = require("../helpers/subscription.helper");

class PaymentService {
  /**
   * Record a payment for a membership or training.
   * Pass { subscriptionRepo, subscriptionIdField, subscriptionLabel } in opts
   * to handle training payments through the same code path.
   */
  async recordPayment(data, {
    subscriptionRepo = null,
    subscriptionIdField = "membershipId",
    subscriptionLabel = "Membership",
  } = {}) {
    if (!data.amount || data.amount <= 0) {
      throw createError("Payment amount must be greater than 0", 400);
    }

    await validateMemberExists(data.memberId);

    const subscriptionId = data[subscriptionIdField];
    if (subscriptionId && subscriptionRepo) {
      const subscription = await subscriptionRepo.findByIdWithDetails(subscriptionId);
      if (!subscription) {
        throw createError(`${subscriptionLabel} not found`, 404);
      }

      const paidAmount = await paymentRepository.getPaidAmountForSubscription(
        subscriptionId,
        subscriptionIdField,
      );
      validatePaymentAmount(data.amount, subscription.finalPrice, paidAmount, subscriptionLabel);
    }

    const resolvedStatus = data.status || "paid";
    const payment = await paymentRepository.create({
      orgId: data.orgId,
      memberId: data.memberId,
      [subscriptionIdField]: subscriptionId || null,
      amount: data.amount,
      method: data.method || "cash",
      status: resolvedStatus,
      reference: data.reference || null,
      notes: data.notes || null,
      paidAt: resolvedStatus === "paid" ? (data.paidAt ? new Date(data.paidAt) : new Date()) : null,
    });

    return payment;
  }

  async getPaymentById(paymentId, { trainingOnly = false } = {}) {
    const MEMBER_SELECT = { select: { id: true, firstName: true, lastName: true, phone: true, email: true } };
    const PLAN_VARIANT_SELECT = {
      select: {
        id: true, price: true, durationLabel: true,
        planType: { select: { id: true, name: true, category: true } },
      },
    };
    const include = trainingOnly
      ? {
          member: MEMBER_SELECT,
          training: { select: { id: true, planVariant: PLAN_VARIANT_SELECT } },
        }
      : {
          member: MEMBER_SELECT,
          membership: { select: { id: true, planVariant: PLAN_VARIANT_SELECT } },
        };

    const payment = await paymentRepository.get(paymentId, { include });
    if (!payment) {
      throw createError("Payment not found", 404);
    }
    return payment;
  }

  async getPaymentsBySubscription(subscriptionId, field = "membershipId") {
    return await paymentRepository.findBySubscription(subscriptionId, field);
  }

  async getPaymentsByMember(memberId, page = 1, limit = 10, { trainingOnly = false } = {}) {
    const result = await paymentRepository.findByMember(memberId, page, limit, { trainingOnly });
    return {
      payments: result.data,
      pagination: result.pagination,
    };
  }

  async getAllPayments(orgId, page = 1, limit = 10, filters = {}, { trainingOnly = false } = {}) {
    const result = await paymentRepository.findByOrganization(orgId, page, limit, filters, { trainingOnly });
    return {
      payments: result.data,
      pagination: result.pagination,
    };
  }

  async deletePayment(paymentId) {
    const payment = await paymentRepository.get(paymentId);
    if (!payment) {
      throw createError("Payment not found", 404);
    }

    await paymentRepository.hardDelete(paymentId);
    return { message: "Payment deleted successfully" };
  }

  async updatePaymentStatus(paymentId, status) {
    const payment = await paymentRepository.get(paymentId);
    if (!payment) {
      throw createError("Payment not found", 404);
    }

    const updateData = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    return await paymentRepository.update(paymentId, updateData);
  }

  async getPaymentStats(orgId, { trainingOnly = false } = {}) {
    return await paymentRepository.getPaymentStats(orgId, { trainingOnly });
  }
}

module.exports = new PaymentService();
