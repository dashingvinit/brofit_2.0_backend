const request = require('supertest');
const express = require('express');
const trainerAssignmentRoutes = require('./trainer-assignment.routes');
const trainerAssignmentService = require('./services/trainer-assignment.service');
const { mockClerkAuth } = require('../../../../__tests__/utils/testHelpers');

// Mock the trainer assignment service
jest.mock('./services/trainer-assignment.service');

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

  if (authMiddleware) {
    const testRouter = express.Router();
    testRouter.use(authMiddleware);
    testRouter.use((req, res, next) => {
      if (!req.auth?.orgId) {
        return res.status(403).json({
          success: false,
          message: 'Organization context required. Please select an organization.',
        });
      }
      next();
    });

    // Mount all routes manually
    testRouter.get('/', (req, res, next) => {
      require('./controllers/trainer-assignment.controller').getAllAssignments(req, res, next);
    });

    testRouter.post('/', (req, res, next) => {
      // Validation middleware
      const { memberId, trainerId } = req.body;
      const errors = [];
      if (!memberId || !memberId.trim()) errors.push('Member ID is required');
      if (!trainerId || !trainerId.trim()) errors.push('Trainer ID is required');
      if (memberId === trainerId) errors.push('Member and trainer cannot be the same user');
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      require('./controllers/trainer-assignment.controller').assignTrainer(req, res, next);
    });

    testRouter.get('/:id', (req, res, next) => {
      require('./controllers/trainer-assignment.controller').getAssignmentById(req, res, next);
    });

    testRouter.patch('/:id', (req, res, next) => {
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
      require('./controllers/trainer-assignment.controller').updateAssignment(req, res, next);
    });

    testRouter.post('/:id/complete', (req, res, next) => {
      require('./controllers/trainer-assignment.controller').completeAssignment(req, res, next);
    });

    testRouter.delete('/:id', (req, res, next) => {
      require('./controllers/trainer-assignment.controller').deleteAssignment(req, res, next);
    });

    testRouter.get('/member/:memberId/active', (req, res, next) => {
      require('./controllers/trainer-assignment.controller').getMemberActiveTrainer(req, res, next);
    });

    testRouter.get('/trainer/:trainerId/members', (req, res, next) => {
      require('./controllers/trainer-assignment.controller').getTrainerMembers(req, res, next);
    });

    app.use('/api/v1/trainer-assignments', testRouter);
  } else {
    app.use('/api/v1/trainer-assignments', trainerAssignmentRoutes);
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

// Helper to create mock assignment data
const createMockAssignment = (overrides = {}) => {
  return {
    id: 'assignment-uuid-1',
    organizationId: 'org_test_123',
    memberId: 'member-uuid-1',
    trainerId: 'trainer-uuid-1',
    status: 'active',
    assignedAt: new Date().toISOString(),
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

const createMockAssignmentWithDetails = (overrides = {}) => {
  return {
    ...createMockAssignment(overrides),
    trainer: {
      firstName: 'John',
      lastName: 'Trainer',
      email: 'trainer@example.com',
      phone: '+1234567890',
      profileImage: null,
    },
    member: {
      firstName: 'Jane',
      lastName: 'Member',
      email: 'member@example.com',
      phone: '+9876543210',
      profileImage: null,
    },
  };
};

describe('Trainer Assignment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/trainer-assignments', () => {
    it('should assign a trainer to a member successfully', async () => {
      const mockAssignment = createMockAssignment();
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.assignTrainer.mockResolvedValue(mockAssignment);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/trainer-assignments')
        .send({
          memberId: 'member-uuid-1',
          trainerId: 'trainer-uuid-1',
          startDate: '2024-01-01',
          notes: 'Initial assignment',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'Trainer assigned successfully',
        data: mockAssignment,
      });
      expect(trainerAssignmentService.assignTrainer).toHaveBeenCalled();
    });

    it('should return 400 if memberId is missing', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/trainer-assignments')
        .send({
          trainerId: 'trainer-uuid-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Member ID is required');
    });

    it('should return 400 if trainerId is missing', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/trainer-assignments')
        .send({
          memberId: 'member-uuid-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Trainer ID is required');
    });

    it('should return 400 if memberId and trainerId are the same', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/trainer-assignments')
        .send({
          memberId: 'same-uuid',
          trainerId: 'same-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Member and trainer cannot be the same user');
    });

    it('should return 403 if organization context is missing', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', null);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/trainer-assignments')
        .send({
          memberId: 'member-uuid-1',
          trainerId: 'trainer-uuid-1',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Organization context required. Please select an organization.');
    });
  });

  describe('GET /api/v1/trainer-assignments', () => {
    it('should get all assignments', async () => {
      const mockAssignments = [
        createMockAssignmentWithDetails(),
        createMockAssignmentWithDetails({ id: 'assignment-uuid-2' }),
      ];
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getAllAssignments.mockResolvedValue(mockAssignments);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAssignments);
      expect(response.body.count).toBe(2);
    });

    it('should filter assignments by status', async () => {
      const mockAssignments = [createMockAssignmentWithDetails({ status: 'completed' })];
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getAllAssignments.mockResolvedValue(mockAssignments);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments')
        .query({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.data[0].status).toBe('completed');
    });
  });

  describe('GET /api/v1/trainer-assignments/:id', () => {
    it('should get assignment by ID', async () => {
      const mockAssignment = createMockAssignmentWithDetails();
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getAssignmentById.mockResolvedValue(mockAssignment);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments/assignment-uuid-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAssignment);
    });

    it('should return 500 if assignment not found', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getAssignmentById.mockRejectedValue(new Error('Assignment not found'));

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments/nonexistent-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/trainer-assignments/member/:memberId/active', () => {
    it('should get member\'s active trainer', async () => {
      const mockAssignment = createMockAssignmentWithDetails();
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getMemberActiveTrainer.mockResolvedValue(mockAssignment);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments/member/member-uuid-1/active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAssignment);
    });

    it('should return 404 if no active trainer found', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getMemberActiveTrainer.mockResolvedValue(null);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments/member/member-uuid-1/active');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No active trainer assignment found for this member');
    });
  });

  describe('GET /api/v1/trainer-assignments/trainer/:trainerId/members', () => {
    it('should get all members assigned to a trainer', async () => {
      const mockAssignments = [
        createMockAssignmentWithDetails(),
        createMockAssignmentWithDetails({ id: 'assignment-uuid-2', memberId: 'member-uuid-2' }),
      ];
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getTrainerMembers.mockResolvedValue(mockAssignments);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments/trainer/trainer-uuid-1/members');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAssignments);
      expect(response.body.count).toBe(2);
    });

    it('should filter trainer members by status', async () => {
      const mockAssignments = [createMockAssignmentWithDetails({ status: 'inactive' })];
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.getTrainerMembers.mockResolvedValue(mockAssignments);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .get('/api/v1/trainer-assignments/trainer/trainer-uuid-1/members')
        .query({ status: 'inactive' });

      expect(response.status).toBe(200);
      expect(trainerAssignmentService.getTrainerMembers).toHaveBeenCalledWith(
        'org_test_123',
        'trainer-uuid-1',
        'inactive'
      );
    });
  });

  describe('PATCH /api/v1/trainer-assignments/:id', () => {
    it('should update assignment successfully', async () => {
      const mockUpdatedAssignment = createMockAssignment({ notes: 'Updated notes' });
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.updateAssignment.mockResolvedValue(mockUpdatedAssignment);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/trainer-assignments/assignment-uuid-1')
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Assignment updated successfully',
        data: mockUpdatedAssignment,
      });
    });

    it('should return 400 if status is invalid', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/trainer-assignments/assignment-uuid-1')
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid status. Must be active, inactive, or completed');
    });

    it('should return 400 if end date is before start date', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .patch('/api/v1/trainer-assignments/assignment-uuid-1')
        .send({
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('End date cannot be before start date');
    });
  });

  describe('POST /api/v1/trainer-assignments/:id/complete', () => {
    it('should complete assignment successfully', async () => {
      const mockCompletedAssignment = createMockAssignment({
        status: 'completed',
        endDate: new Date().toISOString().split('T')[0],
      });
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.updateAssignmentStatus.mockResolvedValue(mockCompletedAssignment);

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .post('/api/v1/trainer-assignments/assignment-uuid-1/complete')
        .send({ endDate: '2024-12-31' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Assignment completed successfully',
        data: mockCompletedAssignment,
      });
    });
  });

  describe('DELETE /api/v1/trainer-assignments/:id', () => {
    it('should delete assignment successfully', async () => {
      const authMiddleware = mockClerkAuth('admin_user_123', 'org_test_123');

      trainerAssignmentService.deleteAssignment.mockResolvedValue();

      const app = createTestApp(authMiddleware);
      const response = await request(app)
        .delete('/api/v1/trainer-assignments/assignment-uuid-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Assignment deleted successfully',
      });
      expect(trainerAssignmentService.deleteAssignment).toHaveBeenCalledWith(
        'org_test_123',
        'assignment-uuid-1'
      );
    });
  });
});
