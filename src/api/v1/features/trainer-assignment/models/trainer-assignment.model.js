const mongoose = require('mongoose');

/**
 * Trainer Assignment Schema
 * Manages the assignment of trainers to members within an organization
 * One member can have one active trainer at a time
 */
const trainerAssignmentSchema = new mongoose.Schema({
  organizationId: {
    type: String,
    required: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active',
    index: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
  collection: 'trainer_assignments',
});

// Create compound unique index to ensure a member can only have one active trainer at a time
trainerAssignmentSchema.index(
  { memberId: 1, organizationId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

/**
 * Assignment status
 */
const AssignmentStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMPLETED: 'completed',
};

// Create and export the model
const TrainerAssignment = mongoose.model('TrainerAssignment', trainerAssignmentSchema);

module.exports = {
  TrainerAssignment,
  AssignmentStatus,
};
