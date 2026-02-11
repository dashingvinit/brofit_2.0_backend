/**
 * Trainer Assignment Middlewares
 * Validation and authorization for trainer assignment endpoints
 */

/**
 * Validate trainer assignment creation
 */
const validateAssignmentCreation = (req, res, next) => {
  const { memberId, trainerId } = req.body;
  const errors = [];

  if (!memberId || !memberId.trim()) {
    errors.push('Member ID is required');
  }

  if (!trainerId || !trainerId.trim()) {
    errors.push('Trainer ID is required');
  }

  if (memberId === trainerId) {
    errors.push('Member and trainer cannot be the same user');
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
 * Validate assignment update
 */
const validateAssignmentUpdate = (req, res, next) => {
  const { status, startDate, endDate } = req.body;

  if (status && !['active', 'inactive', 'completed'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be active, inactive, or completed',
    });
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date',
      });
    }
  }

  next();
};

module.exports = {
  validateAssignmentCreation,
  validateAssignmentUpdate,
};
