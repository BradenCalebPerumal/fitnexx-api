const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const StepsDaily = require("../models/StepsDaily");

// POST /steps/update  { dateKey: "YYYY-MM-DD", steps: number }
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, steps } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || typeof steps !== "number") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const uid = req.user.uid;

    // Upsert & keep the max steps for that day
    const doc = await StepsDaily.findOneAndUpdate(
      { uid, dateKey },
      { $max: { steps }, $setOnInsert: { uid, dateKey } },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, uid, dateKey: doc.dateKey, steps: doc.steps });
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

  res.json({ rows: rows.map(r => ({ dateKey: r.dateKey, steps: r.steps })) });
});

module.exports = router;
