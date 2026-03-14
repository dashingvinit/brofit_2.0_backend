const express = require("express");
const trainerController = require("./controllers/trainer.controller");
const trainerPayoutController = require("./controllers/trainer-payout.controller");

const router = express.Router();

/**
 * Trainer Routes
 * Base path: /api/v1/trainers
 */

router.get("/", trainerController.getAllTrainers);
router.post("/", trainerController.createTrainer);

// Payout summary for all trainers in org (must be before /:id)
router.get("/payout-summary", trainerPayoutController.getOutstandingSummary);

router.get("/:id/clients", trainerController.getTrainerClients);
router.get("/:id/payout-schedule", trainerPayoutController.getPayoutSchedule);
router.get("/:id/payout-history", trainerPayoutController.getPayoutHistory);
router.post("/:id/payouts", trainerPayoutController.recordPayout);

router.get("/:id", trainerController.getTrainerById);
router.patch("/:id", trainerController.updateTrainer);
router.put("/:id/deactivate", trainerController.deactivateTrainer);

module.exports = router;
