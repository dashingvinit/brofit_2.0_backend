/**
 * Membership Middlewares
 * Validation and authorization for membership operations
 */

/**
 * Validate membership plan creation/update data
 */
const validatePlanData = (req, res, next) => {
  const { name, durationDays, price } = req.body;
  const errors = [];

  if (!name || !name.trim()) {
    errors.push('Plan name is required');
  }

  if (!durationDays || durationDays <= 0) {
    errors.push('Duration must be a positive number');
  }

  if (price === undefined || price < 0) {
    errors.push('Price must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validate membership assignment data
 */
const validateMembershipAssignment = (req, res, next) => {
  const { planId } = req.body;
  const errors = [];

  if (!planId) {
    errors.push('Plan ID is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = {
  validatePlanData,
  validateMembershipAssignment,
};
