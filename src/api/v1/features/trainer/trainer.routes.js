const express = require("express");
const trainerController = require("./controllers/trainer.controller");

const router = express.Router();

/**
 * Trainer Routes
 * Base path: /api/v1/trainers
 */

router.get("/", trainerController.getAllTrainers);
router.post("/", trainerController.createTrainer);
router.get("/:id", trainerController.getTrainerById);
router.patch("/:id", trainerController.updateTrainer);
router.put("/:id/deactivate", trainerController.deactivateTrainer);

module.exports = router;
