const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const BmiDaily = require("../models/BmiDaily");

// POST /metrics/bmi/update  { dateKey: "YYYY-MM-DD", bmi: number }
router.post("/bmi/update", requireAuth, async (req, res) => {
  try {
    const { dateKey, bmi } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || typeof bmi !== "number") {
      return res.status(400).json({ error: "invalid_payload" });
    }
    const uid = req.user.uid;
    await BmiDaily.findOneAndUpdate(
      { uid, dateKey },
      { $set: { bmi }, $setOnInsert: { uid, dateKey } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("metrics/bmi/update error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
