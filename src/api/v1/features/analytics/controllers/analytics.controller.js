const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const analyticsService = require("../services/analytics.service");
const { runProjection } = require("../../../../../shared/services/projection.service");
const { prisma } = require("../../../../../config/prisma.config");
const cache = require("../../../../../shared/helpers/cache.helper");

class AnalyticsController {
  // GET /analytics/top-plans?months=6
  getTopPlans = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const months = Math.min(parseInt(req.query.months) || 6, 24);
      const data = await analyticsService.getTopPlans(orgId, months);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/retention
  getRetention = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await analyticsService.getRetention(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/revenue-breakdown?months=6
  getRevenueBreakdown = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const months = Math.min(parseInt(req.query.months) || 6, 24);
      const data = await analyticsService.getRevenueBreakdown(orgId, months);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/payment-methods
  getPaymentMethods = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await analyticsService.getPaymentMethods(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/trainer-performance
  getTrainerPerformance = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await analyticsService.getTrainerPerformance(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/member-growth?months=12
  getMemberGrowth = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const months = Math.min(parseInt(req.query.months) || 12, 24);
      const data = await analyticsService.getMemberGrowth(orgId, months);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/membership-duration-preference
  getMembershipDurationPreference = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await analyticsService.getMembershipDurationPreference(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/demographics
  getDemographics = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await analyticsService.getDemographics(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/unit-economics?window=3
  getUnitEconomics = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const window = Math.min(parseInt(req.query.window) || 3, 36);
      const data = await analyticsService.getUnitEconomics(orgId, window);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /analytics/projection?window=3&horizon=12&fixedCost=20000
  getProjection = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const window = Math.min(parseInt(req.query.window) || 3, 36);
      const horizon = Math.min(parseInt(req.query.horizon) || 12, 36);
      const fixedCostPerMonth = parseFloat(req.query.fixedCost) || 0;

      const cacheKey = `projection:${orgId}:${window}:${horizon}:${fixedCostPerMonth}`;
      const data = await cache.get(cacheKey, cache.TTL.ONE_HOUR, async () => {
        const [ue, capexResult] = await Promise.all([
          analyticsService.getUnitEconomics(orgId, window),
          prisma.investment.aggregate({ where: { orgId }, _sum: { amount: true } }),
        ]);
        return runProjection({
          ...ue,
          fixedCostPerMonth,
          capex: capexResult._sum.amount || 0,
          horizonMonths: horizon,
          window,
        });
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AnalyticsController();
