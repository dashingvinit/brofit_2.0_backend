const express = require("express");
const trainingController = require("./controllers/training.controller");

const router = express.Router();

/**
 * Training Routes
 * Base path: /api/v1/trainings
 */

// Static routes first (before /:id to avoid conflicts)
router.get("/stats", trainingController.getTrainingStats);
router.get("/expiring", trainingController.getExpiringTrainings);

// Member-specific training routes (before /:id)
router.get("/member/:memberId", trainingController.getMemberTrainings);
router.get(
  "/member/:memberId/active",
  trainingController.getActiveTraining,
);

// Payment routes (before /:id since /payments is a static segment)
router.get("/payments/all", trainingController.getAllPayments);
router.get(
  "/payments/member/:memberId",
  trainingController.getPaymentsByMember,
);
router.get("/payments/:id", trainingController.getPaymentById);
router.post("/payments", trainingController.recordPayment);
router.patch("/payments/:id/status", trainingController.updatePaymentStatus);

// Get all trainings in organization
router.get("/", trainingController.getAllTrainings);

// Create new training
router.post("/", trainingController.createTraining);

// Dynamic :id routes last
router.get("/:id", trainingController.getTrainingById);
router.get("/:id/dues", trainingController.getTrainingDues);
router.get("/:id/payments", trainingController.getPaymentsByTraining);
router.patch("/:id", trainingController.updateTraining);
router.put("/:id/cancel", trainingController.cancelTraining);
router.put("/:id/freeze", trainingController.freezeTraining);
router.put("/:id/unfreeze", trainingController.unfreezeTraining);

module.exports = router;
