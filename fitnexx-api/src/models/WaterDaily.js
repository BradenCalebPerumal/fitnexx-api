const { Schema, model } = require("mongoose");

const WaterDailySchema = new Schema(
  {
    uid: { type: String, index: true, required: true },
    dateKey: { type: String, required: true }, // YYYY-MM-DD
    ml: { type: Number, default: 0 },
  },
  { timestamps: true }
);

WaterDailySchema.index({ uid: 1, dateKey: 1 }, { unique: true });

module.exports = model("WaterDaily", WaterDailySchema);
