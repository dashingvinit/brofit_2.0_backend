const trainerPayoutService = require("../services/trainer-payout.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class TrainerPayoutController {
  /**
   * GET /api/v1/trainers/:id/payout-schedule
   * Returns full per-client, per-month payout grid for a trainer.
   */
  getPayoutSchedule = async (req, res, next) => {
    try {
      const { id } = req.params;
      const schedule = await trainerPayoutService.getPayoutSchedule(id);

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/trainers/:id/payouts
   * Record a cash payout for a specific client-month.
   * Body: { trainingId, month, year, notes? }
   */
  recordPayout = async (req, res, next) => {
    try {
      const { id: trainerId } = req.params;
      const { trainingId, month, year, notes } = req.body;

      if (!trainingId || !month || !year) {
        return res.status(400).json({
          success: false,
          message: "trainingId, month, and year are required",
        });
      }

      const payout = await trainerPayoutService.recordPayout(
        trainerId,
        trainingId,
        Number(month),
        Number(year),
        notes,
      );

      res.status(201).json({
        success: true,
        message: "Payout recorded successfully",
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/trainers/:id/payout-history
   * Returns all recorded payouts for a trainer.
   */
  getPayoutHistory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const history = await trainerPayoutService.getPayoutHistory(id);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/trainers/payout-summary
   * Returns outstanding payout totals per trainer for the org.
   */
  getOutstandingSummary = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const summary = await trainerPayoutService.getOutstandingSummary(orgId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new TrainerPayoutController();
