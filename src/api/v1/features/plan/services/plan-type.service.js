const planTypeRepository = require("../repositories/plan-type.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

class PlanTypeService {
  async _getPlanTypeOrThrow(planTypeId) {
    const planType = await planTypeRepository.get(planTypeId);
    if (!planType) {
      throw createError("Plan type not found", 404);
    }
    return planType;
  }

  async createPlanType(planTypeData) {
    if (!["membership", "training"].includes(planTypeData.category)) {
      throw createError("Valid plan category (membership or training) is required", 400);
    }

    const existingPlanType = await planTypeRepository.findByNameAndOrg(
      planTypeData.name,
      planTypeData.orgId,
    );
    if (existingPlanType) {
      throw createError("Plan type with this name already exists in this organization", 409);
    }

    return await planTypeRepository.create({
      orgId: planTypeData.orgId,
      name: planTypeData.name,
      description: planTypeData.description || null,
      category: planTypeData.category,
      isActive: planTypeData.isActive ?? true,
    });
  }

  async getPlanTypeById(planTypeId, includeVariants = true) {
    if (includeVariants) {
      const planType = await planTypeRepository.findByIdWithVariants(planTypeId);
      if (!planType) {
        throw createError("Plan type not found", 404);
      }
      return planType;
    }
    return await this._getPlanTypeOrThrow(planTypeId);
  }

  async getAllPlanTypes(organizationId, includeInactive = false) {
    return await planTypeRepository.findByOrganization(
      organizationId,
      includeInactive,
    );
  }

  async getActivePlanTypes(organizationId, category = null) {
    return await planTypeRepository.findActiveByOrganization(
      organizationId,
      category,
    );
  }

  async updatePlanType(planTypeId, updateData) {
    const planType = await this._getPlanTypeOrThrow(planTypeId);

    if (updateData.name && updateData.name !== planType.name) {
      const existingPlanType = await planTypeRepository.findByNameAndOrg(
        updateData.name,
        planType.orgId,
      );
      if (existingPlanType && existingPlanType.id !== planTypeId) {
        throw createError("Plan type with this name already exists in this organization", 409);
      }
    }

    const dbData = {};
    if (updateData.name !== undefined) dbData.name = updateData.name;
    if (updateData.description !== undefined) dbData.description = updateData.description;
    if (updateData.category !== undefined) dbData.category = updateData.category;
    if (updateData.isActive !== undefined) dbData.isActive = updateData.isActive;

    return await planTypeRepository.update(planTypeId, dbData);
  }

  async deletePlanType(planTypeId) {
    await this._getPlanTypeOrThrow(planTypeId);

    const [membershipCount, trainingCount] = await Promise.all([
      prisma.membership.count({ where: { planVariant: { planTypeId } } }),
      prisma.training.count({ where: { planVariant: { planTypeId } } }),
    ]);

    if (membershipCount > 0 || trainingCount > 0) {
      throw createError("Cannot delete a plan type that has existing subscriptions. Deactivate it instead.", 409);
    }

    await planTypeRepository.destroy(planTypeId);
    return { message: "Plan type deleted successfully" };
  }

  async deactivatePlanType(planTypeId) {
    await this._getPlanTypeOrThrow(planTypeId);
    return await planTypeRepository.update(planTypeId, { isActive: false });
  }
}

module.exports = new PlanTypeService();
