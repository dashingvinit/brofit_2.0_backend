const trainingPlanRepository = require("../repositories/training-plan.repository");

/**
 * Training Plan Service
 * Contains business logic for training plan operations
 */
class TrainingPlanService {
  /**
   * Create a new training plan
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Created plan
   * @throws {Error} If validation fails
   */
  async createPlan(planData) {
    // Check if plan with same name exists
    const existingPlan = await trainingPlanRepository.findByName(
      planData.organizationId,
      planData.name
    );

    if (existingPlan) {
      throw new Error("Training plan with this name already exists");
    }

    return await trainingPlanRepository.create(planData);
  }

  /**
   * Get all active plans
   * @param {string} organizationId - Organization ID
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} Active plans
   */
  async getActivePlans(organizationId, category = null) {
    if (category) {
      return await trainingPlanRepository.findByCategory(organizationId, category);
    }
    return await trainingPlanRepository.findActivePlans(organizationId);
  }

  /**
   * Get all plans including inactive
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} All plans
   */
  async getAllPlans(organizationId) {
    return await trainingPlanRepository.find(
      { organizationId },
      { orderBy: '-createdAt' }
    );
  }

  /**
   * Get plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Plan data
   * @throws {Error} If plan not found
   */
  async getPlanById(planId) {
    const plan = await trainingPlanRepository.get(planId);

    if (!plan) {
      throw new Error("Training plan not found");
    }

    return plan;
  }

  /**
   * Update plan
   * @param {string} planId - Plan ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated plan
   * @throws {Error} If plan not found
   */
  async updatePlan(planId, updateData) {
    const plan = await trainingPlanRepository.get(planId);

    if (!plan) {
      throw new Error("Training plan not found");
    }

    return await trainingPlanRepository.update(planId, updateData);
  }

  /**
   * Deactivate plan (soft delete)
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Updated plan
   * @throws {Error} If plan not found
   */
  async deactivatePlan(planId) {
    const plan = await trainingPlanRepository.get(planId);

    if (!plan) {
      throw new Error("Training plan not found");
    }

    return await trainingPlanRepository.update(planId, { isActive: false });
  }
}

module.exports = new TrainingPlanService();
