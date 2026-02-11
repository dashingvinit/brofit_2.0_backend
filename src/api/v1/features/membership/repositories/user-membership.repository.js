const CrudRepository = require('../../../../../shared/repositories/crud.repository');
const { UserMembership } = require('../models/user-membership.model');

/**
 * User Membership Repository
 * Database operations for user memberships
 */
class UserMembershipRepository extends CrudRepository {
  constructor() {
    super(UserMembership);
  }

  /**
   * Find all memberships for a user (history)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User memberships with plan details
   */
  async findByUser(userId) {
    try {
      return await this.rawQuery(async (model) => {
        return await model
          .find({ userId })
          .populate('membershipPlanId', 'name description durationDays price')
          .sort('-createdAt')
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find active membership for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Active membership or null
   */
  async findActiveByUser(userId) {
    try {
      const now = new Date();

      return await this.rawQuery(async (model) => {
        return await model
          .findOne({
            userId,
            status: 'active',
            endDate: { $gt: now }
          })
          .populate('membershipPlanId', 'name description durationDays price features')
          .sort('-endDate')
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all memberships by organization
   * @param {string} organizationId - Organization ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Memberships
   */
  async findByOrganization(organizationId, status = null) {
    try {
      return await this.rawQuery(async (model) => {
        const filter = { organizationId };
        if (status) {
          filter.status = status;
        }

        return await model
          .find(filter)
          .populate('membershipPlanId', 'name')
          .populate('userId', 'firstName lastName email')
          .sort('-createdAt')
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find memberships expiring soon
   * @param {string} organizationId - Organization ID
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} Expiring memberships
   */
  async findExpiringSoon(organizationId, daysAhead = 7) {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      return await this.rawQuery(async (model) => {
        return await model
          .find({
            organizationId,
            status: 'active',
            endDate: {
              $gte: now,
              $lte: futureDate
            }
          })
          .populate('membershipPlanId', 'name')
          .populate('userId', 'firstName lastName email phone')
          .sort('endDate')
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get membership statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Membership stats
   */
  async getMembershipStats(organizationId) {
    try {
      return await this.rawQuery(async (model) => {
        const stats = await model.aggregate([
          { $match: { organizationId } },
          {
            $group: {
              _id: null,
              totalMemberships: { $sum: 1 },
              activeCount: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              expiredCount: {
                $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
              },
              cancelledCount: {
                $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
              },
              suspendedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
              },
              totalRevenue: { $sum: '$amountPaid' },
              avgMembershipValue: { $avg: '$amountPaid' }
            }
          },
          {
            $project: {
              _id: 0,
              totalMemberships: 1,
              activeCount: 1,
              expiredCount: 1,
              cancelledCount: 1,
              suspendedCount: 1,
              totalRevenue: 1,
              avgMembershipValue: 1
            }
          }
        ]);

        return stats[0] || {
          totalMemberships: 0,
          activeCount: 0,
          expiredCount: 0,
          cancelledCount: 0,
          suspendedCount: 0,
          totalRevenue: 0,
          avgMembershipValue: 0
        };
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update membership status
   * @param {string} membershipId - Membership ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated membership
   */
  async updateStatus(membershipId, status) {
    try {
      return await this.update(membershipId, { status });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserMembershipRepository();
