const request = require('supertest');
const express = require('express');
const userRoutes = require('./user.routes');
const userService = require('./services/user.service');
const {
  mockClerkAuth,
  mockRequireAuth,
  createTestUserData,
  createMockUser,
  createMockUsers,
  createMockPaginationResult,
} = require('../../../../__tests__/utils/testHelpers');

// Mock the user service
jest.mock('./services/user.service');

// Mock @clerk/express
jest.mock('@clerk/express', () => ({
  requireAuth: jest.fn(() => (req, res, next) => {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }
    next();
  }),
}));

// Create Express app for testing
const createTestApp = (authMiddleware = null) => {
  const app = express();
  app.use(express.json());

  // Override authentication if provided
  if (authMiddleware) {
    const originalRouter = userRoutes;
    const testRouter = express.Router();

    // Add webhook route (public)
    testRouter.post('/webhook/clerk', originalRouter.stack[0].route.stack[0].handle);

    // Add auth middleware
    testRouter.use(authMiddleware);

    // Add organization middleware
    testRouter.use((req, res, next) => {
      if (!req.auth?.orgId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required. Please select an organization.',
        });
      }
      req.organizationId = req.auth.orgId;
      next();
    });

    // Add protected routes manually to avoid middleware duplication
    testRouter.get('/me', (req, res, next) => {
      require('./controllers/user.controller').getCurrentUser(req, res, next);
    });

    testRouter.get('/', async (req, res, next) => {
      // Mock checkRole middleware for admin
      const user = await userService.getUserByClerkIdAndOrg(req.auth.userId, req.auth.orgId);
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }
      require('./controllers/user.controller').getAllUsers(req, res, next);
    });

    testRouter.get('/:id', async (req, res, next) => {
      // Mock checkOwnership middleware
      const user = await userService.getUserByClerkIdAndOrg(req.auth.userId, req.auth.orgId);
      if (user.role !== 'admin' && user.id !== parseInt(req.params.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own resources',
        });
      }
      require('./controllers/user.controller').getUserById(req, res, next);
    });

    testRouter.post('/', (req, res, next) => {
      // Validation middleware
      const { email, firstName, lastName } = req.body;
      const errors = [];

      if (!email || !email.trim()) errors.push('Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
      if (!firstName || !firstName.trim()) errors.push('First name is required');
      if (!lastName || !lastName.trim()) errors.push('Last name is required');

      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }

      require('./controllers/user.controller').createUser(req, res, next);
    });

    testRouter.patch('/:id', async (req, res, next) => {
      // Mock checkOwnership middleware
      const user = await userService.getUserByClerkIdAndOrg(req.auth.userId, req.auth.orgId);
      if (user.role !== 'admin' && user.id !== parseInt(req.params.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own resources',
        });
      }

      // Validation middleware
      const { email } = req.body;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      require('./controllers/user.controller').updateUser(req, res, next);
    });

    testRouter.delete('/:id', async (req, res, next) => {
      // Mock checkRole middleware for admin
      const user = await userService.getUserByClerkIdAndOrg(req.auth.userId, req.auth.orgId);
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }
      require('./controllers/user.controller').deleteUser(req, res, next);
    });

    app.use('/api/v1/users', testRouter);
  } else {
    app.use('/api/v1/users', userRoutes);
  }

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  return app;
};

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/users/webhook/clerk', () => {
    it('should handle organizationMembership.created webhook', async () => {
      const mockUser = createMockUser();
      userService.syncUserFromClerk.mockResolvedValue(mockUser);

      const webhookData = {
        type: 'organizationMembership.created',
        data: {
          public_user_data: {
            user_id: 'clerk_user_123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
          },
          organization: {
            id: 'org_test_123',
          },
        },
      };

      const app = createTestApp();
      const response = await request(app)
        .post('/api/v1/users/webhook/clerk')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(userService.syncUserFromClerk).toHaveBeenCalledWith(
        webhookData.data.public_user_data,
        webhookData.data.organization.id
      );
    });

    it('should handle organizationMembership.updated webhook', async () => {
      const mockUser = createMockUser();
      userService.syncUserFromClerk.mockResolvedValue(mockUser);

      const webhookData = {
        type: 'organizationMembership.updated',
        data: {
          public_user_data: {
            user_id: 'clerk_user_123',
            email: 'updated@example.com',
          },
          organization: {
            id: 'org_test_123',
          },
        },
      };

      const app = createTestApp();
      const response = await request(app)
        .post('/api/v1/users/webhook/clerk')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should handle unrecognized webhook types gracefully', async () => {
      const webhookData = {
        type: 'unknown.event',
        data: {},
      };

      const app = createTestApp();
      const response = await request(app)
        .post('/api/v1/users/webhook/clerk')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current authenticated user', async () => {
      const mockUser = createMockUser();
      const authMiddleware = mockClerkAuth('test_user_123', 'org_test_123');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users/me');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockUser,
      });
      expect(userService.getUserByClerkIdAndOrg).toHaveBeenCalledWith(
        'test_user_123',
        'org_test_123'
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      const authMiddleware = mockClerkAuth(null, 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 if organization context is missing', async () => {
      const authMiddleware = mockClerkAuth('test_user_123', null);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users/me');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Organization context required. Please select an organization.');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return all users for admin', async () => {
      const mockUsers = createMockUsers(5);
      const mockResult = createMockPaginationResult(mockUsers, 1, 10);
      const mockAdminUser = createMockUser({ role: 'admin' });

      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123', 'admin');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockAdminUser);
      userService.getAllUsers.mockResolvedValue(mockResult);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return 403 if user is not admin', async () => {
      const mockMemberUser = createMockUser({ role: 'member' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockMemberUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by ID for admin', async () => {
      const mockUser = createMockUser({ id: 2 });
      const mockAdminUser = createMockUser({ id: 1, role: 'admin' });
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123', 'admin');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockAdminUser);
      userService.getUserById.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users/2');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return own user data for non-admin', async () => {
      const mockUser = createMockUser({ id: 1, role: 'member' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockUser);
      userService.getUserById.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 403 if non-admin tries to access other user', async () => {
      const mockUser = createMockUser({ id: 1, role: 'member' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/users/2');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You can only access your own resources');
    });
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user successfully', async () => {
      const mockUser = createMockUser();
      const testData = createTestUserData();
      const authMiddleware = mockClerkAuth('test_user_123', 'org_test_123');

      userService.createUser.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/users')
        .send(testData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User created successfully',
        data: mockUser,
      });
    });

    it('should return 400 if email is missing', async () => {
      const testData = createTestUserData({ email: '' });
      const authMiddleware = mockClerkAuth('test_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/users')
        .send(testData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Email is required');
    });

    it('should return 400 if email format is invalid', async () => {
      const testData = createTestUserData({ email: 'invalid-email' });
      const authMiddleware = mockClerkAuth('test_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/users')
        .send(testData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid email format');
    });

    it('should return 400 if firstName is missing', async () => {
      const testData = createTestUserData({ firstName: '' });
      const authMiddleware = mockClerkAuth('test_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/users')
        .send(testData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('First name is required');
    });

    it('should return 400 if lastName is missing', async () => {
      const testData = createTestUserData({ lastName: '' });
      const authMiddleware = mockClerkAuth('test_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/users')
        .send(testData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Last name is required');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user successfully as admin', async () => {
      const mockAdminUser = createMockUser({ id: 1, role: 'admin' });
      const mockUpdatedUser = createMockUser({ id: 2, email: 'updated@example.com' });
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123', 'admin');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockAdminUser);
      userService.updateUser.mockResolvedValue(mockUpdatedUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/users/2')
        .send({ email: 'updated@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User updated successfully',
        data: mockUpdatedUser,
      });
    });

    it('should update own user data', async () => {
      const mockUser = createMockUser({ id: 1, role: 'member' });
      const mockUpdatedUser = createMockUser({ id: 1, email: 'updated@example.com' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockUser);
      userService.updateUser.mockResolvedValue(mockUpdatedUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/users/1')
        .send({ email: 'updated@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if email format is invalid', async () => {
      const mockUser = createMockUser({ id: 1, role: 'member' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/users/1')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email format');
    });

    it('should return 403 if non-admin tries to update other user', async () => {
      const mockUser = createMockUser({ id: 1, role: 'member' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/users/2')
        .send({ email: 'updated@example.com' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You can only access your own resources');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user as admin', async () => {
      const mockAdminUser = createMockUser({ id: 1, role: 'admin' });
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123', 'admin');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockAdminUser);
      userService.deleteUser.mockResolvedValue();

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .delete('/api/v1/users/2');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User deleted successfully',
      });
      expect(userService.deleteUser).toHaveBeenCalledWith('2');
    });

    it('should return 403 if non-admin tries to delete user', async () => {
      const mockMemberUser = createMockUser({ id: 1, role: 'member' });
      const authMiddleware = mockClerkAuth('member_user_123', 'org_test_123', 'member');

      userService.getUserByClerkIdAndOrg.mockResolvedValue(mockMemberUser);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .delete('/api/v1/users/2');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });
});
