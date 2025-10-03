const { Schema, model } = require("mongoose");

const WaterDailySchema = new Schema(
  {
    uid: { type: String, index: true, required: true },
    dateKey: { type: String, required: true }, // "YYYY-MM-DD" (client local day)
    ml: { type: Number, default: 0 },          // total water for the day in milliliters
  },
  { timestamps: true }
);

// one row per user/day
WaterDailySchema.index({ uid: 1, dateKey: 1 }, { unique: true });

module.exports = model("WaterDaily", WaterDailySchema);
