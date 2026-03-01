const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const analyticsService = require("../services/analytics.service");

class AnalyticsController {
  constructor() {
    this.getSummary = this.getSummary.bind(this);
    this.getRoi = this.getRoi.bind(this);
    this.getTrends = this.getTrends.bind(this);
  }

  // GET /financials/summary?month=YYYY-MM
  async getSummary(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { month } = req.query;
      const data = await analyticsService.getMonthlySummary(orgId, month);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // GET /financials/roi
  async getRoi(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = await analyticsService.getRoi(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // GET /financials/trends?months=12
  async getTrends(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const months = Math.min(parseInt(req.query.months) || 12, 24);
      const data = await analyticsService.getTrends(orgId, months);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
