const express = require("express");
const analyticsController = require("./controllers/analytics.controller");

const router = express.Router();

router.get("/top-plans", analyticsController.getTopPlans);
router.get("/retention", analyticsController.getRetention);
router.get("/revenue-breakdown", analyticsController.getRevenueBreakdown);
router.get("/payment-methods", analyticsController.getPaymentMethods);
router.get("/trainer-performance", analyticsController.getTrainerPerformance);
router.get("/member-growth", analyticsController.getMemberGrowth);
router.get("/demographics", analyticsController.getDemographics);

module.exports = router;
