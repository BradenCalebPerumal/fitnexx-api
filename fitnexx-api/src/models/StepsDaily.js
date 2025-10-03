const { Schema, model } = require("mongoose");

const StepsDailySchema = new Schema(
  {
    uid: { type: String, index: true, required: true },
    dateKey: { type: String, required: true }, // "YYYY-MM-DD" (client local date)
    steps: { type: Number, default: 0 },

    // NEW
    distanceKm: { type: Number, default: 0 }, // derived
    calories:   { type: Number, default: 0 }  // derived
  },
  { timestamps: true }
);

// Ensure one row per user/day
StepsDailySchema.index({ uid: 1, dateKey: 1 }, { unique: true });

module.exports = model("StepsDaily", StepsDailySchema);
