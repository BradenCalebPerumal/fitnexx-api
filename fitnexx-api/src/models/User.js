const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    uid: { type: String, unique: true, index: true, required: true },
    email: String,
    displayName: String,

    // profile wizard
    gender: String,
    age: Number,
    heightValue: Number,
    heightUnit: { type: String, default: "cm" },
    weightValue: Number,
    weightUnit: { type: String, default: "kg" },
    goal: { type: String, enum: ["lose_weight", "build_muscle", "maintain"], default: "maintain" },
    targetSteps: { type: Number, default: 10000 },

    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("User", UserSchema);
