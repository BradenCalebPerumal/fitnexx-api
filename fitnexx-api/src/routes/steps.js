const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const StepsDaily = require("../models/StepsDaily");
const User = require("../models/User");
const { awardStepsGoal } = require("../services/awards");
// helpers
function cmToMeters(v, unit) { return unit === "cm" ? (v || 0) / 100 : (v || 0); }
function kgFrom(v, unit) {
  if (v == null) return 0;
  return unit === "kg" ? v : v * 0.45359237;
}
function strideMeters(heightMeters, gender) {
  // very common approximation: 0.413 (female) / 0.415 (male) * height
  const h = heightMeters || 1.7;
  const k = gender === "female" ? 0.413 : 0.415;
  return h * k;
}
function caloriesFrom(steps, weightKg) {
  // simple, weight-scaled per-step estimate
  // ~0.0005 * weightKg kcal per step (≈350 kcal for 10k steps @70kg)
  const w = weightKg || 70;
  return steps * w * 0.0005;
}
// POST /steps/update {dateKey, steps}
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, steps } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || typeof steps !== "number") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const uid = req.user.uid;

    // Load user profile (for derived metrics)
    const u = await User.findOne({ uid }).lean();

    const heightM = cmToMeters(u?.heightValue, u?.heightUnit || "cm");
    const weightKg = kgFrom(u?.weightValue, u?.weightUnit || "kg");
    const strideM = strideMeters(heightM, u?.gender);

    // Keep the MAX steps for the day
    const existing = await StepsDaily.findOne({ uid, dateKey }).lean();
    const prevSteps = existing?.steps || 0;             // <-- define this
    const newSteps = Math.max(steps, prevSteps);

    const distanceKm = (newSteps * strideM) / 1000; // km
    const calories = caloriesFrom(newSteps, weightKg);

    const doc = await StepsDaily.findOneAndUpdate(
      { uid, dateKey },
      {
        $set: {
          uid, dateKey,
          steps: newSteps,
          distanceKm: Number(distanceKm.toFixed(3)),
          calories: Number(calories.toFixed(0))
        }
      },
      { upsert: true, new: true }
    );

    // Gamification: award once when the goal is first reached today
    const goal = u?.targetSteps || 10000;
    if (prevSteps < goal && doc.steps >= goal) {
      try {
        await awardStepsGoal(uid, dateKey);
      } catch (e) {
        console.error("awardStepsGoal error:", e);
      }
    }

    return res.json({
      ok: true,
      uid,
      dateKey: doc.dateKey,
      steps: doc.steps,
      distanceKm: doc.distanceKm,
      calories: doc.calories
    });
  } catch (e) {
    console.error("steps/update error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});


// (Optional) GET /steps/range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/range", requireAuth, async (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "Invalid date range" });
  }
  const rows = await StepsDaily.find({
    uid: req.user.uid,
    dateKey: { $gte: from, $lte: to },
  }).sort({ dateKey: 1 });

  res.json({
    rows: rows.map(r => ({
      dateKey: r.dateKey,
      steps: r.steps,
      distanceKm: r.distanceKm || 0,
      calories: r.calories || 0
    }))
  });
});

// NEW: GET /steps/today?dateKey=YYYY-MM-DD (dateKey optional; returns goal always)
router.get("/today", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const user = await User.findOne({ uid }).lean();
  const goal = user?.targetSteps || 10000;

  const { dateKey } = req.query;
  let today = null;
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const r = await StepsDaily.findOne({ uid, dateKey }).lean();
    if (r) {
      today = {
        dateKey: r.dateKey,
        steps: r.steps,
        distanceKm: r.distanceKm || 0,
        calories: r.calories || 0
      };
    }
  }
  res.json({ goal, today });
});

module.exports = router;
