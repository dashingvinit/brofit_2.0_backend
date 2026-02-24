const express = require("express");
const planController = require("./controllers/plan.controller");
const { requireAuth, checkRole } = require("../member/member.middlewares");

const router = express.Router();

/**
 * Plan Routes
 * Base path: /api/v1/plans
 * Manages plan types (categories like Cardio, Strength) and their variants (duration + price tiers)
 */

// All routes require authentication
router.use(requireAuth());

// ============================================
// PLAN TYPE ROUTES
// ============================================

// Get active plan types (available to all authenticated users)
router.get("/types", planController.getActivePlanTypes);

// Get all plan types including inactive (admin only)
router.get(
  "/types/all",
  checkRole(["admin"]),
  planController.getAllPlanTypes
);

// Get plan type by ID (with variants)
router.get("/types/:id", planController.getPlanTypeById);

// Create plan type (admin only)
router.post(
  "/types",
  checkRole(["admin"]),
  planController.createPlanType
);

// Update plan type (admin only)
router.patch(
  "/types/:id",
  checkRole(["admin"]),
  planController.updatePlanType
);

// Delete plan type (admin only)
router.delete(
  "/types/:id",
  checkRole(["admin"]),
  planController.deletePlanType
);

// Deactivate plan type (admin only)
router.put(
  "/types/:id/deactivate",
  checkRole(["admin"]),
  planController.deactivatePlanType
);

// ============================================
// PLAN VARIANT ROUTES
// ============================================

// Get variants for a specific plan type
router.get("/types/:planTypeId/variants", planController.getVariantsByPlanType);

// Create variant for a plan type (admin only)
router.post(
  "/types/:planTypeId/variants",
  checkRole(["admin"]),
  planController.createVariant
);

// Get variant by ID
router.get("/variants/:id", planController.getVariantById);

// Update variant (admin only)
router.patch(
  "/variants/:id",
  checkRole(["admin"]),
  planController.updateVariant
);

// Delete variant (admin only)
router.delete(
  "/variants/:id",
  checkRole(["admin"]),
  planController.deleteVariant
);

// Deactivate variant (admin only)
router.put(
  "/variants/:id/deactivate",
  checkRole(["admin"]),
  planController.deactivateVariant
);

module.exports = router;
