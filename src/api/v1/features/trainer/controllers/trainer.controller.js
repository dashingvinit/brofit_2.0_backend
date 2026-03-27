const trainerService = require("../services/trainer.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class TrainerController {
  createTrainer = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const trainer = await trainerService.createTrainer({
        orgId,
        name: req.body.name,
        splitPercent: req.body.splitPercent,
      });

      res.status(201).json({
        success: true,
        message: "Trainer created successfully",
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllTrainers = async (req, res, next) => {
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
  };

  getTrainerById = async (req, res, next) => {
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
  };

  updateTrainer = async (req, res, next) => {
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
  };

  deactivateTrainer = async (req, res, next) => {
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
  };

  getTrainerClients = async (req, res, next) => {
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
  };

  getAssignmentHistory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const history = await trainerService.getTrainerAssignmentHistory(id);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new TrainerController();
