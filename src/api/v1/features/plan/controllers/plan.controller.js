const membershipPlanService = require("../services/membership-plan.service");
const trainingPlanService = require("../services/training-plan.service");

/**
 * Plan Controller
 * Handles HTTP requests for both membership and training plans
 */
class PlanController {
  // ============================================
  // MEMBERSHIP PLAN ENDPOINTS
  // ============================================

  /**
   * Get all active membership plans
   * GET /api/v1/plans/memberships
   */
  async getActiveMembershipPlans(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

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
   * Get all membership plans including inactive (admin only)
   * GET /api/v1/plans/memberships/all
   */
  async getAllMembershipPlans(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const plans = await membershipPlanService.getAllPlans(organizationId);

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get membership plan by ID
   * GET /api/v1/plans/memberships/:id
   */
  async getMembershipPlanById(req, res, next) {
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
   * Create membership plan (admin only)
   * POST /api/v1/plans/memberships
   */
  async createMembershipPlan(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const planData = {
        organizationId,
        name: req.body.name,
        description: req.body.description,
        durationDays: req.body.durationDays,
        price: req.body.price,
        features: req.body.features || [],
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
   * Update membership plan (admin only)
   * PATCH /api/v1/plans/memberships/:id
   */
  async updateMembershipPlan(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.durationDays !== undefined) updateData.durationDays = req.body.durationDays;
      if (req.body.price !== undefined) updateData.price = req.body.price;
      if (req.body.features !== undefined) updateData.features = req.body.features;

      const plan = await membershipPlanService.updatePlan(id, updateData);

      res.status(200).json({
        success: true,
        message: "Membership plan updated successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate membership plan (admin only)
   * DELETE /api/v1/plans/memberships/:id
   */
  async deactivateMembershipPlan(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await membershipPlanService.deactivatePlan(id);

      res.status(200).json({
        success: true,
        message: "Membership plan deactivated successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // TRAINING PLAN ENDPOINTS
  // ============================================

  /**
   * Get all active training plans
   * GET /api/v1/plans/trainings
   */
  async getActiveTrainingPlans(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const category = req.query.category;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const plans = await trainingPlanService.getActivePlans(organizationId, category);

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all training plans including inactive (admin only)
   * GET /api/v1/plans/trainings/all
   */
  async getAllTrainingPlans(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const plans = await trainingPlanService.getAllPlans(organizationId);

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get training plan by ID
   * GET /api/v1/plans/trainings/:id
   */
  async getTrainingPlanById(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await trainingPlanService.getPlanById(id);

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create training plan (admin only)
   * POST /api/v1/plans/trainings
   */
  async createTrainingPlan(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const planData = {
        organizationId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        durationDays: req.body.durationDays,
        sessionsPerWeek: req.body.sessionsPerWeek,
        price: req.body.price,
        features: req.body.features || [],
        requiresTrainer: req.body.requiresTrainer !== undefined ? req.body.requiresTrainer : true,
      };

      const plan = await trainingPlanService.createPlan(planData);

      res.status(201).json({
        success: true,
        message: "Training plan created successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update training plan (admin only)
   * PATCH /api/v1/plans/trainings/:id
   */
  async updateTrainingPlan(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.durationDays !== undefined) updateData.durationDays = req.body.durationDays;
      if (req.body.sessionsPerWeek !== undefined) updateData.sessionsPerWeek = req.body.sessionsPerWeek;
      if (req.body.price !== undefined) updateData.price = req.body.price;
      if (req.body.features !== undefined) updateData.features = req.body.features;
      if (req.body.requiresTrainer !== undefined) updateData.requiresTrainer = req.body.requiresTrainer;

      const plan = await trainingPlanService.updatePlan(id, updateData);

      res.status(200).json({
        success: true,
        message: "Training plan updated successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate training plan (admin only)
   * DELETE /api/v1/plans/trainings/:id
   */
  async deactivateTrainingPlan(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await trainingPlanService.deactivatePlan(id);

      res.status(200).json({
        success: true,
        message: "Training plan deactivated successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlanController();
