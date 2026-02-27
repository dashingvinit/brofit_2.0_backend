const membershipRepository = require("../repositories/membership.repository");
const paymentRepository = require("../repositories/payment.repository");
const { prisma } = require("../../../../../config/prisma.config");
const {
  validateMemberExists,
  validatePlanVariant,
  calculateDates,
  calculatePricing,
  validateStatusTransition,
  calculateDues,
} = require("../../../../../shared/helpers/subscription.helper");

class MembershipService {
  async _getMembershipOrThrow(
    membershipId,
    errorMessage = "Membership not found",
  ) {
    const membership =
      await membershipRepository.findByIdWithDetails(membershipId);
    if (!membership) {
      throw new Error(errorMessage);
    }
    return membership;
  }

  async createMembership(data) {
    if (!data.orgId) {
      throw new Error("Organization ID is required");
    }
    if (!data.memberId) {
      throw new Error("Member ID is required");
    }
    if (!data.planVariantId) {
      throw new Error("Plan variant ID is required");
    }

    await validateMemberExists(data.memberId);
    const planVariant = await validatePlanVariant(data.planVariantId, "membership");

    const { startDate, endDate } = calculateDates(
      data.startDate,
      planVariant.durationDays,
    );
    const { priceAtPurchase, discountAmount, finalPrice } = calculatePricing(
      planVariant.price,
      data.discountAmount,
    );

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          orgId: data.orgId,
          memberId: data.memberId,
          planVariantId: data.planVariantId,
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
            membershipId: membership.id,
            amount: data.paymentAmount,
            method: data.paymentMethod || "cash",
            status: "paid",
            reference: data.paymentReference || null,
            notes: data.paymentNotes || null,
            paidAt: new Date(),
          },
        });
      }

      return { membership, payment };
    });

    return await membershipRepository.findByIdWithDetails(
      result.membership.id,
    );
  }

  async getMembershipById(membershipId) {
    return await this._getMembershipOrThrow(membershipId);
  }

  async getAllMemberships(orgId, page = 1, limit = 10, filters = {}) {
    const result = await membershipRepository.findByOrganization(
      orgId,
      page,
      limit,
      filters,
    );

    return {
      memberships: result.data,
      pagination: result.pagination,
    };
  }

  async getMemberMemberships(memberId) {
    return await membershipRepository.findByMember(memberId);
  }

  async getActiveMembership(memberId, orgId) {
    return await membershipRepository.findActiveMembership(memberId, orgId);
  }

  async getMembershipDues(membershipId) {
    const membership = await this._getMembershipOrThrow(membershipId);
    const paidAmount =
      await paymentRepository.getPaidAmountForMembership(membershipId);

    return calculateDues(membership, paidAmount, "membershipId");
  }

  async updateMembership(membershipId, updateData) {
    await this._getMembershipOrThrow(membershipId);

    const dbData = {};
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.autoRenew !== undefined)
      dbData.autoRenew = updateData.autoRenew;
    if (updateData.notes !== undefined) dbData.notes = updateData.notes;
    if (updateData.endDate !== undefined)
      dbData.endDate = new Date(updateData.endDate);

    await membershipRepository.update(membershipId, dbData);
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async cancelMembership(membershipId) {
    const membership = await this._getMembershipOrThrow(membershipId);
    validateStatusTransition(membership.status, "cancel", "Membership");

    await membershipRepository.update(membershipId, { status: "cancelled" });
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async freezeMembership(membershipId) {
    const membership = await this._getMembershipOrThrow(membershipId);
    validateStatusTransition(membership.status, "freeze", "Membership");

    await membershipRepository.update(membershipId, { status: "frozen" });
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async unfreezeMembership(membershipId) {
    const membership = await this._getMembershipOrThrow(membershipId);
    validateStatusTransition(membership.status, "unfreeze", "Membership");

    await membershipRepository.update(membershipId, { status: "active" });
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async getExpiringMemberships(orgId, daysAhead = 7) {
    return await membershipRepository.findExpiringMemberships(
      orgId,
      daysAhead,
    );
  }

  async getMembershipStats(orgId) {
    const [membershipStats, paymentStats] = await Promise.all([
      membershipRepository.getMembershipStats(orgId),
      paymentRepository.getPaymentStats(orgId),
    ]);

    return { ...membershipStats, ...paymentStats };
  }
}

module.exports = new MembershipService();
