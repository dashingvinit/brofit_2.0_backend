const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const reportsService = require("../services/reports.service");

class ReportsController {
  expireSubscriptions = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const result = await reportsService.expireSubscriptions(orgId);

      res.status(200).json({
        success: true,
        message: "Subscriptions expired and members deactivated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getInactiveCandidates = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reportsService.getInactiveCandidates(
        orgId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        data: result.members,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getDuesReport = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};
      if (req.query.memberId) filters.memberId = req.query.memberId;

      const result = await reportsService.getDuesReport(
        orgId,
        page,
        limit,
        filters,
      );

      res.status(200).json({
        success: true,
        data: result.data,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getActivityTrend = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const days = Math.min(parseInt(req.query.days) || 30, 365);
      const data = await reportsService.getActivityTrend(orgId, days);

      res.status(200).json({ success: true, data, days });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ReportsController();
