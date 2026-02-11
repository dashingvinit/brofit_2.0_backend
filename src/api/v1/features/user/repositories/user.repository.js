const CrudRepository = require('../../../../../shared/repositories/crud.repository');
const { User } = require('../models/user.model');

/**
 * User Repository
 * Extends CrudRepository with user-specific database operations
 */
class UserRepository extends CrudRepository {
  constructor() {
    super(User); // Pass Mongoose model to base class
  }

  /**
   * Find user by Clerk user ID
   * @param {string} clerkUserId - Clerk user ID
   * @returns {Promise<Object|null>} User or null
   */
  async findByClerkId(clerkUserId) {
    try {
      return await this.findOne({ clerkUserId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by Clerk user ID and organization ID
   * @param {string} clerkUserId - Clerk user ID
   * @param {string} organizationId - Clerk organization ID
   * @returns {Promise<Object|null>} User or null
   */
  async findByClerkIdAndOrg(clerkUserId, organizationId) {
    try {
      return await this.findOne({
        clerkUserId,
        clerkOrganizationId: organizationId
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all users in an organization
   * @param {string} organizationId - Clerk organization ID
   * @returns {Promise<Array>} List of users
   */
  async findByOrganization(organizationId) {
    try {
      return await this.find({
        clerkOrganizationId: organizationId,
        isActive: true
      }, { orderBy: '-createdAt' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null
   */
  async findByEmail(email) {
    try {
      return await this.findOne({ email });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find users by role within an organization
   * @param {string} role - User role
   * @param {string} organizationId - Clerk organization ID
   * @returns {Promise<Array>} List of users
   */
  async findByRole(role, organizationId) {
    try {
      return await this.find({
        role,
        clerkOrganizationId: organizationId,
        isActive: true
      }, { orderBy: '-createdAt' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find active users with pagination (organization-scoped)
   * @param {string} organizationId - Clerk organization ID
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Paginated results
   */
  async findActiveUsers(organizationId, page = 1, limit = 10) {
    try {
      return await this.findWithPagination(
        {
          clerkOrganizationId: organizationId,
          isActive: true
        },
        { page, limit, orderBy: '-createdAt' }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user statistics for an organization
   * @param {string} organizationId - Clerk organization ID
   * @returns {Promise<Object>} User stats
   */
  async getUserStats(organizationId) {
    try {
      return await this.rawQuery(async (model) => {
        return await model.aggregate([
          { $match: { clerkOrganizationId: organizationId } },
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
              activeCount: {
                $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
              },
              inactiveCount: {
                $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
              }
            }
          },
          {
            $project: {
              _id: 0,
              role: '$_id',
              count: 1,
              activeCount: 1,
              inactiveCount: 1
            }
          }
        ]);
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search users by name or email within an organization
   * @param {string} organizationId - Clerk organization ID
   * @param {string} searchTerm - Search term
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Matching users
   */
  async searchUsers(organizationId, searchTerm, limit = 10) {
    try {
      const searchRegex = new RegExp(searchTerm, 'i');

      return await this.rawQuery(async (model) => {
        return await model
          .find({
            clerkOrganizationId: organizationId,
            isActive: true,
            $or: [
              { firstName: searchRegex },
              { lastName: searchRegex },
              { email: searchRegex }
            ]
          })
          .sort('-createdAt')
          .limit(limit)
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserRepository();
