const CrudRepository = require('../../../../../shared/repositories/crud.repository');
const { MembershipPlan } = require('../models/membership-plan.model');

/**
 * Membership Plan Repository
 * Extends CrudRepository with membership plan-specific database operations
 */
class MembershipPlanRepository extends CrudRepository {
  constructor() {
    super(MembershipPlan);
  }

  /**
   * Find active plans for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Active membership plans
   */
  async findActivePlans(organizationId) {
    try {
      return await this.find({
        organizationId,
        isActive: true
      }, { orderBy: 'price' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find plan by name in organization
   * @param {string} organizationId - Organization ID
   * @param {string} name - Plan name
   * @returns {Promise<Object|null>} Membership plan or null
   */
  async findByName(organizationId, name) {
    try {
      return await this.findOne({ organizationId, name });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MembershipPlanRepository();
