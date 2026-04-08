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

    return await planVariantRepository.create({
      planTypeId: variantData.planTypeId,
      durationDays: variantData.durationDays,
      durationLabel: variantData.durationLabel,
      price: variantData.price,
      isActive: variantData.isActive ?? true,
    });
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

    return await planVariantRepository.update(variantId, dbData);
  }

  async deleteVariant(variantId) {
    await this._getVariantOrThrow(variantId);
    await planVariantRepository.destroy(variantId);
    return { message: "Plan variant deleted successfully" };
  }

  async deactivateVariant(variantId) {
    await this._getVariantOrThrow(variantId);
    return await planVariantRepository.update(variantId, { isActive: false });
  }
}

module.exports = new PlanVariantService();
