const paymentRepository = require("../repositories/payment.repository");
const membershipRepository = require("../repositories/membership.repository");
const {
  validateMemberExists,
  validatePaymentAmount,
} = require("../../../../../shared/helpers/subscription.helper");

class PaymentService {
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

    if (data.membershipId) {
      const membership = await membershipRepository.findByIdWithDetails(
        data.membershipId,
      );
      if (!membership) {
        throw new Error("Membership not found");
      }

      const paidAmount = await paymentRepository.getPaidAmountForMembership(
        data.membershipId,
      );
      validatePaymentAmount(data.amount, membership.finalPrice, paidAmount, "Membership");
    }

    const payment = await paymentRepository.create({
      orgId: data.orgId,
      memberId: data.memberId,
      membershipId: data.membershipId || null,
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
    const payment = await paymentRepository.get(paymentId, {
      include: {
        member: true,
        membership: {
          include: { planVariant: { include: { planType: true } } },
        },
      },
    });
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  }

  async getPaymentsByMembership(membershipId) {
    return await paymentRepository.findByMembership(membershipId);
  }

  async getPaymentsByMember(memberId, page = 1, limit = 10) {
    const result = await paymentRepository.findByMember(
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
    const result = await paymentRepository.findByOrganization(
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
    const payment = await paymentRepository.get(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    const updateData = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    return await paymentRepository.update(paymentId, updateData);
  }

  async getPaymentStats(orgId) {
    return await paymentRepository.getPaymentStats(orgId);
  }
}

module.exports = new PaymentService();
