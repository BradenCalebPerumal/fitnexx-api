const { Schema, model } = require("mongoose");
const BadgeGrantSchema = new Schema({
  uid: { type: String, index: true, required: true },
  badge: { type: String, required: true },      // e.g. "hydration_3", "walker_7", "runner_1"
  earnedAt: { type: Date, default: Date.now }
}, { timestamps: true });

BadgeGrantSchema.index({ uid:1, badge:1 }, { unique: true });
module.exports = model("BadgeGrant", BadgeGrantSchema);
