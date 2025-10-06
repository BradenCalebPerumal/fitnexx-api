const { Schema, model } = require("mongoose");

const StreakSchema = new Schema({
  uid: { type: String, index: true, required: true },

  // Per-track streaks
  water:       { current: {type:Number,default:0}, best:{type:Number,default:0}, lastDateKey:{type:String,default:null} },
  steps_goal:  { current: {type:Number,default:0}, best:{type:Number,default:0}, lastDateKey:{type:String,default:null} },
  workout:     { current: {type:Number,default:0}, best:{type:Number,default:0}, lastDateKey:{type:String,default:null} },

  // aggregate points for fast header render
  pointsTotal: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = model("StreakState", StreakSchema);
