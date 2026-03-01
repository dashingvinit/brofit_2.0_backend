const planVariantRepository = require("../repositories/plan-variant.repository");
const planTypeRepository = require("../repositories/plan-type.repository");

class PlanVariantService {
  async _getVariantOrThrow(variantId, errorMessage = "Plan variant not found") {
    const variant = await planVariantRepository.get(variantId);
    if (!variant) {
      throw new Error(errorMessage);
    }
    return variant;
  }

  async _getPlanTypeOrThrow(planTypeId, errorMessage = "Plan type not found") {
    const planType = await planTypeRepository.get(planTypeId);
    if (!planType) {
      throw new Error(errorMessage);
    }
    return planType;
  }

  async createVariant(variantData) {
    if (!variantData.planTypeId) {
      throw new Error("Plan type ID is required");
    }

    // Verify plan type exists
    await this._getPlanTypeOrThrow(variantData.planTypeId);

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
        throw new Error("Plan variant not found");
      }
      return variant;
    }
    return await this._getVariantOrThrow(variantId);
  }

  async getVariantsByPlanType(planTypeId, includeInactive = false) {
    // Verify plan type exists
    await this._getPlanTypeOrThrow(planTypeId);
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
