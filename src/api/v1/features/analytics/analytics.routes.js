const express = require("express");
const analyticsController = require("./controllers/analytics.controller");

const router = express.Router();

router.get("/top-plans", analyticsController.getTopPlans);
router.get("/retention", analyticsController.getRetention);
router.get("/revenue-breakdown", analyticsController.getRevenueBreakdown);
router.get("/payment-methods", analyticsController.getPaymentMethods);
router.get("/trainer-performance", analyticsController.getTrainerPerformance);
router.get("/member-growth", analyticsController.getMemberGrowth);
router.get("/membership-duration-preference", analyticsController.getMembershipDurationPreference);
router.get("/discounts", analyticsController.getDiscounts);
router.get("/demographics", analyticsController.getDemographics);
router.get("/unit-economics", analyticsController.getUnitEconomics);
router.get("/projection", analyticsController.getProjection);

module.exports = router;
