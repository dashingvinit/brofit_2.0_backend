const membershipPlanRepository = require("../repositories/membership-plan.repository");

/**
 * Membership Plan Service
 * Contains business logic for membership plan operations
 */
class MembershipPlanService {
  /**
   * Create a new membership plan
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Created plan
   * @throws {Error} If validation fails
   */
  async createPlan(planData) {
    // Check if plan with same name exists
    const existingPlan = await membershipPlanRepository.findByName(
      planData.organizationId,
      planData.name
    );

    if (existingPlan) {
      throw new Error("Membership plan with this name already exists");
    }

    return await membershipPlanRepository.create(planData);
  }

  /**
   * Get all active plans
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Active plans
   */
  async getActivePlans(organizationId) {
    return await membershipPlanRepository.findActivePlans(organizationId);
  }

  /**
   * Get all plans including inactive
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} All plans
   */
  async getAllPlans(organizationId) {
    return await membershipPlanRepository.find(
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
    const plan = await membershipPlanRepository.get(planId);

    if (!plan) {
      throw new Error("Membership plan not found");
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
    const plan = await membershipPlanRepository.get(planId);

    if (!plan) {
      throw new Error("Membership plan not found");
    }

    return await membershipPlanRepository.update(planId, updateData);
  }

  /**
   * Deactivate plan (soft delete)
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Updated plan
   * @throws {Error} If plan not found
   */
  async deactivatePlan(planId) {
    const plan = await membershipPlanRepository.get(planId);

    if (!plan) {
      throw new Error("Membership plan not found");
    }

    return await membershipPlanRepository.update(planId, { isActive: false });
  }
}

module.exports = new MembershipPlanService();
