const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const Workout = require("../models/WorkoutSession");
const { awardStepsGoal } = require("../services/awards");
// POST /workouts/start  { type?: "run" }
router.post("/start", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const type = (req.body && req.body.type) || "run";
  const now = new Date();

  const active = await Workout.findOne({ uid, status: "active" });
  if (active) return res.status(409).json({ error: "already_active", id: active._id });

  const w = await Workout.create({ uid, type, startAt: now, status: "active" });
  res.json({ ok: true, id: w._id });
});

// PATCH /workouts/appendPoints { id, points: [{t,lat,lng}], distanceKm, steps, calories }
router.patch("/appendPoints", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const { id, points = [], distanceKm = 0, steps = 0, calories = 0 } = req.body || {};
  if (!id) return res.status(400).json({ error: "missing_id" });

  const w = await Workout.findOne({ _id: id, uid, status: "active" });
  if (!w) return res.status(404).json({ error: "not_found_or_finished" });

  // append small batches; keep doc modest
  if (points.length > 0) w.points.push(...points.slice(0, 100));
  w.distanceKm = Math.max(w.distanceKm, distanceKm);
  w.steps = Math.max(w.steps, steps);
  w.calories = Math.max(w.calories, calories);
  await w.save();
  res.json({ ok: true });
});

// POST /workouts/finish { id, durationSec, distanceKm, steps, calories }
router.post("/finish", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const { id, durationSec = 0, distanceKm = 0, steps = 0, calories = 0 } = req.body || {};
  if (!id) return res.status(400).json({ error: "missing_id" });

  const w = await Workout.findOne({ _id: id, uid, status: "active" });
  if (!w) return res.status(404).json({ error: "not_found_or_finished" });

  w.durationSec = Math.max(w.durationSec, durationSec);
  w.distanceKm = Math.max(w.distanceKm, distanceKm);
  w.steps = Math.max(w.steps, steps);
  w.calories = Math.max(w.calories, calories);
  w.endAt = new Date();
  w.status = "finished";
  w.avgSpeedKmh = w.durationSec > 0 ? (w.distanceKm / (w.durationSec / 3600)) : 0;

  await w.save();
  await awardWorkoutFinish(uid, String(w._id), dateKey, w.distanceKm || 0);
  res.json({
    ok: true,
    id: w._id,
    durationSec: w.durationSec,
    distanceKm: w.distanceKm,
    avgSpeedKmh: w.avgSpeedKmh,
    steps: w.steps,
    calories: w.calories
  });
});

// GET /workouts?limit=20
router.get("/", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
  const list = await Workout.find({ uid }).sort({ createdAt: -1 }).limit(limit);
  res.json({
    rows: list.map(w => ({
      id: w._id,
      type: w.type,
      startAt: w.startAt,
      endAt: w.endAt,
      durationSec: w.durationSec,
      distanceKm: w.distanceKm,
      avgSpeedKmh: w.avgSpeedKmh,
      steps: w.steps,
      calories: w.calories,
      status: w.status
    }))
  });
});

module.exports = router;
