const membershipRepository = require("../repositories/membership.repository");
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
} = require("../../../../../shared/helpers/subscription.helper");

async function resolveOfferDiscount(offerId, orgId, planVariantPrice) {
  if (!offerId) return null;
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, orgId, isActive: true },
  });
  if (!offer) throw createError("Offer not found or inactive", 400);
  if (!["discount", "promo"].includes(offer.type)) return null;
  if (offer.discountType === "percentage") {
    return (planVariantPrice * offer.discountValue) / 100;
  }
  return offer.discountValue;
}

class MembershipService {
  async _getMembershipOrThrow(membershipId) {
    const membership = await membershipRepository.findByIdWithDetails(membershipId);
    if (!membership) {
      throw createError("Membership not found", 404);
    }
    return membership;
  }

  async createMembership(data) {
    await validateMemberExists(data.memberId);
    const planVariant = await validatePlanVariant(data.planVariantId, "membership");

    const { startDate, endDate } = calculateDates(
      data.startDate,
      planVariant.durationDays,
    );

    const offerDiscount = await resolveOfferDiscount(data.offerId, data.orgId, planVariant.price);
    const effectiveDiscount = offerDiscount !== null ? offerDiscount : (data.discountAmount || 0);

    const { priceAtPurchase, discountAmount, finalPrice } = calculatePricing(
      planVariant.price,
      effectiveDiscount,
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
          offerId: data.offerId || null,
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
            paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
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
      await paymentRepository.getPaidAmountForSubscription(membershipId, "membershipId");

    return calculateDues(membership, paidAmount, "membershipId");
  }

  async updateMembership(membershipId, updateData) {
    const membership = await this._getMembershipOrThrow(membershipId);

    const dbData = {};
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.autoRenew !== undefined)
      dbData.autoRenew = updateData.autoRenew;
    if (updateData.notes !== undefined) dbData.notes = updateData.notes;
    if (updateData.startDate !== undefined)
      dbData.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined)
      dbData.endDate = new Date(updateData.endDate);
    if (updateData.discountAmount !== undefined) {
      const { discountAmount, finalPrice } = calculatePricing(
        membership.priceAtPurchase,
        updateData.discountAmount,
      );
      dbData.discountAmount = discountAmount;
      dbData.finalPrice = finalPrice;
    }

    await membershipRepository.update(membershipId, dbData);
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async cancelMembership(membershipId) {
    const membership = await this._getMembershipOrThrow(membershipId);
    validateStatusTransition(membership.status, "cancel", "Membership");

    await membershipRepository.update(membershipId, { status: "cancelled" });
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async freezeMembership(membershipId, { reason, freezeStartDate, freezeEndDate } = {}) {
    const membership = await this._getMembershipOrThrow(membershipId);
    validateStatusTransition(membership.status, "freeze", "Membership");

    await membershipRepository.update(membershipId, {
      status: "frozen",
      freezeReason: reason || null,
      freezeStartDate: freezeStartDate ? new Date(freezeStartDate) : new Date(),
      freezeEndDate: freezeEndDate ? new Date(freezeEndDate) : null,
    });
    return await membershipRepository.findByIdWithDetails(membershipId);
  }

  async unfreezeMembership(membershipId) {
    const membership = await this._getMembershipOrThrow(membershipId);
    validateStatusTransition(membership.status, "unfreeze", "Membership");

    await membershipRepository.update(membershipId, {
      status: "active",
      freezeReason: null,
      freezeStartDate: null,
      freezeEndDate: null,
    });
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
      paymentRepository.getPaymentStats(orgId, { membershipOnly: true }),
    ]);

    return { ...membershipStats, ...paymentStats };
  }
}

module.exports = new MembershipService();
