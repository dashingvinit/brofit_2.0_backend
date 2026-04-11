const offerRepository = require("../repositories/offer.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

const VALID_TYPES = ["event", "referral", "discount", "promo"];
const VALID_DISCOUNT_TYPES = ["flat", "percentage"];
const VALID_APPLIES_TO = ["membership", "training", "both"];
const VALID_GENDERS = ["Male", "Female"];

class OfferService {
  async getAllOffers(orgId, filters = {}, page = 1, limit = 20) {
    const result = await offerRepository.findByOrganization(orgId, filters, page, limit);
    return { offers: result.data, pagination: result.pagination };
  }

  async getOfferById(id) {
    return await offerRepository.findByIdOrThrow(id);
  }

  async getOfferStats(id, orgId) {
    await offerRepository.findByIdOrThrow(id);
    return await offerRepository.getOfferStats(id, orgId);
  }

  async _validatePackageConfig(data) {
    // Validate targetGender
    if (data.targetGender && !VALID_GENDERS.includes(data.targetGender)) {
      throw createError("Target gender must be Male or Female", 400);
    }

    // Validate linked plan variants exist and are active
    if (data.membershipPlanVariantId) {
      const variant = await prisma.planVariant.findUnique({
        where: { id: data.membershipPlanVariantId },
        include: { planType: true },
      });
      if (!variant) throw createError("Linked membership plan variant not found", 404);
      if (!variant.isActive) throw createError("Linked membership plan variant is inactive", 400);
      if (variant.planType.category !== "membership") {
        throw createError("Linked membership variant must belong to a membership plan type", 400);
      }
    }

    if (data.trainingPlanVariantId) {
      const variant = await prisma.planVariant.findUnique({
        where: { id: data.trainingPlanVariantId },
        include: { planType: true },
      });
      if (!variant) throw createError("Linked training plan variant not found", 404);
      if (!variant.isActive) throw createError("Linked training plan variant is inactive", 400);
      if (variant.planType.category !== "training") {
        throw createError("Linked training variant must belong to a training plan type", 400);
      }
    }

    // Validate targetPrice
    if (data.targetPrice != null) {
      if (data.targetPrice <= 0) throw createError("Target price must be greater than 0", 400);
    }

    // Validate trainer payout fields
    if (data.trainerSplitPercent != null && (data.trainerSplitPercent < 0 || data.trainerSplitPercent > 100)) {
      throw createError("Trainer split percent must be between 0 and 100", 400);
    }
    if (data.trainerFixedPayout != null && data.trainerFixedPayout < 0) {
      throw createError("Trainer fixed payout cannot be negative", 400);
    }
  }

  async createOffer(data) {
    if (!VALID_TYPES.includes(data.type)) {
      throw createError(`Valid offer type is required (${VALID_TYPES.join(", ")})`, 400);
    }

    if (!data.title || !data.title.trim()) {
      throw createError("Offer title is required", 400);
    }

    if (["discount", "promo"].includes(data.type)) {
      // targetPrice-based offers don't need discountValue
      const hasTargetPrice = data.targetPrice != null;
      if (!hasTargetPrice) {
        if (data.discountValue === undefined || data.discountValue === null) {
          throw createError("Discount value or target price is required for discount and promo offers", 400);
        }
        if (!VALID_DISCOUNT_TYPES.includes(data.discountType)) {
          throw createError("Valid discount type (flat or percentage) is required", 400);
        }
        if (data.discountType === "percentage" && (data.discountValue <= 0 || data.discountValue > 100)) {
          throw createError("Percentage discount must be between 1 and 100", 400);
        }
        if (data.discountType === "flat" && data.discountValue <= 0) {
          throw createError("Flat discount must be greater than 0", 400);
        }
      }
    }

    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      throw createError("End date must be after start date", 400);
    }

    // Validate package config fields
    await this._validatePackageConfig(data);

    const appliesTo = data.appliesTo && VALID_APPLIES_TO.includes(data.appliesTo)
      ? data.appliesTo
      : "membership";

    return await offerRepository.create({
      orgId: data.orgId,
      type: data.type,
      title: data.title.trim(),
      description: data.description || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isActive: data.isActive ?? true,
      discountType: data.discountType || null,
      discountValue: data.discountValue ?? null,
      code: data.code || null,
      rewardAmount: data.rewardAmount ?? null,
      appliesTo,
      // Package configuration fields
      targetGender: data.targetGender || null,
      membershipPlanVariantId: data.membershipPlanVariantId || null,
      trainingPlanVariantId: data.trainingPlanVariantId || null,
      targetPrice: data.targetPrice != null ? parseFloat(data.targetPrice) : null,
      trainerFixedPayout: data.trainerFixedPayout != null ? parseFloat(data.trainerFixedPayout) : null,
      trainerSplitPercent: data.trainerSplitPercent != null ? parseFloat(data.trainerSplitPercent) : null,
    });
  }

  async updateOffer(id, updateData) {
    await offerRepository.findByIdOrThrow(id);

    if (updateData.startDate && updateData.endDate && new Date(updateData.endDate) <= new Date(updateData.startDate)) {
      throw createError("End date must be after start date", 400);
    }

    // Validate package config if any package fields are being updated
    await this._validatePackageConfig(updateData);

    const dbData = { ...updateData };
    if (updateData.title !== undefined) dbData.title = updateData.title.trim();
    if (updateData.startDate !== undefined) dbData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
    if (updateData.endDate !== undefined) dbData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    if (updateData.appliesTo !== undefined && !VALID_APPLIES_TO.includes(updateData.appliesTo)) {
      delete dbData.appliesTo;
    }

    // Handle nullable package fields (allow clearing)
    if (updateData.targetGender !== undefined) dbData.targetGender = updateData.targetGender || null;
    if (updateData.membershipPlanVariantId !== undefined)
      dbData.membershipPlanVariantId = updateData.membershipPlanVariantId || null;
    if (updateData.trainingPlanVariantId !== undefined)
      dbData.trainingPlanVariantId = updateData.trainingPlanVariantId || null;
    if (updateData.targetPrice !== undefined)
      dbData.targetPrice = updateData.targetPrice != null ? parseFloat(updateData.targetPrice) : null;
    if (updateData.trainerFixedPayout !== undefined)
      dbData.trainerFixedPayout = updateData.trainerFixedPayout != null ? parseFloat(updateData.trainerFixedPayout) : null;
    if (updateData.trainerSplitPercent !== undefined)
      dbData.trainerSplitPercent = updateData.trainerSplitPercent != null ? parseFloat(updateData.trainerSplitPercent) : null;

    return await offerRepository.update(id, dbData);
  }

  async deleteOffer(id) {
    await offerRepository.findByIdOrThrow(id);

    const [membershipCount, trainingCount] = await Promise.all([
      prisma.membership.count({ where: { offerId: id } }),
      prisma.training.count({ where: { offerId: id } }),
    ]);

    if (membershipCount > 0 || trainingCount > 0) {
      // Soft delete if linked to existing records
      await offerRepository.update(id, { isActive: false });
      return { deactivated: true };
    }

    await offerRepository.hardDelete(id);
    return { deactivated: false };
  }
}

module.exports = new OfferService();
