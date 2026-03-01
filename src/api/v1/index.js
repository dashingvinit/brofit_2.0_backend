const express = require("express");
const memberRoutes = require("./features/member/member.routes");
const planRoutes = require("./features/plan/plan.routes");
const membershipRoutes = require("./features/membership/membership.routes");
const trainingRoutes = require("./features/training/training.routes");
const trainerRoutes = require("./features/trainer/trainer.routes");
const reportRoutes = require("./features/reports/reports.routes");

const router = express.Router();

// Health check for API v1
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API v1 is running",
    timestamp: new Date().toISOString(),
  });
});

// Feature routes
router.use("/members", memberRoutes);
router.use("/plans", planRoutes);
router.use("/memberships", membershipRoutes);
router.use("/trainings", trainingRoutes);
router.use("/trainers", trainerRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
