const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const StepsDaily = require("../models/StepsDaily");
const User = require("../models/User"); // make sure this matches your model name

function estimateStrideMeters(profile) {
  if (profile?.strideMeters) return Number(profile.strideMeters);

  const heightM = (Number(profile?.heightCm) || 0) / 100;
  const sex = String(profile?.sex || "").toLowerCase();

  if (heightM > 0) {
    // Common heuristics: male ~0.415*height, female ~0.413*height (in meters)
    const factor =
      sex === "male" || sex === "m"
        ? 0.415
        : sex === "female" || sex === "f"
        ? 0.413
        : 0.414;
    return heightM * factor;
  }

  // fallback ~0.762m (76.2cm) if no profile height
  return 0.762;
}

function estimateCaloriesKcal(profile, steps, distanceMeters) {
  const weightKg = Number(profile?.weightKg) || 0;
  const distanceKm = distanceMeters / 1000;

  if (weightKg > 0 && distanceKm > 0) {
    // Walking energy ≈ 0.53 kcal per kg per km (typical flat walk estimate)
    return Math.round(weightKg * distanceKm * 0.53);
  }

  // fallback per-step estimate (~0.04 kcal/step)
  return Math.round(steps * 0.04);
}

// POST /steps/update  { dateKey: "YYYY-MM-DD", steps: number }
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, steps } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || typeof steps !== "number") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const uid = req.user.uid;

    // Load profile to derive distance & calories
    const profile =
      (await User.findOne({ uid }).lean()) ||
      (await User.findOne({ firebaseUid: uid }).lean()) ||
      {};

    const strideMeters = estimateStrideMeters(profile);
    const distanceMeters = Math.round(steps * strideMeters);
    const caloriesKcal = estimateCaloriesKcal(profile, steps, distanceMeters);

    // Upsert & keep the max of the day’s totals
    const doc = await StepsDaily.findOneAndUpdate(
      { uid, dateKey },
      {
        $max: { steps, distanceMeters, caloriesKcal },
        $setOnInsert: { uid, dateKey },
      },
      { upsert: true, new: true }
    );

    return res.json({
      ok: true,
      uid,
      dateKey: doc.dateKey,
      steps: doc.steps,
      distanceMeters: doc.distanceMeters,
      caloriesKcal: doc.caloriesKcal,
    });
  } catch (e) {
    console.error("steps/update error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /steps/range?from=YYYY-MM-DD&to=YYYY-MM-DD
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
    rows: rows.map((r) => ({
      dateKey: r.dateKey,
      steps: r.steps,
      distanceMeters: r.distanceMeters || 0,
      caloriesKcal: r.caloriesKcal || 0,
    })),
  });
});

// (Optional) GET /steps/today — handy for the Home screen
router.get("/today", requireAuth, async (req, res) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const row =
    (await StepsDaily.findOne({
      uid: req.user.uid,
      dateKey: todayKey,
    })) || {};
  res.json({
    dateKey: todayKey,
    steps: row.steps || 0,
    distanceMeters: row.distanceMeters || 0,
    caloriesKcal: row.caloriesKcal || 0,
  });
});

module.exports = router;
