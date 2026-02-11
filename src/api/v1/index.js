const express = require('express');
const userRoutes = require('./features/user/user.routes');
const membershipRoutes = require('./features/membership/membership.routes');
const trainerAssignmentRoutes = require('./features/trainer-assignment/trainer-assignment.routes');

const router = express.Router();

/**
 * API v1 Routes
 * Combines all feature routes
 */

// Feature routes
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/trainer-assignments', trainerAssignmentRoutes);

// Health check for API v1
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
