const { prisma } = require("../../config/prisma.config");

/**
 * Validates that a member exists. Throws if not found.
 */
async function validateMemberExists(memberId) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) {
    throw new Error("Member not found");
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
    throw new Error("Plan variant not found");
  }
  if (!planVariant.isActive) {
    throw new Error("Plan variant is not active");
  }
  if (expectedCategory && planVariant.planType.category !== expectedCategory) {
    throw new Error(
      `Plan variant does not belong to a ${expectedCategory} plan`,
    );
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
    throw new Error("Discount amount cannot exceed the plan price");
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
        throw new Error(`${entityName} is already cancelled`);
      }
      break;
    case "freeze":
      if (currentStatus !== "active") {
        throw new Error(`Only active ${entityName.toLowerCase()}s can be frozen`);
      }
      break;
    case "unfreeze":
      if (currentStatus !== "frozen") {
        throw new Error(
          `Only frozen ${entityName.toLowerCase()}s can be unfrozen`,
        );
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
    throw new Error(`This ${entityName.toLowerCase()} is already fully paid`);
  }
  if (amount > dueAmount && dueAmount > 0) {
    throw new Error(
      `Payment amount (${amount}) exceeds due amount (${dueAmount})`,
    );
  }
}

module.exports = {
  validateMemberExists,
  validatePlanVariant,
  calculateDates,
  calculatePricing,
  validateStatusTransition,
  calculateDues,
  validatePaymentAmount,
};
