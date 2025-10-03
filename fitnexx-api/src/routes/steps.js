// routes/steps.js
const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const StepsDaily = require("../models/StepsDaily");
const User = require("../models/User"); // must point to your users collection

// Helpers
function toDateKey(date = new Date(), tz = "UTC") {
  // Robust YYYY-MM-DD in a specific timezone using only built-ins
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

// ---------- NEW: GET /steps/today ----------
router.get("/today", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tz = req.get("X-TZ") || req.query.tz || "UTC";
    const dateKey = toDateKey(new Date(), tz);

    const [row, user] = await Promise.all([
      StepsDaily.findOne({ uid, dateKey }),
      // read targetSteps; keep stepGoal as legacy fallback
      User.findOne({ uid }, { targetSteps: 1, stepGoal: 1 }),
    ]);

    const goal =
      typeof user?.targetSteps === "number"
        ? user.targetSteps
        : typeof user?.stepGoal === "number"
        ? user.stepGoal
        : 8000;

    res.set("Cache-Control", "no-store");
    return res.json({
      dateKey,
      lastSaved: row?.steps ?? 0,
      goal,
    });
  } catch (e) {
    console.error("steps/today error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- POST /steps/update ----------
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, steps } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({ error: "Invalid dateKey" });
    }
    const nSteps = Number(steps);
    if (!Number.isFinite(nSteps) || nSteps < 0) {
      return res.status(400).json({ error: "Invalid steps" });
    }

    const uid = req.user.uid;

    // Upsert & keep the MAX steps for that day
    const doc = await StepsDaily.findOneAndUpdate(
      { uid, dateKey },
      { $max: { steps: nSteps }, $setOnInsert: { uid, dateKey } },
      { upsert: true, new: true }
    );

    res.set("Cache-Control", "no-store");
    return res.json({ ok: true, uid, dateKey: doc.dateKey, steps: doc.steps });
  } catch (e) {
    console.error("steps/update error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- GET /steps/range?from=YYYY-MM-DD&to=YYYY-MM-DD ----------
router.get("/range", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)
    ) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const uid = req.user.uid;
    const rows = await StepsDaily.find({
      uid,
      dateKey: { $gte: from, $lte: to },
    }).sort({ dateKey: 1 });

    res.set("Cache-Control", "no-store");
    return res.json({
      rows: rows.map((r) => ({ dateKey: r.dateKey, steps: r.steps })),
    });
  } catch (e) {
    console.error("steps/range error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
