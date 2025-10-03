const mongoose = require("mongoose");

const StepsDailySchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
    steps: { type: Number, default: 0 },
    distanceMeters: { type: Number, default: 0 },
    caloriesKcal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

StepsDailySchema.index({ uid: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("StepsDaily", StepsDailySchema);
