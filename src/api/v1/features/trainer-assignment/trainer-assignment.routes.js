const express = require('express');
const trainerAssignmentController = require('./controllers/trainer-assignment.controller');
const {
  validateAssignmentCreation,
  validateAssignmentUpdate,
} = require('./trainer-assignment.middlewares');
const { requireAuth } = require('@clerk/express');

const router = express.Router();

/**
 * Trainer Assignment Routes
 * Base path: /api/v1/trainer-assignments
 * All routes require authentication and organization context
 */

// Apply authentication to all routes
router.use(requireAuth());

// Require organization context for all routes
router.use((req, res, next) => {
  if (!req.auth?.orgId) {
    return res.status(403).json({
      success: false,
      message: 'Organization context required. Please select an organization.',
    });
  }
  next();
});

// Get all assignments (with optional filters)
router.get('/', trainerAssignmentController.getAllAssignments);

// Assign a trainer to a member
router.post(
  '/',
  validateAssignmentCreation,
  trainerAssignmentController.assignTrainer
);

// Get assignment by ID
router.get('/:id', trainerAssignmentController.getAssignmentById);

// Update assignment
router.patch(
  '/:id',
  validateAssignmentUpdate,
  trainerAssignmentController.updateAssignment
);

// Complete an assignment
router.post('/:id/complete', trainerAssignmentController.completeAssignment);

// Delete assignment
router.delete('/:id', trainerAssignmentController.deleteAssignment);

// Get member's active trainer
router.get(
  '/member/:memberId/active',
  trainerAssignmentController.getMemberActiveTrainer
);

// Get all members assigned to a trainer
router.get(
  '/trainer/:trainerId/members',
  trainerAssignmentController.getTrainerMembers
);

module.exports = router;
