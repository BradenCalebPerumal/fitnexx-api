// routes/users.js
const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/User");

// --- helpers ----------------------------------------------------
function toNumber(n, def = null) {
  const x = Number(n);
  return Number.isFinite(x) ? x : def;
}

function cmFrom(heightValue, heightUnit) {
  const v = toNumber(heightValue);
  if (v == null) return null;
  switch ((heightUnit || "").toLowerCase()) {
    case "cm": return v;
    case "m": return v * 100;
    case "ft": return v * 30.48;      // if value is total feet (no inches)
    case "in": return v * 2.54;
    default: return null;
  }
}

function kgFrom(weightValue, weightUnit) {
  const v = toNumber(weightValue);
  if (v == null) return null;
  switch ((weightUnit || "").toLowerCase()) {
    case "kg": return v;
    case "lb":
    case "lbs": return v * 0.45359237;
    default: return null;
  }
}

function estimateStrideMeters(heightCm, gender) {
  if (!heightCm) return null;
  const h = heightCm / 100; // meters
  // Common approximations: ~0.413 (men) / ~0.415 (women) * height
  const k = (gender || "").toLowerCase() === "female" ? 0.415 : 0.413;
  return h * k;
}

// --- routes -----------------------------------------------------

// GET /users/status  (kept as-is)
router.get("/status", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid });
  res.json({ profileCompleted: !!(user && user.profileCompleted) });
});

// NEW: GET /users/profile  -> normalize & return what the app needs
router.get("/profile", requireAuth, async (req, res) => {
  const u = await User.findOne({ uid: req.user.uid }).lean();

  if (!u) {
    // return sane defaults if no profile yet
    return res.json({
      goal: 10000,
      heightCm: null,
      weightKg: null,
      sex: null,
      strideMeters: null,
    });
  }

  const goal =
    toNumber(u.goal) ??
    toNumber(u.targetSteps) ??
    10000;

  const heightCm = cmFrom(u.heightValue, u.heightUnit);
  const weightKg = kgFrom(u.weightValue, u.weightUnit);
  const sex = u.gender || null;

  // If you later store a custom stride, include it on the User and prefer it here.
  const strideMeters = u.strideMeters != null
    ? toNumber(u.strideMeters)
    : estimateStrideMeters(heightCm, sex);

  res.json({
    goal,
    heightCm,
    weightKg,
    sex,
    strideMeters,
  });
});

// POST /users/profile  (kept as-is)
router.post("/profile", requireAuth, async (req, res) => {
  const {
    gender,
    age,
    heightValue, heightUnit,
    weightValue, weightUnit,
    goal,
    targetSteps,
  } = req.body;

  const updated = await User.findOneAndUpdate(
    { uid: req.user.uid },
    {
      $set: {
        gender, age,
        heightValue, heightUnit,
        weightValue, weightUnit,
        goal, targetSteps,
        profileCompleted: true,
      },
    },
    { upsert: true, new: true }
  );

  res.json({ ok: true, profileCompleted: updated.profileCompleted });
});

module.exports = router;
