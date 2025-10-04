const { Schema, model } = require("mongoose");

const WorkoutSchema = new Schema({
  uid: { type: String, index: true, required: true },
  type: { type: String, enum: ["run"], default: "run" },

  // timing
  startAt: { type: Date, required: true },
  endAt: { type: Date },                 // set at finish
  durationSec: { type: Number, default: 0 },

  // metrics
  distanceKm: { type: Number, default: 0 },   // total distance
  avgSpeedKmh: { type: Number, default: 0 },  // distance / hours
  steps: { type: Number, default: 0 },
  calories: { type: Number, default: 0 },

  // status
  status: { type: String, enum: ["active", "finished", "aborted"], default: "active" },

  // optional route storage (keep small)
  points: [{
    t: Number,      // epoch ms
    lat: Number,
    lng: Number
  }]
}, { timestamps: true });

WorkoutSchema.index({ uid: 1, createdAt: -1 });
module.exports = model("WorkoutSession", WorkoutSchema);
