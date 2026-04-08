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

  async getPlanTypeById(planTypeId, includeVariants = true, orgId = null) {
    let planType;
    if (includeVariants) {
      planType = await planTypeRepository.findByIdWithVariants(planTypeId);
      if (!planType) {
        throw createError("Plan type not found", 404);
      }
    } else {
      planType = await this._getPlanTypeOrThrow(planTypeId);
    }
    if (orgId && planType.orgId !== orgId) {
      throw createError("Plan type not found", 404);
    }
    return planType;
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

  /**
   * Bulk-import plan types + variants from parsed CSV rows.
   * Fetches existing plan types once before the loop to avoid N+1 queries.
   * Returns { importedTypes, importedVariants, errors }.
   */
  async importPlans(orgId, rows) {
    const planVariantService = require("./plan-variant.service");

    const errors = [];
    let importedTypes = 0;
    let importedVariants = 0;

    // Fetch existing plan types once — O(1) DB call for the whole import
    const existing = await planTypeRepository.findByOrganization(orgId, true);
    const planTypeIdByName = new Map(
      existing.map((pt) => [pt.name.toLowerCase(), pt.id]),
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const planName = (row["Plan Name"] || row["planName"] || "").trim();
      const rawCategory = (row["Category"] || row["category"] || "").trim().toLowerCase();
      const description = (row["Description"] || row["description"] || "").trim() || null;
      const durationLabel = (row["Duration Label"] || row["durationLabel"] || "").trim();
      const durationDays = parseInt(row["Duration Days"] || row["durationDays"] || "0", 10);
      const price = parseFloat(row["Price"] || row["price"] || "0");
      const planActive = (row["Plan Active"] || row["planActive"] || "true").toLowerCase() !== "false";
      const variantActive = (row["Variant Active"] || row["variantActive"] || "true").toLowerCase() !== "false";

      if (!planName) {
        errors.push(`Row ${rowNum}: Plan Name is required`);
        continue;
      }
      if (!["membership", "training"].includes(rawCategory)) {
        errors.push(`Row ${rowNum} (${planName}): Category must be 'membership' or 'training'`);
        continue;
      }
      if (!durationLabel) {
        errors.push(`Row ${rowNum} (${planName}): Duration Label is required`);
        continue;
      }
      if (isNaN(durationDays) || durationDays <= 0) {
        errors.push(`Row ${rowNum} (${planName}): Duration Days must be a positive number`);
        continue;
      }
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNum} (${planName}): Price must be a non-negative number`);
        continue;
      }

      try {
        let planTypeId = planTypeIdByName.get(planName.toLowerCase());
        if (!planTypeId) {
          const created = await this.createPlanType({
            orgId,
            name: planName,
            description,
            category: rawCategory,
            isActive: planActive,
          });
          planTypeId = created.id;
          planTypeIdByName.set(planName.toLowerCase(), planTypeId);
          importedTypes++;
        }

        await planVariantService.createVariant({
          planTypeId,
          durationDays,
          durationLabel,
          price,
          isActive: variantActive,
        });
        importedVariants++;
      } catch (err) {
        errors.push(`Row ${rowNum} (${planName}): ${err.message}`);
      }
    }

    return { importedTypes, importedVariants, errors };
  }
}

module.exports = new PlanTypeService();
