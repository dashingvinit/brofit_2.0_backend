const trainerService = require("../services/trainer.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class TrainerController {
  constructor() {
    this.createTrainer = this.createTrainer.bind(this);
    this.getAllTrainers = this.getAllTrainers.bind(this);
    this.getTrainerById = this.getTrainerById.bind(this);
    this.updateTrainer = this.updateTrainer.bind(this);
    this.deactivateTrainer = this.deactivateTrainer.bind(this);
    this.getTrainerClients = this.getTrainerClients.bind(this);
  }

  async createTrainer(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const trainer = await trainerService.createTrainer({
        orgId,
        name: req.body.name,
      });

      res.status(201).json({
        success: true,
        message: "Trainer created successfully",
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllTrainers(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const trainers = await trainerService.getTrainersByOrg(orgId);

      res.status(200).json({
        success: true,
        data: trainers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrainerById(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await trainerService.getTrainerById(id);

      res.status(200).json({
        success: true,
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await trainerService.updateTrainer(id, req.body);

      res.status(200).json({
        success: true,
        message: "Trainer updated successfully",
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await trainerService.deactivateTrainer(id);

      res.status(200).json({
        success: true,
        message: "Trainer deactivated successfully",
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrainerClients(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await trainerService.getTrainerWithActiveClients(id);

      res.status(200).json({
        success: true,
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TrainerController();
