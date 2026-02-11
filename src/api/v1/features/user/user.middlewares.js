const { requireAuth } = require('@clerk/express');

/**
 * User-specific middlewares
 */

/**
 * Require organization context
 * Ensures the request has an active organization context from Clerk
 */
const requireOrganization = (req, res, next) => {
  const organizationId = req.auth?.orgId;

  if (!organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Organization context required. Please select an organization.',
    });
  }

  req.organizationId = organizationId;
  next();
};

/**
 * Validate user creation data
 */
const validateUserCreation = (req, res, next) => {
  const { email, firstName, lastName } = req.body;

  const errors = [];

  // Email is optional, but if provided, must be valid format
  if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }

  if (!firstName || !firstName.trim()) {
    errors.push('First name is required');
  }

  if (!lastName || !lastName.trim()) {
    errors.push('Last name is required');
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
 * Validate user update data
 */
const validateUserUpdate = (req, res, next) => {
  const { email } = req.body;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
    });
  }

  next();
};

/**
 * Check if user has required role within their organization
 * @param {Array<string>} roles - Allowed roles (member, trainer, admin)
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      // Get organization ID from Clerk auth
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'No organization context found',
        });
      }

      // Get user from database using Clerk ID and organization
      const userService = require('./services/user.service');
      const user = await userService.getUserByClerkIdAndOrg(req.auth.userId, organizationId);

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      req.user = user;
      req.organizationId = organizationId;
      next();
    } catch (error) {
      // Handle user not found error specifically
      if (error.message === 'User not found in this organization') {
        return res.status(404).json({
          success: false,
          message: 'User profile not found. Please contact support to complete your account setup.',
        });
      }
      next(error);
    }
  };
};

/**
 * Check if user is accessing their own resource within their organization
 */
const checkOwnership = async (req, res, next) => {
  try {
    const requestedUserId = req.params.id;
    const organizationId = req.auth.orgId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message: 'No organization context found',
      });
    }

    const userService = require('./services/user.service');
    const currentUser = await userService.getUserByClerkIdAndOrg(req.auth.userId, organizationId);

    // Allow if user is admin or accessing their own resource
    if (currentUser.role === 'admin' || currentUser.id === parseInt(requestedUserId)) {
      req.user = currentUser;
      req.organizationId = organizationId;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You can only access your own resources',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateUserCreation,
  validateUserUpdate,
  checkRole,
  checkOwnership,
  requireAuth,
  requireOrganization,
};
