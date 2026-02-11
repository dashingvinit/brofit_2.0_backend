const membershipPlanService = require("../services/membership-plan.service");

/**
 * Membership Plan Controller
 * Handles HTTP requests for membership plans
 */
class MembershipPlanController {
  /**
   * Create new membership plan
   * POST /api/v1/memberships/plans
   */
  async createPlan(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;

      const planData = {
        organizationId,
        name: req.body.name,
        description: req.body.description,
        durationDays: req.body.durationDays,
        price: req.body.price,
        features: req.body.features,
        isActive: req.body.isActive,
      };

      const plan = await membershipPlanService.createPlan(planData);

      res.status(201).json({
        success: true,
        message: "Membership plan created successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all active plans
   * GET /api/v1/memberships/plans
   */
  async getActivePlans(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;

      const plans = await membershipPlanService.getActivePlans(organizationId);

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all plans (including inactive) - Admin only
   * GET /api/v1/memberships/plans/all
   */
  async getAllPlans(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;

      const plans = await membershipPlanService.getAllPlans(organizationId);

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      console.error("Error fetching all plans:", error);
      next(error);
    }
  }

  /**
   * Get plan by ID
   * GET /api/v1/memberships/plans/:id
   */
  async getPlanById(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await membershipPlanService.getPlanById(id);

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update plan
   * PATCH /api/v1/memberships/plans/:id
   */
  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;

      const updateData = {
        name: req.body.name,
        description: req.body.description,
        durationDays: req.body.durationDays,
        price: req.body.price,
        features: req.body.features,
        isActive: req.body.isActive,
      };

      const plan = await membershipPlanService.updatePlan(id, updateData);

      res.status(200).json({
        success: true,
        message: "Plan updated successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate plan
   * DELETE /api/v1/memberships/plans/:id
   */
  async deactivatePlan(req, res, next) {
    try {
      const { id } = req.params;
      await membershipPlanService.deactivatePlan(id);

      res.status(200).json({
        success: true,
        message: "Plan deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plan statistics
   * GET /api/v1/memberships/plans/stats
   */
  async getPlanStats(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;

      const stats = await membershipPlanService.getPlanStats(organizationId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MembershipPlanController();
