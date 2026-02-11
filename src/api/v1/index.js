const express = require('express');
const userRoutes = require('./features/user/user.routes');
const planRoutes = require('./features/plan/plan.routes');

const router = express.Router();

/**
 * API v1 Routes
 * Combines all feature routes
 */

// Feature routes
router.use('/users', userRoutes);
router.use('/plans', planRoutes);

// Health check for API v1
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
