const CrudRepository = require('../../../../../shared/repositories/crud.repository');
const { MembershipPlan } = require('../models/membership-plan.model');

/**
 * Membership Plan Repository
 * Database operations for membership plans
 */
class MembershipPlanRepository extends CrudRepository {
  constructor() {
    super(MembershipPlan);
  }

  /**
   * Find all active plans for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Active membership plans
   */
  async findActiveByOrganization(organizationId) {
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
   * Find all plans (active and inactive) for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} All membership plans
   */
  async findByOrganization(organizationId) {
    try {
      return await this.find({
        organizationId
      }, { orderBy: '-createdAt' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find plan by name within organization
   * @param {string} organizationId - Organization ID
   * @param {string} name - Plan name
   * @returns {Promise<Object|null>} Plan or null
   */
  async findByNameAndOrg(organizationId, name) {
    try {
      return await this.findOne({
        organizationId,
        name
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get plan statistics for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Plan statistics
   */
  async getPlanStats(organizationId) {
    try {
      return await this.rawQuery(async (model) => {
        const stats = await model.aggregate([
          { $match: { organizationId } },
          {
            $group: {
              _id: null,
              totalPlans: { $sum: 1 },
              activePlans: {
                $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
              },
              avgPrice: { $avg: '$price' },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            }
          },
          {
            $project: {
              _id: 0,
              totalPlans: 1,
              activePlans: 1,
              avgPrice: 1,
              minPrice: 1,
              maxPrice: 1
            }
          }
        ]);

        return stats[0] || {
          totalPlans: 0,
          activePlans: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0
        };
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MembershipPlanRepository();
