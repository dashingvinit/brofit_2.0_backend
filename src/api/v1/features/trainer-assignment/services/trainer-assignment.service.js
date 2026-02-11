const trainerAssignmentRepository = require('../repositories/trainer-assignment.repository');
const userRepository = require('../../user/repositories/user.repository');
const { AssignmentStatus } = require('../models/trainer-assignment.model');

/**
 * Trainer Assignment Service
 * Handles business logic for trainer-member assignments
 */
class TrainerAssignmentService {
  /**
   * Assign a trainer to a member
   * Automatically deactivates any existing active assignment for the member
   */
  async assignTrainer(organizationId, memberId, trainerId, assignmentData = {}) {
    // Verify member exists and has 'member' role
    const member = await userRepository.get(memberId);
    if (!member || member.clerkOrganizationId !== organizationId || !member.isActive) {
      throw new Error('Member not found or inactive');
    }
    if (member.role !== 'member') {
      throw new Error('User must have member role');
    }

    // Verify trainer exists and has 'trainer' role
    const trainer = await userRepository.get(trainerId);
    if (!trainer || trainer.clerkOrganizationId !== organizationId || !trainer.isActive) {
      throw new Error('Trainer not found or inactive');
    }
    if (trainer.role !== 'trainer') {
      throw new Error('User must have trainer role');
    }

    // Deactivate any existing active assignments for this member
    await trainerAssignmentRepository.deactivateMemberAssignments(memberId, organizationId);

    // Create new assignment
    const assignmentDbData = {
      organizationId,
      memberId,
      trainerId,
      status: assignmentData.status || AssignmentStatus.ACTIVE,
      startDate: assignmentData.startDate || new Date(),
      endDate: assignmentData.endDate || null,
      notes: assignmentData.notes || null,
    };

    return await trainerAssignmentRepository.create(assignmentDbData);
  }

  /**
   * Get member's current active trainer assignment
   */
  async getMemberActiveTrainer(organizationId, memberId) {
    const assignment = await trainerAssignmentRepository.findWithDetails({
      memberId,
      organizationId,
      status: AssignmentStatus.ACTIVE,
    });

    return assignment.length > 0 ? assignment[0] : null;
  }

  /**
   * Get all members assigned to a trainer
   */
  async getTrainerMembers(organizationId, trainerId, status = AssignmentStatus.ACTIVE) {
    return await trainerAssignmentRepository.findWithDetails({
      trainerId,
      organizationId,
      status,
    });
  }

  /**
   * Get all trainer assignments in the organization
   */
  async getAllAssignments(organizationId, filters = {}) {
    const queryFilter = { organizationId };

    if (filters.status) {
      queryFilter.status = filters.status;
    }
    if (filters.trainerId) {
      queryFilter.trainerId = filters.trainerId;
    }
    if (filters.memberId) {
      queryFilter.memberId = filters.memberId;
    }

    return await trainerAssignmentRepository.findWithDetails(queryFilter);
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(organizationId, assignmentId) {
    const assignment = await trainerAssignmentRepository.getWithDetails(assignmentId);

    if (!assignment || assignment.organizationId !== organizationId) {
      throw new Error('Assignment not found');
    }

    return assignment;
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(organizationId, assignmentId, status, endDate = null) {
    const assignment = await trainerAssignmentRepository.get(assignmentId);

    if (!assignment || assignment.organizationId !== organizationId) {
      throw new Error('Assignment not found');
    }

    const updateData = { status };
    if (endDate) {
      updateData.endDate = endDate;
    }

    return await trainerAssignmentRepository.update(assignmentId, updateData);
  }

  /**
   * Update assignment details
   */
  async updateAssignment(organizationId, assignmentId, updateData) {
    const assignment = await trainerAssignmentRepository.get(assignmentId);

    if (!assignment || assignment.organizationId !== organizationId) {
      throw new Error('Assignment not found');
    }

    const dbUpdateData = {};
    if (updateData.startDate !== undefined) dbUpdateData.startDate = updateData.startDate;
    if (updateData.endDate !== undefined) dbUpdateData.endDate = updateData.endDate;
    if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes;
    if (updateData.status !== undefined) dbUpdateData.status = updateData.status;

    if (Object.keys(dbUpdateData).length === 0) {
      throw new Error('No update data provided');
    }

    return await trainerAssignmentRepository.update(assignmentId, dbUpdateData);
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(organizationId, assignmentId) {
    const assignment = await trainerAssignmentRepository.get(assignmentId);

    if (!assignment || assignment.organizationId !== organizationId) {
      throw new Error('Assignment not found');
    }

    return await trainerAssignmentRepository.destroy(assignmentId);
  }
}

module.exports = new TrainerAssignmentService();
