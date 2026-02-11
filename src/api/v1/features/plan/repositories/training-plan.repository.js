const CrudRepository = require('../../../../../shared/repositories/crud.repository');
const { TrainingPlan } = require('../models/training-plan.model');

/**
 * Training Plan Repository
 * Extends CrudRepository with training plan-specific database operations
 */
class TrainingPlanRepository extends CrudRepository {
  constructor() {
    super(TrainingPlan);
  }

  /**
   * Find active plans for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Active training plans
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
   * Find plans by category
   * @param {string} organizationId - Organization ID
   * @param {string} category - Plan category
   * @returns {Promise<Array>} Training plans
   */
  async findByCategory(organizationId, category) {
    try {
      return await this.find({
        organizationId,
        category,
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
   * @returns {Promise<Object|null>} Training plan or null
   */
  async findByName(organizationId, name) {
    try {
      return await this.findOne({ organizationId, name });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TrainingPlanRepository();
