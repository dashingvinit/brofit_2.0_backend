/**
 * Test helper utilities
 * Provides common functions for mocking authentication and test data
 */

/**
 * Mock Clerk authentication middleware
 * @param {string} userId - Clerk user ID
 * @param {string} orgId - Organization ID
 * @param {string} role - User role (member, trainer, admin)
 */
const mockClerkAuth = (userId = 'test_user_123', orgId = 'org_test_123', role = 'member') => {
  return (req, res, next) => {
    req.auth = {
      userId,
      orgId,
    };
    next();
  };
};

/**
 * Mock requireAuth middleware from @clerk/express
 */
const mockRequireAuth = () => {
  return (req, res, next) => {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }
    next();
  };
};

/**
 * Create test user data
 * @param {Object} overrides - Override default values
 */
const createTestUserData = (overrides = {}) => {
  return {
    clerkUserId: 'test_clerk_user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    profileImageUrl: 'https://example.com/avatar.jpg',
    role: 'member',
    ...overrides,
  };
};

/**
 * Create mock user service responses
 */
const createMockUser = (overrides = {}) => {
  return {
    id: 1,
    clerk_user_id: 'test_clerk_user_123',
    organization_id: 'org_test_123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    profile_image_url: 'https://example.com/avatar.jpg',
    role: 'member',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Create multiple mock users
 */
const createMockUsers = (count = 3) => {
  return Array.from({ length: count }, (_, i) => createMockUser({
    id: i + 1,
    clerk_user_id: `test_clerk_user_${i + 1}`,
    email: `test${i + 1}@example.com`,
    first_name: `User${i + 1}`,
    last_name: `Test${i + 1}`,
  }));
};

/**
 * Create mock pagination result
 */
const createMockPaginationResult = (users, page = 1, limit = 10) => {
  return {
    users,
    pagination: {
      page,
      limit,
      total: users.length,
      totalPages: Math.ceil(users.length / limit),
    },
  };
};

module.exports = {
  mockClerkAuth,
  mockRequireAuth,
  createTestUserData,
  createMockUser,
  createMockUsers,
  createMockPaginationResult,
};
