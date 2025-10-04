const { Schema, model } = require("mongoose");

const BmiDailySchema = new Schema(
  {
    uid: { type: String, index: true, required: true },
    dateKey: { type: String, required: true }, // YYYY-MM-DD (client TZ)
    bmi: { type: Number, required: true },
  },
  { timestamps: true }
);

BmiDailySchema.index({ uid: 1, dateKey: 1 }, { unique: true });

module.exports = model("BmiDaily", BmiDailySchema);
