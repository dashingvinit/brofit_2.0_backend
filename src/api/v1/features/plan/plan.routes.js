const express = require("express");
const planController = require("./controllers/plan.controller");
const { requireAuth, checkRole } = require("../member/member.middlewares");

const router = express.Router();

/**
 * Plan Routes
 * Base path: /api/v1/plans
 * Manages both membership and training plan catalogs
 */

// All routes require authentication
router.use(requireAuth());

// ============================================
// MEMBERSHIP PLAN ROUTES
// ============================================

// Get active membership plans (available to all authenticated users)
router.get("/memberships", planController.getActiveMembershipPlans);

// Get all membership plans including inactive (admin only)
router.get(
  "/memberships/all",
  checkRole(["admin"]),
  planController.getAllMembershipPlans
);

// Get membership plan by ID
router.get("/memberships/:id", planController.getMembershipPlanById);

// Create membership plan (admin only)
router.post(
  "/memberships",
  checkRole(["admin"]),
  planController.createMembershipPlan
);

// Update membership plan (admin only)
router.patch(
  "/memberships/:id",
  checkRole(["admin"]),
  planController.updateMembershipPlan
);

// Deactivate membership plan (admin only)
router.delete(
  "/memberships/:id",
  checkRole(["admin"]),
  planController.deactivateMembershipPlan
);

// ============================================
// TRAINING PLAN ROUTES
// ============================================

// Get active training plans (available to all authenticated users)
// Optional query param: ?category=weight-training
router.get("/trainings", planController.getActiveTrainingPlans);

// Get all training plans including inactive (admin only)
router.get(
  "/trainings/all",
  checkRole(["admin"]),
  planController.getAllTrainingPlans
);

// Get training plan by ID
router.get("/trainings/:id", planController.getTrainingPlanById);

// Create training plan (admin only)
router.post(
  "/trainings",
  checkRole(["admin"]),
  planController.createTrainingPlan
);

// Update training plan (admin only)
router.patch(
  "/trainings/:id",
  checkRole(["admin"]),
  planController.updateTrainingPlan
);

// Deactivate training plan (admin only)
router.delete(
  "/trainings/:id",
  checkRole(["admin"]),
  planController.deactivateTrainingPlan
);

module.exports = router;
