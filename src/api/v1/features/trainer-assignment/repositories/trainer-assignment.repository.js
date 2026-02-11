const CrudRepository = require('../../../../../shared/repositories/crud.repository');
const { TrainerAssignment } = require('../models/trainer-assignment.model');

/**
 * Trainer Assignment Repository
 * Database operations for trainer-member assignments
 */
class TrainerAssignmentRepository extends CrudRepository {
  constructor() {
    super(TrainerAssignment);
  }

  /**
   * Find assignment by member ID and organization
   * @param {string} memberId - Member ID
   * @param {string} organizationId - Organization ID
   * @param {string} status - Assignment status
   * @returns {Promise<Object|null>} Assignment or null
   */
  async findByMemberAndOrg(memberId, organizationId, status = null) {
    try {
      const filter = { memberId, organizationId };
      if (status) filter.status = status;

      return await this.findOne(filter);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all assignments for a trainer
   * @param {string} trainerId - Trainer ID
   * @param {string} organizationId - Organization ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Assignments
   */
  async findByTrainer(trainerId, organizationId, status = null) {
    try {
      const filter = { trainerId, organizationId };
      if (status) filter.status = status;

      return await this.find(filter, { orderBy: '-assignedAt' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all assignments in organization
   * @param {string} organizationId - Organization ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Assignments
   */
  async findByOrganization(organizationId, status = null) {
    try {
      const filter = { organizationId };
      if (status) filter.status = status;

      return await this.find(filter, { orderBy: '-assignedAt' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get assignment with populated trainer and member details
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object|null>} Assignment with populated details
   */
  async getWithDetails(assignmentId) {
    try {
      return await this.rawQuery(async (model) => {
        return await model
          .findById(assignmentId)
          .populate('trainerId', 'firstName lastName email phone imageUrl')
          .populate('memberId', 'firstName lastName email phone imageUrl')
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all assignments with populated trainer and member details
   * @param {Object} filter - Query filter
   * @returns {Promise<Array>} Assignments with populated details
   */
  async findWithDetails(filter) {
    try {
      return await this.rawQuery(async (model) => {
        return await model
          .find(filter)
          .populate('trainerId', 'firstName lastName email phone imageUrl')
          .populate('memberId', 'firstName lastName email phone imageUrl')
          .sort('-assignedAt')
          .lean();
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update assignment status
   * @param {string} assignmentId - Assignment ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated assignment
   */
  async updateStatus(assignmentId, status) {
    try {
      return await this.update(assignmentId, { status });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate member's active assignments
   * @param {string} memberId - Member ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async deactivateMemberAssignments(memberId, organizationId) {
    try {
      return await this.rawQuery(async (model) => {
        return await model.updateMany(
          { memberId, organizationId, status: 'active' },
          { $set: { status: 'completed', endDate: new Date() } }
        );
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TrainerAssignmentRepository();
