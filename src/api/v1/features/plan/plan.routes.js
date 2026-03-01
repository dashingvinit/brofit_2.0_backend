const express = require("express");
const planController = require("./controllers/plan.controller");
const { requireAuth } = require("../member/member.middlewares");

const router = express.Router();

// All routes require authentication
router.use(requireAuth());

// ============================================
// PLAN TYPE ROUTES
// ============================================

router.get("/types", planController.getActivePlanTypes);
router.get("/types/all", planController.getAllPlanTypes);
router.get("/types/:id", planController.getPlanTypeById);
router.post("/types", planController.createPlanType);
router.patch("/types/:id", planController.updatePlanType);
router.delete("/types/:id", planController.deletePlanType);
router.put("/types/:id/deactivate", planController.deactivatePlanType);

// ============================================
// PLAN VARIANT ROUTES
// ============================================

router.get("/types/:planTypeId/variants", planController.getVariantsByPlanType);
router.post("/types/:planTypeId/variants", planController.createVariant);
router.get("/variants/:id", planController.getVariantById);
router.patch("/variants/:id", planController.updateVariant);
router.delete("/variants/:id", planController.deleteVariant);
router.put("/variants/:id/deactivate", planController.deactivateVariant);

module.exports = router;
