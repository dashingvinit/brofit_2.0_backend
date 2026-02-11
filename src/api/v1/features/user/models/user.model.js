const mongoose = require("mongoose");

/**
 * Membership Plan Schema (embedded in user)
 */
const userMembershipSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    required: true,
  },
  planName: {
    type: String,
    required: true,
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
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
  },
  amountPaid: {
    type: Number,
    min: 0,
  },
  paymentReference: {
    type: String,
  },
}, { _id: true, timestamps: true });

/**
 * Training Plan Schema (embedded in user)
 */
const userTrainingSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingPlan',
  },
  planName: {
    type: String,
    required: true,
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  trainerName: {
    type: String,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  sessionsPerWeek: {
    type: Number,
    min: 1,
  },
  notes: {
    type: String,
  },
}, { _id: true, timestamps: true });

/**
 * User Schema
 * Defines the structure and validation for user data
 * Uses Clerk organizations - each gym is an organization
 */
const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: false, // Optional - only for users who authenticate through Clerk
      sparse: true, // Allow null/undefined values, only enforce uniqueness when present
      index: true,
    },
    clerkOrganizationId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["member", "trainer", "admin"],
      default: "member",
      index: true,
    },
    imageUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    membershipPlans: [userMembershipSchema],
    trainingPlans: [userTrainingSchema],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "users",
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Create compound index for unique user per organization (sparse to allow null clerkUserId)
userSchema.index(
  { clerkUserId: 1, clerkOrganizationId: 1 },
  { unique: true, sparse: true },
);

// Ensure email is unique within an organization
userSchema.index({ email: 1, clerkOrganizationId: 1 }, { unique: true });

// Virtual for active membership
userSchema.virtual('activeMembership').get(function() {
  const now = new Date();
  return this.membershipPlans.find(plan =>
    plan.status === 'active' &&
    plan.startDate <= now &&
    plan.endDate >= now
  );
});

// Virtual for active training plans
userSchema.virtual('activeTrainingPlans').get(function() {
  return this.trainingPlans.filter(plan => plan.status === 'active');
});

/**
 * User roles within a gym/organization
 */
const UserRole = {
  MEMBER: "member", // Regular gym member
  TRAINER: "trainer", // Gym trainer/instructor
  ADMIN: "admin", // Gym administrator/owner
};

/**
 * Membership status values
 */
const MembershipStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

/**
 * Training status values
 */
const TrainingStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Create and export the model
const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  UserRole,
  MembershipStatus,
  TrainingStatus,
};
