const trainingService = require("../services/training.service");
const paymentService = require("../../../../../shared/services/payment.service");
const trainingRepository = require("../repositories/training.repository");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class TrainingController {
  // ─── Training Endpoints ───────────────────────────────────

  createTraining = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = {
        orgId,
        memberId: req.body.memberId,
        planVariantId: req.body.planVariantId,
        trainerId: req.body.trainerId,
        startDate: req.body.startDate,
        discountAmount: req.body.discountAmount,
        autoRenew: req.body.autoRenew,
        notes: req.body.notes,
        paymentAmount: req.body.paymentAmount,
        paymentMethod: req.body.paymentMethod,
        paymentReference: req.body.paymentReference,
        paymentNotes: req.body.paymentNotes,
      };

      const training = await trainingService.createTraining(data);

      res.status(201).json({
        success: true,
        message: "Training created successfully",
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllTrainings = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.memberId) filters.memberId = req.query.memberId;
      if (req.query.trainerId) filters.trainerId = req.query.trainerId;

      const result = await trainingService.getAllTrainings(
        orgId,
        page,
        limit,
        filters,
      );

      res.status(200).json({
        success: true,
        data: result.trainings,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getTrainingById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const training = await trainingService.getTrainingById(id);

      res.status(200).json({
        success: true,
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  getMemberTrainings = async (req, res, next) => {
    try {
      const { memberId } = req.params;
      const trainings =
        await trainingService.getMemberTrainings(memberId);

      res.status(200).json({
        success: true,
        data: trainings,
      });
    } catch (error) {
      next(error);
    }
  };

  getActiveTraining = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { memberId } = req.params;
      const training = await trainingService.getActiveTraining(
        memberId,
        orgId,
      );

      res.status(200).json({
        success: true,
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  getTrainingDues = async (req, res, next) => {
    try {
      const { id } = req.params;
      const dues = await trainingService.getTrainingDues(id);

      res.status(200).json({
        success: true,
        data: dues,
      });
    } catch (error) {
      next(error);
    }
  };

  updateTraining = async (req, res, next) => {
    try {
      const { id } = req.params;
      const training = await trainingService.updateTraining(
        id,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Training updated successfully",
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelTraining = async (req, res, next) => {
    try {
      const { id } = req.params;
      const training = await trainingService.cancelTraining(id);

      res.status(200).json({
        success: true,
        message: "Training cancelled successfully",
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  freezeTraining = async (req, res, next) => {
    try {
      const { id } = req.params;
      const training = await trainingService.freezeTraining(id);

      res.status(200).json({
        success: true,
        message: "Training frozen successfully",
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  unfreezeTraining = async (req, res, next) => {
    try {
      const { id } = req.params;
      const training = await trainingService.unfreezeTraining(id);

      res.status(200).json({
        success: true,
        message: "Training unfrozen successfully",
        data: training,
      });
    } catch (error) {
      next(error);
    }
  };

  getExpiringTrainings = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const daysAhead = parseInt(req.query.days) || 7;
      const trainings = await trainingService.getExpiringTrainings(
        orgId,
        daysAhead,
      );

      res.status(200).json({
        success: true,
        data: trainings,
      });
    } catch (error) {
      next(error);
    }
  };

  getTrainingStats = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const stats = await trainingService.getTrainingStats(orgId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // ─── Payment Endpoints ──────────────────────────────────────

  recordPayment = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = {
        orgId,
        memberId: req.body.memberId,
        trainingId: req.body.trainingId,
        amount: req.body.amount,
        method: req.body.method,
        status: req.body.status,
        reference: req.body.reference,
        notes: req.body.notes,
      };

      const payment = await paymentService.recordPayment(data, {
        subscriptionRepo: trainingRepository,
        subscriptionIdField: "trainingId",
        subscriptionLabel: "Training",
      });

      res.status(201).json({
        success: true,
        message: "Payment recorded successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentById(id, { trainingOnly: true });

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentsByTraining = async (req, res, next) => {
    try {
      const { id } = req.params;
      const payments =
        await paymentService.getPaymentsBySubscription(id, "trainingId");

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentsByMember = async (req, res, next) => {
    try {
      const { memberId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await paymentService.getPaymentsByMember(
        memberId,
        page,
        limit,
        { trainingOnly: true },
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPayments = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.memberId) filters.memberId = req.query.memberId;
      if (req.query.trainingId) filters.trainingId = req.query.trainingId;
      if (req.query.method) filters.method = req.query.method;

      const result = await paymentService.getAllPayments(
        orgId,
        page,
        limit,
        filters,
        { trainingOnly: true },
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePaymentStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "Payment status is required" });
      }

      const payment = await paymentService.updatePaymentStatus(id, status);

      res.status(200).json({
        success: true,
        message: "Payment status updated successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new TrainingController();
