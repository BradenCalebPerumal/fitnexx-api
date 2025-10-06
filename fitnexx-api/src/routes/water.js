const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const WaterDaily = require("../models/WaterDaily");
const { awardWater } = require("../services/awards"); // <-- import the correct function

// POST /water/update  { dateKey: "YYYY-MM-DD", ml: number }
// Server keeps the MAX ml for the day to be idempotent (like steps).
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, ml } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || typeof ml !== "number" || ml < 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const uid = req.user.uid;

    // read previous value so awards/streaks can decide transitions
    const existing = await WaterDaily.findOne({ uid, dateKey }).lean();
    const before = existing?.ml ?? 0;

    // upsert with max so the day’s value is monotonic
    const doc = await WaterDaily.findOneAndUpdate(
      { uid, dateKey },
      { $max: { ml }, $setOnInsert: { uid, dateKey } },
      { upsert: true, new: true }
    );

    // award points / streaks (don’t let this fail the request)
    try {
      await awardWater(uid, dateKey, before, doc.ml);
    } catch (e) {
      console.error("awardWater error:", e);
    }

    return res.json({ ok: true, uid, dateKey: doc.dateKey, ml: doc.ml });
  } catch (e) {
    console.error("water/update error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// (Optional) GET /water/range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/range", requireAuth, async (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "Invalid date range" });
  }
  const rows = await WaterDaily.find({
    uid: req.user.uid,
    dateKey: { $gte: from, $lte: to },
  }).sort({ dateKey: 1 });

  res.json({ rows: rows.map(r => ({ dateKey: r.dateKey, ml: r.ml })) });
});

module.exports = router;
