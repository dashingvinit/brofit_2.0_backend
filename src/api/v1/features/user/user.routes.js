const express = require("express");
const userController = require("./controllers/user.controller");
const {
  validateUserCreation,
  validateUserUpdate,
  requireAuth,
  requireOrganization,
  checkRole,
  checkOwnership,
} = require("./user.middlewares");

const router = express.Router();

/**
 * User Routes (Organization-scoped)
 * Base path: /api/v1/users
 * All routes except webhooks require authentication and organization context
 */

// Public routes
router.post("/webhook/clerk", userController.handleClerkWebhook);

// Protected routes - require authentication and organization context
router.use(requireAuth());
router.use(requireOrganization);

// Sync current user to database (create if doesn't exist)
router.post("/sync", userController.syncCurrentUser);

// Get current authenticated user in organization
router.get("/me", userController.getCurrentUser);

// Get all users in organization (admin only)
router.get("/", checkRole(["admin"]), userController.getAllUsers);

// Get user by ID (admin or owner)
router.get("/:id", checkOwnership, userController.getUserById);

// Create new user in organization
router.post("/", validateUserCreation, userController.createUser);

// Update user (admin or owner)
router.patch(
  "/:id",
  checkOwnership,
  validateUserUpdate,
  userController.updateUser,
);

// Delete user (admin only)
router.delete("/:id", checkRole(["admin"]), userController.deleteUser);

module.exports = router;
