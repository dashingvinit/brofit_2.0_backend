const userService = require("../services/user.service");

/**
 * User Controller
 * Handles HTTP requests and responses for user operations
 */

class UserController {
  /**
   * Create a new user in the organization
   * POST /api/v1/users
   */
  async createUser(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const userData = {
        clerkUserId: req.body.clerkUserId,
        clerkOrganizationId: organizationId,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        imageUrl: req.body.imageUrl,
        role: req.body.role,
      };

      const user = await userService.createUser(userData);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync current authenticated user to database
   * POST /api/v1/users/sync
   */
  async syncCurrentUser(req, res, next) {
    try {
      const clerkUserId = req.auth.userId;
      const organizationId = req.auth.orgId;

      if (!clerkUserId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      // Get user data from Clerk auth context
      const clerkUserData = {
        id: clerkUserId,
        email_addresses: [{ email_address: req.auth.sessionClaims?.email }],
        first_name: req.auth.sessionClaims?.firstName || '',
        last_name: req.auth.sessionClaims?.lastName || '',
        image_url: req.auth.sessionClaims?.imageUrl,
      };

      const user = await userService.syncUserFromClerk(clerkUserData, organizationId);

      res.status(200).json({
        success: true,
        message: "User synced successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user within organization context
   * GET /api/v1/users/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const clerkUserId = req.auth.userId;
      const organizationId = req.auth.orgId;

      if (!clerkUserId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const user = await userService.getUserByClerkIdAndOrg(clerkUserId, organizationId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users in the organization
   * GET /api/v1/users
   */
  async getAllUsers(req, res, next) {
    try {
      const organizationId = req.auth.orgId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Organization context required",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await userService.getAllUsers(organizationId, page, limit);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * PATCH /api/v1/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      // Only include provided fields
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.firstName !== undefined)
        updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined)
        updateData.lastName = req.body.lastName;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.role !== undefined) updateData.role = req.body.role;
      if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;

      const user = await userService.updateUser(id, updateData);

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clerk webhook handler for organization events
   * POST /api/v1/users/webhook/clerk
   */
  async handleClerkWebhook(req, res, next) {
    try {
      const { type, data } = req.body;

      switch (type) {
        case "organizationMembership.created":
        case "organizationMembership.updated":
          // Sync user when they join or are updated in an organization
          await userService.syncUserFromClerk(
            data.public_user_data,
            data.organization.id
          );
          break;

        case "organizationMembership.deleted":
          // Handle when user leaves organization (soft delete)
          // Could update is_active to false
          break;

        case "user.updated":
          // Update user profile across all their organizations
          // Implementation depends on your requirements
          break;

        default:
          console.log("Unhandled webhook type:", type);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add membership plan to user
   * POST /api/v1/users/:id/memberships
   */
  async addMembershipPlan(req, res, next) {
    try {
      const { id } = req.params;
      const membershipData = {
        planId: req.body.planId,
        planName: req.body.planName,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: req.body.status || 'active',
        amountPaid: req.body.amountPaid,
        paymentReference: req.body.paymentReference,
      };

      const user = await userService.addMembershipPlan(id, membershipData);

      res.status(200).json({
        success: true,
        message: "Membership plan added successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update membership plan
   * PATCH /api/v1/users/:id/memberships/:membershipId
   */
  async updateMembershipPlan(req, res, next) {
    try {
      const { id, membershipId } = req.params;
      const updateData = {};

      if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate;
      if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.amountPaid !== undefined) updateData.amountPaid = req.body.amountPaid;
      if (req.body.paymentReference !== undefined) updateData.paymentReference = req.body.paymentReference;

      const user = await userService.updateMembershipPlan(id, membershipId, updateData);

      res.status(200).json({
        success: true,
        message: "Membership plan updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove membership plan
   * DELETE /api/v1/users/:id/memberships/:membershipId
   */
  async removeMembershipPlan(req, res, next) {
    try {
      const { id, membershipId } = req.params;

      const user = await userService.removeMembershipPlan(id, membershipId);

      res.status(200).json({
        success: true,
        message: "Membership plan removed successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add training plan to user
   * POST /api/v1/users/:id/trainings
   */
  async addTrainingPlan(req, res, next) {
    try {
      const { id } = req.params;
      const trainingData = {
        planId: req.body.planId,
        planName: req.body.planName,
        trainerId: req.body.trainerId,
        trainerName: req.body.trainerName,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: req.body.status || 'active',
        sessionsPerWeek: req.body.sessionsPerWeek,
        notes: req.body.notes,
      };

      const user = await userService.addTrainingPlan(id, trainingData);

      res.status(200).json({
        success: true,
        message: "Training plan added successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update training plan
   * PATCH /api/v1/users/:id/trainings/:trainingId
   */
  async updateTrainingPlan(req, res, next) {
    try {
      const { id, trainingId } = req.params;
      const updateData = {};

      if (req.body.trainerId !== undefined) updateData.trainerId = req.body.trainerId;
      if (req.body.trainerName !== undefined) updateData.trainerName = req.body.trainerName;
      if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate;
      if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.sessionsPerWeek !== undefined) updateData.sessionsPerWeek = req.body.sessionsPerWeek;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      const user = await userService.updateTrainingPlan(id, trainingId, updateData);

      res.status(200).json({
        success: true,
        message: "Training plan updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove training plan
   * DELETE /api/v1/users/:id/trainings/:trainingId
   */
  async removeTrainingPlan(req, res, next) {
    try {
      const { id, trainingId } = req.params;

      const user = await userService.removeTrainingPlan(id, trainingId);

      res.status(200).json({
        success: true,
        message: "Training plan removed successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
