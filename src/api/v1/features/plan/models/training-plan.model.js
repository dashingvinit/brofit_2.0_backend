const mongoose = require("mongoose");

/**
 * Training Plan Schema
 * Defines training plans that gyms can offer to their members
 * This is a reference catalog - actual assignments are stored in user's trainingPlans array
 */
const trainingPlanSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        "weight-training",
        "cardio",
        "yoga",
        "crossfit",
        "personal-training",
        "group-class",
        "other",
      ],
      default: "personal-training",
    },
    durationDays: {
      type: Number,
      min: 1,
    },
    sessionsPerWeek: {
      type: Number,
      min: 1,
      max: 7,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    requiresTrainer: {
      type: Boolean,
      default: true,
    },
    trainer: {
      ref: "User",
      type: mongoose.Schema.Types.ObjectId,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "training_plans",
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Create compound index for unique plan name per organization
trainingPlanSchema.index({ organizationId: 1, name: 1 }, { unique: true });

// Create and export the model
const TrainingPlan = mongoose.model("TrainingPlan", trainingPlanSchema);

module.exports = {
  TrainingPlan,
};
