const userRepository = require("../repositories/user.repository");

/**
 * User Service
 * Contains business logic for user operations
 */

class UserService {
  /**
   * Create a new user within an organization
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   * @throws {Error} If user already exists or validation fails
   */
  async createUser(userData) {
    console.log("Creating user with data:", userData);
    if (!userData.clerkOrganizationId) {
      throw new Error("Organization ID is required");
    }

    // Check if user already exists in this organization
    if (userData.clerkUserId) {
      const existingUser = await userRepository.findByClerkIdAndOrg(
        userData.clerkUserId,
        userData.clerkOrganizationId,
      );
      if (existingUser) {
        throw new Error("User already exists in this organization");
      }
    }

    // Create user with MongoDB camelCase field names
    const dbData = {
      clerkUserId: userData.clerkUserId,
      clerkOrganizationId: userData.clerkOrganizationId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      imageUrl: userData.imageUrl,
      role: userData.role || "member",
    };

    // Create user
    return await userRepository.create(dbData);
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   * @throws {Error} If user not found
   */
  async getUserById(userId) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Get user by Clerk ID (first match, any organization)
   * @param {string} clerkUserId - Clerk user ID
   * @returns {Promise<Object>} User data
   * @throws {Error} If user not found
   */
  async getUserByClerkId(clerkUserId) {
    const user = await userRepository.findByClerkId(clerkUserId);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Get user by Clerk ID within a specific organization
   * @param {string} clerkUserId - Clerk user ID
   * @param {string} organizationId - Clerk organization ID
   * @returns {Promise<Object>} User data
   * @throws {Error} If user not found
   */
  async getUserByClerkIdAndOrg(clerkUserId, organizationId) {
    const user = await userRepository.findByClerkIdAndOrg(
      clerkUserId,
      organizationId,
    );

    if (!user) {
      throw new Error("User not found in this organization");
    }

    return user;
  }

  /**
   * Get all users in an organization with pagination
   * @param {string} organizationId - Clerk organization ID
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Paginated users data
   */
  async getAllUsers(organizationId, page = 1, limit = 10) {
    const result = await userRepository.findActiveUsers(
      organizationId,
      page,
      limit,
    );

    return {
      users: result.data,
      pagination: result.pagination,
    };
  }

  /**
   * Get users by role within an organization
   * @param {string} organizationId - Clerk organization ID
   * @param {string} role - User role (member, trainer, admin)
   * @returns {Promise<Array>} Users with specified role
   */
  async getUsersByRole(organizationId, role) {
    return await userRepository.findByRole(role, organizationId);
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user not found or validation fails
   */
  async updateUser(userId, updateData) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // If email is being updated, check if it's already taken within the organization
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await userRepository.findOne({
        email: updateData.email,
        clerkOrganizationId: user.clerkOrganizationId,
      });
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new Error("Email is already taken in this organization");
      }
    }

    return await userRepository.update(userId, updateData);
  }

  /**
   * Delete user (soft delete)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message
   * @throws {Error} If user not found
   */
  async deleteUser(userId) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await userRepository.destroy(userId);
    return { message: "User deleted successfully" };
  }

  /**
   * Sync user from Clerk organization membership webhook
   * Creates or updates user based on Clerk data
   * @param {Object} clerkUserData - User data from Clerk
   * @param {string} organizationId - Organization ID from webhook
   * @returns {Promise<Object>} User data
   */
  async syncUserFromClerk(clerkUserData, organizationId) {
    if (!organizationId) {
      throw new Error("Organization ID is required for user sync");
    }

    // Check if user exists in this organization
    const existingUser = await userRepository.findByClerkIdAndOrg(
      clerkUserData.id,
      organizationId,
    );

    if (existingUser) {
      // Update existing user with MongoDB camelCase field names
      return await userRepository.update(existingUser._id, {
        email: clerkUserData.email_addresses?.[0]?.email_address,
        firstName: clerkUserData.first_name,
        lastName: clerkUserData.last_name,
        phone: clerkUserData.phone_numbers?.[0]?.phone_number,
        imageUrl: clerkUserData.image_url,
      });
    } else {
      // Create new user in this organization with MongoDB camelCase field names
      const dbData = {
        clerkUserId: clerkUserData.id,
        clerkOrganizationId: organizationId,
        email: clerkUserData.email_addresses?.[0]?.email_address,
        firstName: clerkUserData.first_name,
        lastName: clerkUserData.last_name,
        phone: clerkUserData.phone_numbers?.[0]?.phone_number,
        imageUrl: clerkUserData.image_url,
        role: "member", // Default role, can be updated later
      };

      return await userRepository.create(dbData);
    }
  }

  /**
   * Add membership plan to user
   * @param {string} userId - User ID
   * @param {Object} membershipData - Membership plan data
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user not found or validation fails
   */
  async addMembershipPlan(userId, membershipData) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Check for overlapping active memberships
    const now = new Date();
    const hasActiveMembership = user.membershipPlans.some(plan =>
      plan.status === 'active' &&
      plan.startDate <= now &&
      plan.endDate >= now
    );

    if (hasActiveMembership && membershipData.status === 'active') {
      throw new Error("User already has an active membership");
    }

    // Add new membership to array
    const updatedPlans = [...user.membershipPlans, membershipData];

    return await userRepository.update(userId, {
      membershipPlans: updatedPlans
    });
  }

  /**
   * Update membership plan in user's array
   * @param {string} userId - User ID
   * @param {string} membershipId - Membership plan ID in array
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user or membership not found
   */
  async updateMembershipPlan(userId, membershipId, updateData) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const planIndex = user.membershipPlans.findIndex(
      plan => plan._id.toString() === membershipId
    );

    if (planIndex === -1) {
      throw new Error("Membership plan not found");
    }

    // Update the specific plan
    user.membershipPlans[planIndex] = {
      ...user.membershipPlans[planIndex],
      ...updateData
    };

    return await userRepository.update(userId, {
      membershipPlans: user.membershipPlans
    });
  }

  /**
   * Remove membership plan from user
   * @param {string} userId - User ID
   * @param {string} membershipId - Membership plan ID in array
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user or membership not found
   */
  async removeMembershipPlan(userId, membershipId) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const updatedPlans = user.membershipPlans.filter(
      plan => plan._id.toString() !== membershipId
    );

    if (updatedPlans.length === user.membershipPlans.length) {
      throw new Error("Membership plan not found");
    }

    return await userRepository.update(userId, {
      membershipPlans: updatedPlans
    });
  }

  /**
   * Add training plan to user
   * @param {string} userId - User ID
   * @param {Object} trainingData - Training plan data
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user not found or validation fails
   */
  async addTrainingPlan(userId, trainingData) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Add new training plan to array
    const updatedPlans = [...user.trainingPlans, trainingData];

    return await userRepository.update(userId, {
      trainingPlans: updatedPlans
    });
  }

  /**
   * Update training plan in user's array
   * @param {string} userId - User ID
   * @param {string} trainingId - Training plan ID in array
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user or training plan not found
   */
  async updateTrainingPlan(userId, trainingId, updateData) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const planIndex = user.trainingPlans.findIndex(
      plan => plan._id.toString() === trainingId
    );

    if (planIndex === -1) {
      throw new Error("Training plan not found");
    }

    // Update the specific plan
    user.trainingPlans[planIndex] = {
      ...user.trainingPlans[planIndex],
      ...updateData
    };

    return await userRepository.update(userId, {
      trainingPlans: user.trainingPlans
    });
  }

  /**
   * Remove training plan from user
   * @param {string} userId - User ID
   * @param {string} trainingId - Training plan ID in array
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user or training plan not found
   */
  async removeTrainingPlan(userId, trainingId) {
    const user = await userRepository.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const updatedPlans = user.trainingPlans.filter(
      plan => plan._id.toString() !== trainingId
    );

    if (updatedPlans.length === user.trainingPlans.length) {
      throw new Error("Training plan not found");
    }

    return await userRepository.update(userId, {
      trainingPlans: updatedPlans
    });
  }
}

module.exports = new UserService();
