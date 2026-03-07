const planTypeService = require("../services/plan-type.service");
const planVariantService = require("../services/plan-variant.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class PlanController {
  // ============================================
  // PLAN TYPE ENDPOINTS
  // ============================================

  /**
   * Create a new plan type
   * POST /api/v1/plans/types
   */
  createPlanType = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const planTypeData = {
        orgId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        isActive: req.body.isActive,
      };

      const planType = await planTypeService.createPlanType(planTypeData);

      res.status(201).json({
        success: true,
        message: "Plan type created successfully",
        data: planType,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all plan types including inactive (admin only)
   * GET /api/v1/plans/types/all
   */
  getAllPlanTypes = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const includeInactive = req.query.includeInactive !== "false";
      const planTypes = await planTypeService.getAllPlanTypes(
        orgId,
        includeInactive,
      );

      res.status(200).json({
        success: true,
        data: planTypes,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get active plan types
   * GET /api/v1/plans/types
   */
  getActivePlanTypes = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { category } = req.query;
      const planTypes = await planTypeService.getActivePlanTypes(
        orgId,
        category || null,
      );

      res.status(200).json({
        success: true,
        data: planTypes,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get plan type by ID
   * GET /api/v1/plans/types/:id
   */
  getPlanTypeById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const planType = await planTypeService.getPlanTypeById(id);

      res.status(200).json({
        success: true,
        data: planType,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update plan type
   * PATCH /api/v1/plans/types/:id
   */
  updatePlanType = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined)
        updateData.description = req.body.description;
      if (req.body.category !== undefined)
        updateData.category = req.body.category;
      if (req.body.isActive !== undefined)
        updateData.isActive = req.body.isActive;

      const planType = await planTypeService.updatePlanType(id, updateData);

      res.status(200).json({
        success: true,
        message: "Plan type updated successfully",
        data: planType,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete plan type
   * DELETE /api/v1/plans/types/:id
   */
  deletePlanType = async (req, res, next) => {
    try {
      const { id } = req.params;
      await planTypeService.deletePlanType(id);

      res.status(200).json({
        success: true,
        message: "Plan type deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deactivate plan type
   * PUT /api/v1/plans/types/:id/deactivate
   */
  deactivatePlanType = async (req, res, next) => {
    try {
      const { id } = req.params;
      const planType = await planTypeService.deactivatePlanType(id);

      res.status(200).json({
        success: true,
        message: "Plan type deactivated successfully",
        data: planType,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // PLAN VARIANT ENDPOINTS
  // ============================================

  /**
   * Create a new variant for a plan type
   * POST /api/v1/plans/types/:planTypeId/variants
   */
  createVariant = async (req, res, next) => {
    try {
      const { planTypeId } = req.params;

      const variantData = {
        planTypeId,
        durationDays: req.body.durationDays,
        durationLabel: req.body.durationLabel,
        price: req.body.price,
        isActive: req.body.isActive,
      };

      const variant = await planVariantService.createVariant(variantData);

      res.status(201).json({
        success: true,
        message: "Plan variant created successfully",
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all variants for a plan type
   * GET /api/v1/plans/types/:planTypeId/variants
   */
  getVariantsByPlanType = async (req, res, next) => {
    try {
      const { planTypeId } = req.params;
      const includeInactive = req.query.includeInactive !== "false";

      const variants = await planVariantService.getVariantsByPlanType(
        planTypeId,
        includeInactive,
      );

      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get variant by ID
   * GET /api/v1/plans/variants/:id
   */
  getVariantById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const variant = await planVariantService.getVariantById(id);

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update variant
   * PATCH /api/v1/plans/variants/:id
   */
  updateVariant = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.durationDays !== undefined)
        updateData.durationDays = req.body.durationDays;
      if (req.body.durationLabel !== undefined)
        updateData.durationLabel = req.body.durationLabel;
      if (req.body.price !== undefined) updateData.price = req.body.price;
      if (req.body.isActive !== undefined)
        updateData.isActive = req.body.isActive;

      const variant = await planVariantService.updateVariant(id, updateData);

      res.status(200).json({
        success: true,
        message: "Plan variant updated successfully",
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete variant
   * DELETE /api/v1/plans/variants/:id
   */
  deleteVariant = async (req, res, next) => {
    try {
      const { id } = req.params;
      await planVariantService.deleteVariant(id);

      res.status(200).json({
        success: true,
        message: "Plan variant deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deactivate variant
   * PUT /api/v1/plans/variants/:id/deactivate
   */
  deactivateVariant = async (req, res, next) => {
    try {
      const { id } = req.params;
      const variant = await planVariantService.deactivateVariant(id);

      res.status(200).json({
        success: true,
        message: "Plan variant deactivated successfully",
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk import plan types + variants from CSV rows.
   * POST /api/v1/plans/import
   * Body: { rows: Array<Record<string, string>> }
   *
   * Expected CSV columns:
   *   Plan Name, Category (membership|training), Description,
   *   Duration Label, Duration Days, Price, Plan Active, Variant Active
   *
   * Rows sharing the same Plan Name are grouped: the first occurrence creates
   * the plan type (if it doesn't already exist) and every row adds a variant.
   */
  importPlans = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const rows = req.body.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body must contain a non-empty 'rows' array",
        });
      }

      const errors = [];
      let importedTypes = 0;
      let importedVariants = 0;
      // Cache created/found plan type IDs by name to avoid duplicate creates
      const planTypeCache = {};

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const planName = (row["Plan Name"] || row["planName"] || "").trim();
        const rawCategory = (
          row["Category"] ||
          row["category"] ||
          ""
        )
          .trim()
          .toLowerCase();
        const description =
          (row["Description"] || row["description"] || "").trim() || null;
        const durationLabel = (
          row["Duration Label"] ||
          row["durationLabel"] ||
          ""
        ).trim();
        const durationDays = parseInt(
          row["Duration Days"] || row["durationDays"] || "0",
          10,
        );
        const price = parseFloat(row["Price"] || row["price"] || "0");
        const planActive =
          (row["Plan Active"] || row["planActive"] || "true").toLowerCase() !==
          "false";
        const variantActive =
          (
            row["Variant Active"] ||
            row["variantActive"] ||
            "true"
          ).toLowerCase() !== "false";

        if (!planName) {
          errors.push(`Row ${rowNum}: Plan Name is required`);
          continue;
        }

        if (!["membership", "training"].includes(rawCategory)) {
          errors.push(
            `Row ${rowNum} (${planName}): Category must be 'membership' or 'training'`,
          );
          continue;
        }

        if (!durationLabel) {
          errors.push(
            `Row ${rowNum} (${planName}): Duration Label is required`,
          );
          continue;
        }

        if (isNaN(durationDays) || durationDays <= 0) {
          errors.push(
            `Row ${rowNum} (${planName}): Duration Days must be a positive number`,
          );
          continue;
        }

        if (isNaN(price) || price < 0) {
          errors.push(
            `Row ${rowNum} (${planName}): Price must be a non-negative number`,
          );
          continue;
        }

        try {
          // Get or create the plan type
          let planTypeId = planTypeCache[planName];
          if (!planTypeId) {
            const existing = await planTypeService.getAllPlanTypes(orgId, true);
            const found = existing.find(
              (pt) => pt.name.toLowerCase() === planName.toLowerCase(),
            );
            if (found) {
              planTypeId = found.id;
            } else {
              const created = await planTypeService.createPlanType({
                orgId,
                name: planName,
                description,
                category: rawCategory,
                isActive: planActive,
              });
              planTypeId = created.id;
              importedTypes++;
            }
            planTypeCache[planName] = planTypeId;
          }

          // Create the variant
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

      res.status(200).json({
        success: true,
        message: `${importedTypes} plan type(s) and ${importedVariants} variant(s) imported`,
        importedTypes,
        importedVariants,
        errors,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PlanController();
