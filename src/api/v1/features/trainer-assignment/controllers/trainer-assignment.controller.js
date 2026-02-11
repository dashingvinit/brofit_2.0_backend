const trainerAssignmentService = require('../services/trainer-assignment.service');

/**
 * Trainer Assignment Controller
 * Handles HTTP requests and responses for trainer-member assignments
 */

class TrainerAssignmentController {
  /**
   * Assign a trainer to a member
   * POST /api/v1/trainer-assignments
   */
  async assignTrainer(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const { memberId, trainerId, startDate, endDate, notes } = req.body;

      const assignment = await trainerAssignmentService.assignTrainer(
        organizationId,
        memberId,
        trainerId,
        {
          start_date: startDate,
          end_date: endDate,
          notes,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Trainer assigned successfully',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get member's current active trainer
   * GET /api/v1/trainer-assignments/member/:memberId/active
   */
  async getMemberActiveTrainer(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const { memberId } = req.params;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const assignment = await trainerAssignmentService.getMemberActiveTrainer(
        organizationId,
        memberId
      );

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'No active trainer assignment found for this member',
        });
      }

      res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all members assigned to a trainer
   * GET /api/v1/trainer-assignments/trainer/:trainerId/members
   */
  async getTrainerMembers(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const { trainerId } = req.params;
      const status = req.query.status || 'active';

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const assignments = await trainerAssignmentService.getTrainerMembers(
        organizationId,
        trainerId,
        status
      );

      res.status(200).json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all trainer assignments in the organization
   * GET /api/v1/trainer-assignments
   */
  async getAllAssignments(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const filters = {
        status: req.query.status,
        trainerId: req.query.trainerId,
        memberId: req.query.memberId,
      };

      const assignments = await trainerAssignmentService.getAllAssignments(
        organizationId,
        filters
      );

      res.status(200).json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment by ID
   * GET /api/v1/trainer-assignments/:id
   */
  async getAssignmentById(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const assignment = await trainerAssignmentService.getAssignmentById(
        organizationId,
        id
      );

      res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update assignment
   * PATCH /api/v1/trainer-assignments/:id
   */
  async updateAssignment(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const updateData = {};

      if (req.body.startDate !== undefined) updateData.start_date = req.body.startDate;
      if (req.body.endDate !== undefined) updateData.end_date = req.body.endDate;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      const assignment = await trainerAssignmentService.updateAssignment(
        organizationId,
        id,
        updateData
      );

      res.status(200).json({
        success: true,
        message: 'Assignment updated successfully',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * End/complete an assignment
   * POST /api/v1/trainer-assignments/:id/complete
   */
  async completeAssignment(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const { id } = req.params;
      const endDate = req.body.endDate || new Date();

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      const assignment = await trainerAssignmentService.updateAssignmentStatus(
        organizationId,
        id,
        'completed',
        endDate
      );

      res.status(200).json({
        success: true,
        message: 'Assignment completed successfully',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete assignment
   * DELETE /api/v1/trainer-assignments/:id
   */
  async deleteAssignment(req, res, next) {
    try {
      const organizationId = req.auth.orgId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required',
        });
      }

      await trainerAssignmentService.deleteAssignment(organizationId, id);

      res.status(200).json({
        success: true,
        message: 'Assignment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TrainerAssignmentController();
