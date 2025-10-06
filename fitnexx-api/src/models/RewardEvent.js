// One row = one award (what/when/why)
const { Schema, model } = require("mongoose");

const RewardEventSchema = new Schema({
  uid: { type: String, index: true, required: true },

  // what happened
  type: { type: String, enum: ["water", "steps_goal", "workout_finish"], required: true },
  points: { type: Number, required: true },

  // for dedupe/idempotency across triggers
  // e.g. water: { dateKey }, steps_goal: { dateKey }, workout_finish: { workoutId }
  key: { type: String, required: true, index: true }, // unique per uid+type+key
  meta: { type: Object, default: {} },                // extras (mlDelta, distanceKm, etc)

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

RewardEventSchema.index({ uid: 1, type: 1, key: 1 }, { unique: true });

module.exports = model("RewardEvent", RewardEventSchema);
