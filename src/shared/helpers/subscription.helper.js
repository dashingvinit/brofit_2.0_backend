const { prisma } = require("../../config/prisma.config");

function createError(message, status = 400) {
  const err = new Error(message);
  err.statusCode = status;
  return err;
}

/**
 * Validates that a member exists. Throws if not found.
 */
async function validateMemberExists(memberId) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) {
    throw createError("Member not found", 404);
  }
  return member;
}

/**
 * Validates that a plan variant exists, is active, and optionally
 * belongs to a specific category. Returns the variant with planType included.
 */
async function validatePlanVariant(planVariantId, expectedCategory = null) {
  const planVariant = await prisma.planVariant.findUnique({
    where: { id: planVariantId },
    include: { planType: true },
  });
  if (!planVariant) {
    throw createError("Plan variant not found", 404);
  }
  if (!planVariant.isActive) {
    throw createError("Plan variant is not active", 400);
  }
  if (expectedCategory && planVariant.planType.category !== expectedCategory) {
    throw createError(`Plan variant does not belong to a ${expectedCategory} plan`, 400);
  }
  return planVariant;
}

/**
 * Calculates start and end dates from a plan variant's durationDays.
 */
function calculateDates(startDateInput, durationDays) {
  const startDate = startDateInput ? new Date(startDateInput) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return { startDate, endDate };
}

/**
 * Calculates pricing from plan price and discount.
 * Throws if discount exceeds price.
 */
function calculatePricing(planPrice, discountAmount = 0) {
  const priceAtPurchase = planPrice;
  const finalPrice = priceAtPurchase - discountAmount;

  if (finalPrice < 0) {
    throw createError("Discount amount cannot exceed the plan price", 400);
  }

  return { priceAtPurchase, discountAmount, finalPrice };
}

/**
 * Validates a status transition for cancel/freeze/unfreeze.
 * Throws with a descriptive error if the transition is invalid.
 */
function validateStatusTransition(currentStatus, action, entityName) {
  switch (action) {
    case "cancel":
      if (currentStatus === "cancelled") {
        throw createError(`${entityName} is already cancelled`, 409);
      }
      break;
    case "freeze":
      if (currentStatus !== "active") {
        throw createError(`Only active ${entityName.toLowerCase()}s can be frozen`, 409);
      }
      break;
    case "unfreeze":
      if (currentStatus !== "frozen") {
        throw createError(`Only frozen ${entityName.toLowerCase()}s can be unfrozen`, 409);
      }
      break;
  }
}

/**
 * Calculates dues for a subscription (membership or training).
 */
function calculateDues(entity, paidAmount, idField) {
  const dueAmount = entity.finalPrice - paidAmount;

  return {
    [idField]: entity.id,
    finalPrice: entity.finalPrice,
    totalPaid: paidAmount,
    dueAmount: Math.max(0, dueAmount),
    isFullyPaid: dueAmount <= 0,
    payments: entity.payments,
  };
}

/**
 * Validates a payment amount against the remaining dues.
 * Throws if overpaying or already fully paid.
 */
function validatePaymentAmount(amount, finalPrice, paidAmount, entityName) {
  const dueAmount = finalPrice - paidAmount;

  if (dueAmount <= 0) {
    throw createError(`This ${entityName.toLowerCase()} is already fully paid`, 409);
  }
  if (amount > dueAmount && dueAmount > 0) {
    throw createError(`Payment amount (${amount}) exceeds due amount (${dueAmount})`, 400);
  }
}

/**
 * Runs an async operation on each item in an array concurrently.
 * Returns { succeeded, failed, total } counts.
 * Partial failures are swallowed — callers get a summary, not an exception.
 */
async function executeBatch(items, fn) {
  const results = await Promise.allSettled(items.map(fn));
  return {
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    total: items.length,
  };
}

/**
 * Resolves the discount amount from an offer.
 * Only applies to offers of type 'discount' or 'promo'.
 * Returns the computed discount value, or null if no offer / wrong type.
 */
async function resolveOfferDiscount(offerId, orgId, planVariantPrice) {
  if (!offerId) return null;
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, orgId, isActive: true },
  });
  if (!offer) throw createError("Offer not found or inactive", 400);
  if (!["discount", "promo"].includes(offer.type)) return null;

  // For combo offers (appliesTo: 'both'), the frontend already split the discount
  // proportionally across membership and training. The full offer value would exceed
  // a single item's price, so return null and let the service use data.discountAmount.
  if (offer.appliesTo === "both") return null;

  if (offer.discountType === "percentage") {
    return (planVariantPrice * offer.discountValue) / 100;
  }
  return offer.discountValue;
}

/**
 * Enhanced offer resolution for "smart package" offers.
 * Validates gender, plan variants, computes discounts from targetPrice,
 * and returns trainer payout overrides.
 *
 * Falls back to legacy resolveOfferDiscount behaviour for offers
 * that don't use the new package fields.
 *
 * @returns {{ membershipDiscount: number, trainingDiscount: number,
 *             trainerFixedPayout: number|null, trainerSplitPercent: number|null } | null}
 */
async function resolveOfferConfig(offerId, orgId, memberId, membershipVariantId, trainingVariantId) {
  if (!offerId) return null;

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, orgId, isActive: true },
    include: {
      membershipPlanVariant: true,
      trainingPlanVariant: true,
    },
  });
  if (!offer) throw createError("Offer not found or inactive", 400);
  if (!["discount", "promo"].includes(offer.type)) return null;

  // 1. Gender validation
  if (offer.targetGender) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { gender: true },
    });
    if (!member) throw createError("Member not found", 404);
    if (member.gender !== offer.targetGender) {
      throw createError(`This offer is only available for ${offer.targetGender} members`, 400);
    }
  }

  // 2. Plan variant validation
  if (offer.membershipPlanVariantId && membershipVariantId) {
    if (offer.membershipPlanVariantId !== membershipVariantId) {
      throw createError("Selected membership plan does not match this offer's required plan", 400);
    }
  }
  if (offer.trainingPlanVariantId && trainingVariantId) {
    if (offer.trainingPlanVariantId !== trainingVariantId) {
      throw createError("Selected training plan does not match this offer's required plan", 400);
    }
  }

  // 3. Compute discounts
  let membershipDiscount = 0;
  let trainingDiscount = 0;

  const mPrice = offer.membershipPlanVariant?.price ?? 0;
  const tPrice = offer.trainingPlanVariant?.price ?? 0;

  if (offer.targetPrice != null) {
    // Target-price based: discount = total variant prices - target price
    const totalVariantPrice = (membershipVariantId ? mPrice : 0) + (trainingVariantId ? tPrice : 0);
    const totalDiscount = Math.max(0, totalVariantPrice - offer.targetPrice);

    if (membershipVariantId && trainingVariantId && totalVariantPrice > 0) {
      // Split proportionally
      membershipDiscount = Math.round((totalDiscount * mPrice) / totalVariantPrice);
      trainingDiscount = totalDiscount - membershipDiscount;
    } else if (membershipVariantId) {
      membershipDiscount = totalDiscount;
    } else {
      trainingDiscount = totalDiscount;
    }
  } else if (offer.discountValue != null) {
    // Legacy discountType/discountValue flow
    // For "both" offers, the frontend sends pre-split discountAmount — return null to use those
    if (offer.appliesTo === "both") return null;

    const computeDiscount = (base) =>
      offer.discountType === "percentage"
        ? Math.round((base * offer.discountValue) / 100)
        : offer.discountValue;

    if (offer.appliesTo === "training" || (!membershipVariantId && trainingVariantId)) {
      trainingDiscount = computeDiscount(tPrice || 0);
    } else {
      membershipDiscount = computeDiscount(mPrice || 0);
    }
  }

  return {
    membershipDiscount,
    trainingDiscount,
    trainerFixedPayout: offer.trainerFixedPayout ?? null,
    trainerSplitPercent: offer.trainerSplitPercent ?? null,
  };
}

/**
 * Returns a new Date set to midnight (00:00:00.000) UTC of the given date.
 * Pass no argument to get the start of today UTC.
 */
function startOfDay(date) {
  const d = date ? new Date(date) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Returns the start of the current month in UTC.
 */
function getStartOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Canonical definition of "active member":
 * isActive=true AND has at least one active membership or training.
 * Used by both analytics and reports features to stay in sync.
 */
async function countActiveMembers(orgId) {
  return prisma.member.count({
    where: {
      orgId,
      isActive: true,
      OR: [
        { memberships: { some: { status: "active" } } },
        { trainings: { some: { status: "active" } } },
      ],
    },
  });
}

module.exports = {
  createError,
  validateMemberExists,
  validatePlanVariant,
  calculateDates,
  calculatePricing,
  validateStatusTransition,
  calculateDues,
  validatePaymentAmount,
  executeBatch,
  resolveOfferDiscount,
  resolveOfferConfig,
  startOfDay,
  getStartOfCurrentMonth,
  countActiveMembers,
};
