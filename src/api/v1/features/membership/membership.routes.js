const express = require("express");
const planController = require("./controllers/membership-plan.controller");
const membershipController = require("./controllers/user-membership.controller");
const { requireAuth } = require("../user/user.middlewares");
const { checkRole } = require("../user/user.middlewares");
const {
  validatePlanData,
  validateMembershipAssignment,
} = require("./membership.middlewares");

const router = express.Router();

/**
 * Membership Routes
 * Base path: /api/v1/memberships
 */

// All routes require authentication
router.use(requireAuth());

// ============================================
// MEMBERSHIP PLAN ROUTES (Admin only for CUD)
// ============================================

// Get active plans (available to all users)
router.get("/plans", planController.getActivePlans);

// Get all plans including inactive (admin only)
router.get("/plans/all", checkRole(["admin"]), planController.getAllPlans);

// Get plan statistics (admin only)
router.get("/plans/stats", checkRole(["admin"]), planController.getPlanStats);

// Get plan by ID
router.get("/plans/:id", planController.getPlanById);

// Create plan (admin only)
router.post(
  "/plans",
  checkRole(["admin"]),
  validatePlanData,
  planController.createPlan,
);

// Update plan (admin only)
router.patch(
  "/plans/:id",
  checkRole(["admin"]),
  validatePlanData,
  planController.updatePlan,
);

// Deactivate plan (admin only)
router.delete(
  "/plans/:id",
  checkRole(["admin"]),
  planController.deactivatePlan,
);

// ============================================
// USER MEMBERSHIP ROUTES
// ============================================

// Get all memberships in organization (admin/trainer)
router.get(
  "/",
  checkRole(["admin", "trainer"]),
  membershipController.getOrganizationMemberships,
);

// Get membership statistics (admin only)
router.get(
  "/stats",
  checkRole(["admin"]),
  membershipController.getMembershipStats,
);

// Get expiring memberships (admin/trainer)
router.get(
  "/expiring",
  checkRole(["admin", "trainer"]),
  membershipController.getExpiringSoon,
);

// Assign membership to user (admin only)
router.post(
  "/users/:userId",
  checkRole(["admin"]),
  validateMembershipAssignment,
  membershipController.assignMembership,
);

// Get user's membership history
router.get("/users/:userId", membershipController.getUserMemberships);

// Get user's active membership
router.get(
  "/users/:userId/active",
  membershipController.getUserActiveMembership,
);

// Renew membership
router.post(
  "/:id/renew",
  checkRole(["admin"]),
  membershipController.renewMembership,
);

// Cancel membership (admin only)
router.post(
  "/:id/cancel",
  checkRole(["admin"]),
  membershipController.cancelMembership,
);

// Suspend membership (admin only)
router.post(
  "/:id/suspend",
  checkRole(["admin"]),
  membershipController.suspendMembership,
);

// Reactivate membership (admin only)
router.post(
  "/:id/reactivate",
  checkRole(["admin"]),
  membershipController.reactivateMembership,
);

module.exports = router;
