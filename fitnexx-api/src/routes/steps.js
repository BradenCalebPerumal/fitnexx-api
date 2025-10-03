const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const StepsDaily = require("../models/StepsDaily");
const User = require("../models/User");

/**
 * Helpers to derive distance & calories if the client doesn't send them.
 * - Step length ~ 0.415*height(m) (men) / 0.413*height(m) (women)
 * - distanceKm = steps * stepLenM / 1000
 * - calories ≈ weightKg * distanceKm * 1.036  (walking rule-of-thumb)
 */
function toMeters(heightValue, heightUnit) {
  if (heightValue == null) return null;
  if (heightUnit === "cm") return heightValue / 100;
  if (heightUnit === "m") return heightValue;
  if (heightUnit === "in") return heightValue * 0.0254;
  if (heightUnit === "ft") return heightValue * 0.3048;
  return null;
}
function toKg(weightValue, weightUnit) {
  if (weightValue == null) return null;
  if (weightUnit === "kg") return weightValue;
  if (weightUnit === "lb" || weightUnit === "lbs") return weightValue * 0.45359237;
  return null;
}

function deriveFromProfile(steps, user) {
  const heightM = toMeters(user?.heightValue, user?.heightUnit);
  const weightKg = toKg(user?.weightValue, user?.weightUnit);

  const k = (user?.gender || "").toLowerCase() === "male" ? 0.415 : 0.413;
  const stepLenM = heightM ? Math.max(0.35, Math.min(0.9, heightM * k)) : null;

  const distanceKm = stepLenM ? (steps * stepLenM) / 1000 : null;

  // If we don't have weight/height, use a safe fallback:
  //   ~0.0008 km/step (~0.8 m/step), and ~0.04 kcal/step.
  const distanceKmFinal = distanceKm ?? (steps * 0.0008);
  const caloriesFinal =
    weightKg != null
      ? weightKg * distanceKmFinal * 1.036
      : steps * 0.04;

  return {
    distanceKm: Number(distanceKmFinal.toFixed(3)),
    calories: Number(caloriesFinal.toFixed(0)),
  };
}

// POST /steps/update  { dateKey:"YYYY-MM-DD", steps:Number, distanceKm?:Number, calories?:Number }
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, steps, distanceKm, calories } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || typeof steps !== "number") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const uid = req.user.uid;

    // Compute distance/calories from profile if not provided
    let dist = typeof distanceKm === "number" ? distanceKm : null;
    let cals = typeof calories === "number" ? calories : null;

    if (dist == null || cals == null) {
      const user = await User.findOne({ uid }).lean();
      const derived = deriveFromProfile(steps, user);
      if (dist == null) dist = derived.distanceKm;
      if (cals == null) cals = derived.calories;
    }

    // Monotonic upsert: keep maximum values through the day
    const doc = await StepsDaily.findOneAndUpdate(
      { uid, dateKey },
      {
        $setOnInsert: { uid, dateKey, steps, distanceKm: dist, calories: cals, source: "app" },
        $max: { steps, distanceKm: dist, calories: cals },
      },
      { upsert: true, new: true }
    );

    return res.json({
      ok: true,
      uid,
      dateKey: doc.dateKey,
      steps: doc.steps,
      distanceKm: doc.distanceKm,
      calories: doc.calories,
    });
  } catch (e) {
    console.error("steps/update error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /steps/today  -> { goal: number, today?: { dateKey, steps, distanceKm, calories } }
router.get("/today", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const user = await User.findOne({ uid }).lean();
  const goal = user?.targetSteps || 10000;

  // Return the latest row for this user (today if a snapshot exists).
  const row = await StepsDaily.findOne({ uid }).sort({ dateKey: -1 }).lean();

  const today = row
    ? {
        dateKey: row.dateKey,
        steps: row.steps || 0,
        distanceKm: row.distanceKm || 0,
        calories: row.calories || 0,
      }
    : undefined;

  res.json({ goal, today });
});

module.exports = router;
