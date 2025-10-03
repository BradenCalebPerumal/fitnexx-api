const { Schema, model } = require("mongoose");

const StepsDailySchema = new Schema(
  {
    uid: { type: String, index: true, required: true },
    dateKey: { type: String, required: true }, // "YYYY-MM-DD" in the user's local TZ
    steps: { type: Number, default: 0 },

    // NEW
    distanceKm: { type: Number, default: 0 },  // derived from steps & height
    calories: { type: Number, default: 0 },    // derived from distance & weight
    source: { type: String, default: "app" },  // optional audit (app/wearable/etc.)
  },
  { timestamps: true }
);

// Ensure one row per user/day
StepsDailySchema.index({ uid: 1, dateKey: 1 }, { unique: true });

module.exports = model("StepsDaily", StepsDailySchema);
