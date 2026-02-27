const express = require("express");
const membershipController = require("./controllers/membership.controller");

const router = express.Router();

/**
 * Membership Routes
 * Base path: /api/v1/memberships
 */

// Static routes first (before /:id to avoid conflicts)
router.get("/stats", membershipController.getMembershipStats);
router.get("/expiring", membershipController.getExpiringMemberships);

// Member-specific membership routes (before /:id)
router.get("/member/:memberId", membershipController.getMemberMemberships);
router.get(
  "/member/:memberId/active",
  membershipController.getActiveMembership,
);

// Payment routes (before /:id since /payments is a static segment)
router.get("/payments/all", membershipController.getAllPayments);
router.get(
  "/payments/member/:memberId",
  membershipController.getPaymentsByMember,
);
router.get("/payments/:id", membershipController.getPaymentById);
router.post("/payments", membershipController.recordPayment);
router.patch("/payments/:id/status", membershipController.updatePaymentStatus);

// Get all memberships in organization
router.get("/", membershipController.getAllMemberships);

// Create new membership
router.post("/", membershipController.createMembership);

// Dynamic :id routes last
router.get("/:id", membershipController.getMembershipById);
router.get("/:id/dues", membershipController.getMembershipDues);
router.get("/:id/payments", membershipController.getPaymentsByMembership);
router.patch("/:id", membershipController.updateMembership);
router.put("/:id/cancel", membershipController.cancelMembership);
router.put("/:id/freeze", membershipController.freezeMembership);
router.put("/:id/unfreeze", membershipController.unfreezeMembership);

module.exports = router;
