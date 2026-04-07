const attendanceService = require("../services/attendance.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class AttendanceController {
  /**
   * POST /api/v1/attendance/check-in
   * Body: { memberId, notes? }
   */
  checkIn = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { memberId, notes } = req.body;
      if (!memberId) {
        return res.status(400).json({ success: false, message: "memberId is required" });
      }

      const record = await attendanceService.checkIn(orgId, memberId, notes);

      res.status(201).json({
        success: true,
        message: "Check-in recorded",
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/attendance/:id/check-out
   */
  checkOut = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      const record = await attendanceService.checkOut(orgId, id);

      res.status(200).json({
        success: true,
        message: "Check-out recorded",
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/attendance/inside
   * Members currently inside the gym.
   */
  getCurrentlyInside = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const result = await attendanceService.getCurrentlyInside(orgId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/attendance/stats
   * Quick count stats for today.
   */
  getTodayStats = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const stats = await attendanceService.getTodayStats(orgId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/attendance?date=YYYY-MM-DD
   * All records for a given date (today if omitted).
   */
  getByDate = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { date } = req.query;
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: "date must be YYYY-MM-DD" });
      }

      const result = await attendanceService.getByDate(orgId, date);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/attendance/peak-hours
   * Returns today's hourly counts + historical avg per hour.
   */
  getPeakHoursData = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = await attendanceService.getPeakHoursData(orgId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/attendance/member/:memberId?page=1&limit=20
   * Attendance history for a specific member.
   */
  getMemberHistory = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { memberId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await attendanceService.getMemberHistory(orgId, memberId, page, limit);

      res.status(200).json({
        success: true,
        data: result.records,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AttendanceController();
