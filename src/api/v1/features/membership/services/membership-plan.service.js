const membershipPlanRepository = require('../repositories/membership-plan.repository');

/**
 * Membership Plan Service
 * Business logic for membership plans
 */
class MembershipPlanService {
  /**
   * Create a new membership plan
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Created plan
   */
  async createPlan(planData) {
    // Check if plan with same name exists
    const existing = await membershipPlanRepository.findByNameAndOrg(
      planData.organizationId,
      planData.name
    );

    if (existing) {
      throw new Error('A plan with this name already exists');
    }

    const dbData = {
      organizationId: planData.organizationId,
      name: planData.name,
      description: planData.description,
      durationDays: planData.durationDays,
      price: planData.price,
      features: planData.features || [],
      isActive: planData.isActive !== undefined ? planData.isActive : true,
    };

    const plan = await membershipPlanRepository.create(dbData);
    return this.sanitizePlan(plan);
  }

  /**
   * Get plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Plan data
   */
  async getPlanById(planId) {
    const plan = await membershipPlanRepository.get(planId);

    if (!plan) {
      throw new Error('Membership plan not found');
    }

    return this.sanitizePlan(plan);
  }

  /**
   * Get all active plans for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Active plans
   */
  async getActivePlans(organizationId) {
    const plans = await membershipPlanRepository.findActiveByOrganization(organizationId);
    return plans.map(plan => this.sanitizePlan(plan));
  }

  /**
   * Get all plans (including inactive) for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} All plans
   */
  async getAllPlans(organizationId) {
    const plans = await membershipPlanRepository.findByOrganization(organizationId);
    return plans.map(plan => this.sanitizePlan(plan));
  }

  /**
   * Update membership plan
   * @param {string} planId - Plan ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated plan
   */
  async updatePlan(planId, updateData) {
    const plan = await membershipPlanRepository.get(planId);

    if (!plan) {
      throw new Error('Membership plan not found');
    }

    // Check name uniqueness if being updated
    if (updateData.name && updateData.name !== plan.name) {
      const existing = await membershipPlanRepository.findByNameAndOrg(
        plan.organizationId,
        updateData.name
      );

      if (existing) {
        throw new Error('A plan with this name already exists');
      }
    }

    const dbData = {};
    if (updateData.name !== undefined) dbData.name = updateData.name;
    if (updateData.description !== undefined) dbData.description = updateData.description;
    if (updateData.durationDays !== undefined) dbData.durationDays = updateData.durationDays;
    if (updateData.price !== undefined) dbData.price = updateData.price;
    if (updateData.features !== undefined) dbData.features = updateData.features;
    if (updateData.isActive !== undefined) dbData.isActive = updateData.isActive;

    const updated = await membershipPlanRepository.update(planId, dbData);
    return this.sanitizePlan(updated);
  }

  /**
   * Deactivate a plan (soft delete)
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Success message
   */
  async deactivatePlan(planId) {
    const plan = await membershipPlanRepository.get(planId);

    if (!plan) {
      throw new Error('Membership plan not found');
    }

    await membershipPlanRepository.update(planId, {
      isActive: false
    });

    return { message: 'Plan deactivated successfully' };
  }

  /**
   * Get plan statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Plan statistics
   */
  async getPlanStats(organizationId) {
    return await membershipPlanRepository.getPlanStats(organizationId);
  }

  /**
   * Sanitize plan data - handles MongoDB ID conversion and ensures type safety
   * @param {Object} plan - Plan object
   * @returns {Object} Sanitized plan
   */
  sanitizePlan(plan) {
    if (!plan) return null;

    return {
      ...plan,
      // MongoDB ObjectId to string conversion
      id: plan.id || plan._id?.toString(),
      // Type conversion for currency
      price: parseFloat(plan.price),
      // Safe default for features array
      features: plan.features || [],
    };
  }
}

module.exports = new MembershipPlanService();
