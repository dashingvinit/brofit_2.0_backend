const planTypeService = require("../services/plan-type.service");
const planVariantService = require("../services/plan-variant.service");
const { getAuth } = require("@clerk/express");

/**
 * Plan Controller
 * Handles HTTP requests for plan types and plan variants
 */
class PlanController {
  constructor() {
    // Plan Type methods
    this.createPlanType = this.createPlanType.bind(this);
    this.getAllPlanTypes = this.getAllPlanTypes.bind(this);
    this.getActivePlanTypes = this.getActivePlanTypes.bind(this);
    this.getPlanTypeById = this.getPlanTypeById.bind(this);
    this.updatePlanType = this.updatePlanType.bind(this);
    this.deletePlanType = this.deletePlanType.bind(this);
    this.deactivatePlanType = this.deactivatePlanType.bind(this);

    // Plan Variant methods
    this.createVariant = this.createVariant.bind(this);
    this.getVariantsByPlanType = this.getVariantsByPlanType.bind(this);
    this.getVariantById = this.getVariantById.bind(this);
    this.updateVariant = this.updateVariant.bind(this);
    this.deleteVariant = this.deleteVariant.bind(this);
    this.deactivateVariant = this.deactivateVariant.bind(this);
  }

  _getOrgId(req) {
    const auth = getAuth(req);
    return auth.orgId || auth.sessionClaims?.org_id;
  }

  // ============================================
  // PLAN TYPE ENDPOINTS
  // ============================================

  /**
   * Create a new plan type
   * POST /api/v1/plans/types
   */
  async createPlanType(req, res, next) {
    try {
      const orgId = this._getOrgId(req);

      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const planTypeData = {
        orgId,
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
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
  }

  /**
   * Get all plan types including inactive (admin only)
   * GET /api/v1/plans/types/all
   */
  async getAllPlanTypes(req, res, next) {
    try {
      const orgId = this._getOrgId(req);

      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const includeInactive = req.query.includeInactive !== "false";
      const planTypes = await planTypeService.getAllPlanTypes(orgId, includeInactive);

      res.status(200).json({
        success: true,
        data: planTypes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active plan types
   * GET /api/v1/plans/types
   */
  async getActivePlanTypes(req, res, next) {
    try {
      const orgId = this._getOrgId(req);

      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const planTypes = await planTypeService.getActivePlanTypes(orgId);

      res.status(200).json({
        success: true,
        data: planTypes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plan type by ID
   * GET /api/v1/plans/types/:id
   */
  async getPlanTypeById(req, res, next) {
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
  }

  /**
   * Update plan type
   * PATCH /api/v1/plans/types/:id
   */
  async updatePlanType(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const planType = await planTypeService.updatePlanType(id, updateData);

      res.status(200).json({
        success: true,
        message: "Plan type updated successfully",
        data: planType,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete plan type
   * DELETE /api/v1/plans/types/:id
   */
  async deletePlanType(req, res, next) {
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
  }

  /**
   * Deactivate plan type
   * PUT /api/v1/plans/types/:id/deactivate
   */
  async deactivatePlanType(req, res, next) {
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
  }

  // ============================================
  // PLAN VARIANT ENDPOINTS
  // ============================================

  /**
   * Create a new variant for a plan type
   * POST /api/v1/plans/types/:planTypeId/variants
   */
  async createVariant(req, res, next) {
    try {
      const { planTypeId } = req.params;

      const variantData = {
        planTypeId,
        durationDays: req.body.durationDays,
        durationLabel: req.body.durationLabel,
        price: req.body.price,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
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
  }

  /**
   * Get all variants for a plan type
   * GET /api/v1/plans/types/:planTypeId/variants
   */
  async getVariantsByPlanType(req, res, next) {
    try {
      const { planTypeId } = req.params;
      const includeInactive = req.query.includeInactive !== "false";

      const variants = await planVariantService.getVariantsByPlanType(
        planTypeId,
        includeInactive
      );

      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get variant by ID
   * GET /api/v1/plans/variants/:id
   */
  async getVariantById(req, res, next) {
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
  }

  /**
   * Update variant
   * PATCH /api/v1/plans/variants/:id
   */
  async updateVariant(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.durationDays !== undefined) updateData.durationDays = req.body.durationDays;
      if (req.body.durationLabel !== undefined) updateData.durationLabel = req.body.durationLabel;
      if (req.body.price !== undefined) updateData.price = req.body.price;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const variant = await planVariantService.updateVariant(id, updateData);

      res.status(200).json({
        success: true,
        message: "Plan variant updated successfully",
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete variant
   * DELETE /api/v1/plans/variants/:id
   */
  async deleteVariant(req, res, next) {
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
  }

  /**
   * Deactivate variant
   * PUT /api/v1/plans/variants/:id/deactivate
   */
  async deactivateVariant(req, res, next) {
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
  }
}

module.exports = new PlanController();
