const planVariantRepository = require("../repositories/plan-variant.repository");
const planTypeService = require("./plan-type.service");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

class PlanVariantService {
  async _getVariantOrThrow(variantId) {
    const variant = await planVariantRepository.get(variantId);
    if (!variant) {
      throw createError("Plan variant not found", 404);
    }
    return variant;
  }

  async createVariant(variantData) {
    if (!variantData.planTypeId) {
      throw createError("Plan type ID is required", 400);
    }

    await planTypeService.getPlanTypeById(variantData.planTypeId, false);

    const data = {
      planTypeId: variantData.planTypeId,
      durationDays: variantData.durationDays,
      durationLabel: variantData.durationLabel,
      price: variantData.price,
      isActive: variantData.isActive ?? true,
    };

    if (variantData.defaultTrainerSplitPercent != null) {
      data.defaultTrainerSplitPercent = variantData.defaultTrainerSplitPercent;
    }
    if (variantData.defaultTrainerFixedPayout != null) {
      data.defaultTrainerFixedPayout = variantData.defaultTrainerFixedPayout;
    }

    return await planVariantRepository.create(data);
  }

  async getVariantById(variantId, includePlanType = true) {
    if (includePlanType) {
      const variant = await planVariantRepository.findByIdWithPlanType(variantId);
      if (!variant) {
        throw createError("Plan variant not found", 404);
      }
      return variant;
    }
    return await this._getVariantOrThrow(variantId);
  }

  async getVariantsByPlanType(planTypeId, includeInactive = false) {
    await planTypeService.getPlanTypeById(planTypeId, false);
    return await planVariantRepository.findByPlanType(planTypeId, includeInactive);
  }

  async updateVariant(variantId, updateData) {
    await this._getVariantOrThrow(variantId);

    const dbData = {};
    if (updateData.durationDays !== undefined) dbData.durationDays = updateData.durationDays;
    if (updateData.durationLabel !== undefined) dbData.durationLabel = updateData.durationLabel;
    if (updateData.price !== undefined) dbData.price = updateData.price;
    if (updateData.isActive !== undefined) dbData.isActive = updateData.isActive;
    if (updateData.defaultTrainerSplitPercent !== undefined)
      dbData.defaultTrainerSplitPercent = updateData.defaultTrainerSplitPercent;
    if (updateData.defaultTrainerFixedPayout !== undefined)
      dbData.defaultTrainerFixedPayout = updateData.defaultTrainerFixedPayout;

    return await planVariantRepository.update(variantId, dbData);
  }

  async deleteVariant(variantId) {
    await this._getVariantOrThrow(variantId);

    const { prisma } = require("../../../../../config/prisma.config");
    const [membershipCount, trainingCount] = await Promise.all([
      prisma.membership.count({ where: { planVariantId: variantId } }),
      prisma.training.count({ where: { planVariantId: variantId } }),
    ]);

    if (membershipCount > 0 || trainingCount > 0) {
      throw createError(
        "Cannot delete a plan variant that has existing subscriptions. Deactivate it instead.",
        409,
      );
    }

    await planVariantRepository.destroy(variantId);
    return { message: "Plan variant deleted successfully" };
  }

  async deactivateVariant(variantId) {
    await this._getVariantOrThrow(variantId);
    return await planVariantRepository.update(variantId, { isActive: false });
  }
}

module.exports = new PlanVariantService();
