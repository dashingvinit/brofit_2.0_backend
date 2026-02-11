const mongoose = require('mongoose');

/**
 * User Membership Schema
 * Represents individual membership instances assigned to users
 * Maintains complete history of all memberships
 */
const userMembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  membershipPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    required: true,
    index: true,
  },
  organizationId: {
    type: String,
    required: true,
    index: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'suspended'],
    default: 'active',
    index: true,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  amountPaid: {
    type: Number,
    min: 0,
  },
  paymentReference: {
    type: String,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
  collection: 'user_memberships',
  toJSON: {
    virtuals: true,
    transform: function (_doc, ret) {
      ret.id = ret._id.toString();
      ret.userId = ret.userId.toString();
      ret.membershipPlanId = ret.membershipPlanId.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: function (_doc, ret) {
      ret.id = ret._id.toString();
      ret.userId = ret.userId.toString();
      ret.membershipPlanId = ret.membershipPlanId.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Validation to ensure end date is after start date
userMembershipSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Create compound index for date-based queries
userMembershipSchema.index({ startDate: 1, endDate: 1 });

/**
 * Membership status values
 */
const MembershipStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
};

// Create and export the model
const UserMembership = mongoose.model('UserMembership', userMembershipSchema);

module.exports = {
  UserMembership,
  MembershipStatus,
};
