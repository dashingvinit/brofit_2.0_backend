const trainerRepository = require("../repositories/trainer.repository");

class TrainerService {
  async _getTrainerOrThrow(trainerId) {
    const trainer = await trainerRepository.get(trainerId);
    if (!trainer) {
      throw new Error("Trainer not found");
    }
    return trainer;
  }

  async createTrainer(data) {
    if (!data.orgId) {
      throw new Error("Organization ID is required");
    }
    if (!data.name || !data.name.trim()) {
      throw new Error("Trainer name is required");
    }

    return await trainerRepository.create({
      orgId: data.orgId,
      name: data.name.trim(),
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

    await trainerRepository.update(trainerId, dbData);
    return await trainerRepository.get(trainerId);
  }

  async deactivateTrainer(trainerId) {
    await this._getTrainerOrThrow(trainerId);
    await trainerRepository.update(trainerId, { isActive: false });
    return await trainerRepository.get(trainerId);
  }

  async getTrainerWithActiveClients(trainerId) {
    const trainer = await trainerRepository.findWithActiveClients(trainerId);
    if (!trainer) {
      throw new Error("Trainer not found");
    }
    return trainer;
  }
}

module.exports = new TrainerService();
