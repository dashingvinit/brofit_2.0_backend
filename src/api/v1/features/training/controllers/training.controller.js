const trainingService = require("../services/training.service");
const trainingPaymentService = require("../services/training-payment.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class TrainingController {
  constructor() {
    this.createTraining = this.createTraining.bind(this);
    this.getAllTrainings = this.getAllTrainings.bind(this);
    this.getTrainingById = this.getTrainingById.bind(this);
    this.getMemberTrainings = this.getMemberTrainings.bind(this);
    this.getActiveTraining = this.getActiveTraining.bind(this);
    this.getTrainingDues = this.getTrainingDues.bind(this);
    this.updateTraining = this.updateTraining.bind(this);
    this.cancelTraining = this.cancelTraining.bind(this);
    this.freezeTraining = this.freezeTraining.bind(this);
    this.unfreezeTraining = this.unfreezeTraining.bind(this);
    this.getExpiringTrainings = this.getExpiringTrainings.bind(this);
    this.getTrainingStats = this.getTrainingStats.bind(this);

    this.recordPayment = this.recordPayment.bind(this);
    this.getPaymentById = this.getPaymentById.bind(this);
    this.getPaymentsByTraining = this.getPaymentsByTraining.bind(this);
    this.getPaymentsByMember = this.getPaymentsByMember.bind(this);
    this.getAllPayments = this.getAllPayments.bind(this);
    this.updatePaymentStatus = this.updatePaymentStatus.bind(this);
  }

  // ─── Training Endpoints ───────────────────────────────────

  async createTraining(req, res, next) {
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
        // Optional initial payment
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
  }

  async getAllTrainings(req, res, next) {
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
  }

  async getTrainingById(req, res, next) {
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
  }

  async getMemberTrainings(req, res, next) {
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
  }

  async getActiveTraining(req, res, next) {
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
  }

  async getTrainingDues(req, res, next) {
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
  }

  async updateTraining(req, res, next) {
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
  }

  async cancelTraining(req, res, next) {
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
  }

  async freezeTraining(req, res, next) {
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
  }

  async unfreezeTraining(req, res, next) {
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
  }

  async getExpiringTrainings(req, res, next) {
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
  }

  async getTrainingStats(req, res, next) {
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
  }

  // ─── Payment Endpoints ──────────────────────────────────────

  async recordPayment(req, res, next) {
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

      const payment = await trainingPaymentService.recordPayment(data);

      res.status(201).json({
        success: true,
        message: "Payment recorded successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await trainingPaymentService.getPaymentById(id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByTraining(req, res, next) {
    try {
      const { id } = req.params;
      const payments =
        await trainingPaymentService.getPaymentsByTraining(id);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByMember(req, res, next) {
    try {
      const { memberId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await trainingPaymentService.getPaymentsByMember(
        memberId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllPayments(req, res, next) {
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

      const result = await trainingPaymentService.getAllPayments(
        orgId,
        page,
        limit,
        filters,
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "Payment status is required" });
      }

      const payment = await trainingPaymentService.updatePaymentStatus(id, status);

      res.status(200).json({
        success: true,
        message: "Payment status updated successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TrainingController();
