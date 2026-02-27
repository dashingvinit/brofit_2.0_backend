const planTypeRepository = require("../repositories/plan-type.repository");

class PlanTypeService {
  async _getPlanTypeOrThrow(planTypeId, errorMessage = "Plan type not found") {
    const planType = await planTypeRepository.get(planTypeId);
    if (!planType) {
      throw new Error(errorMessage);
    }
    return planType;
  }

  async createPlanType(planTypeData) {
    if (!planTypeData.orgId) {
      throw new Error("Organization ID is required");
    }

    // Check if plan type with same name already exists in this org
    const existingPlanType = await planTypeRepository.findByNameAndOrg(
      planTypeData.name,
      planTypeData.orgId,
    );
    if (existingPlanType) {
      throw new Error(
        "Plan type with this name already exists in this organization",
      );
    }

    return await planTypeRepository.create({
      orgId: planTypeData.orgId,
      name: planTypeData.name,
      description: planTypeData.description || null,
      isActive: planTypeData.isActive ?? true,
    });
  }

  async getPlanTypeById(planTypeId, includeVariants = true) {
    if (includeVariants) {
      const planType =
        await planTypeRepository.findByIdWithVariants(planTypeId);
      if (!planType) {
        throw new Error("Plan type not found");
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

    // Check for name uniqueness if name is being updated
    if (updateData.name && updateData.name !== planType.name) {
      const existingPlanType = await planTypeRepository.findByNameAndOrg(
        updateData.name,
        planType.orgId,
      );
      if (existingPlanType && existingPlanType.id !== planTypeId) {
        throw new Error(
          "Plan type with this name already exists in this organization",
        );
      }
    }

    const dbData = {};
    if (updateData.name !== undefined) dbData.name = updateData.name;
    if (updateData.description !== undefined)
      dbData.description = updateData.description;
    if (updateData.category !== undefined) {
      // make sure the provided category is valid; default enum in Prisma
      // already enforces it but a quick sanity check here doesn't hurt.
      if (!["membership", "training"].includes(updateData.category)) {
        throw new Error("Invalid plan category");
      }
      dbData.category = updateData.category;
    }
    if (updateData.isActive !== undefined)
      dbData.isActive = updateData.isActive;

    return await planTypeRepository.update(planTypeId, dbData);
  }

  async deletePlanType(planTypeId) {
    await this._getPlanTypeOrThrow(planTypeId);
    await planTypeRepository.destroy(planTypeId);
    return { message: "Plan type deleted successfully" };
  }

  async deactivatePlanType(planTypeId) {
    await this._getPlanTypeOrThrow(planTypeId);
    return await planTypeRepository.update(planTypeId, { isActive: false });
  }
}

module.exports = new PlanTypeService();
