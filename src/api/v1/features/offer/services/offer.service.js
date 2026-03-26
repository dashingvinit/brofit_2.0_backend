const offerRepository = require("../repositories/offer.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

const VALID_TYPES = ["event", "referral", "discount", "promo"];
const VALID_DISCOUNT_TYPES = ["flat", "percentage"];

class OfferService {
  async getAllOffers(orgId, filters = {}) {
    return await offerRepository.findByOrganization(orgId, filters);
  }

  async getOfferById(id) {
    return await offerRepository.findByIdOrThrow(id);
  }

  async createOffer(data) {
    if (!VALID_TYPES.includes(data.type)) {
      throw createError(`Valid offer type is required (${VALID_TYPES.join(", ")})`, 400);
    }

    if (!data.title || !data.title.trim()) {
      throw createError("Offer title is required", 400);
    }

    if (["discount", "promo"].includes(data.type)) {
      if (data.discountValue === undefined || data.discountValue === null) {
        throw createError("Discount value is required for discount and promo offers", 400);
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

    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      throw createError("End date must be after start date", 400);
    }

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
    });
  }

  async updateOffer(id, updateData) {
    await offerRepository.findByIdOrThrow(id);

    if (updateData.startDate && updateData.endDate && new Date(updateData.endDate) <= new Date(updateData.startDate)) {
      throw createError("End date must be after start date", 400);
    }

    const dbData = { ...updateData };
    if (updateData.title !== undefined) dbData.title = updateData.title.trim();
    if (updateData.startDate !== undefined) dbData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
    if (updateData.endDate !== undefined) dbData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;

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
