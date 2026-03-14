const trainerRepository = require("../repositories/trainer.repository");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

class TrainerService {
  async _getTrainerOrThrow(trainerId) {
    const trainer = await trainerRepository.get(trainerId);
    if (!trainer) {
      throw createError("Trainer not found", 404);
    }
    return trainer;
  }

  async createTrainer(data) {
    if (!data.name || !data.name.trim()) {
      throw createError("Trainer name is required", 400);
    }
    if (data.splitPercent !== undefined && (data.splitPercent < 0 || data.splitPercent > 100)) {
      throw createError("Split percent must be between 0 and 100", 400);
    }

    return await trainerRepository.create({
      orgId: data.orgId,
      name: data.name.trim(),
      ...(data.splitPercent !== undefined && { splitPercent: data.splitPercent }),
    });
  }

  async getTrainersByOrg(orgId) {
    return await trainerRepository.findByOrganization(orgId);
  }

  async getTrainerById(trainerId) {
    return await this._getTrainerOrThrow(trainerId);
  }

  async updateTrainer(trainerId, updateData) {
    await this._getTrainerOrThrow(trainerId);

    const dbData = {};
    if (updateData.name !== undefined) dbData.name = updateData.name.trim();
    if (updateData.isActive !== undefined) dbData.isActive = updateData.isActive;
    if (updateData.splitPercent !== undefined) {
      if (updateData.splitPercent < 0 || updateData.splitPercent > 100) {
        throw createError("Split percent must be between 0 and 100", 400);
      }
      dbData.splitPercent = updateData.splitPercent;
    }

    await trainerRepository.update(trainerId, dbData);
    return await trainerRepository.get(trainerId);
  }

  async deactivateTrainer(trainerId) {
    await this._getTrainerOrThrow(trainerId);
    await trainerRepository.update(trainerId, { isActive: false });
    return await trainerRepository.get(trainerId);
  }

  async getTrainerWithActiveClients(trainerId) {
    await this._getTrainerOrThrow(trainerId);
    return await trainerRepository.findWithActiveClients(trainerId);
  }
}

module.exports = new TrainerService();
