const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const RewardEvent = require("../models/RewardEvent");
const StreakState = require("../models/StreakState");
const BadgeGrant  = require("../models/BadgeGrant");

// Summary (header): pointsTotal + streaks + latest 3 badges
router.get("/summary", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const s = await StreakState.findOne({ uid }).lean();
  const badges = await BadgeGrant.find({ uid }).sort({ createdAt:-1 }).limit(3).lean();
  res.json({
    pointsTotal: s?.pointsTotal || 0,
    streaks: {
      water: s?.water || { current:0, best:0 },
      steps_goal: s?.steps_goal || { current:0, best:0 },
      workout: s?.workout || { current:0, best:0 }
    },
    recentBadges: badges.map(b => ({ id: b.badge, earnedAt: b.createdAt }))
  });
});

// Full history (paginate)
router.get("/history", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const limit = Math.min(parseInt(req.query.limit||"50",10), 100);
  const rows = await RewardEvent.find({ uid }).sort({ createdAt:-1 }).limit(limit).lean();
  res.json({
    rows: rows.map(r => ({
      id: String(r._id),
      type: r.type,
      points: r.points,
      key: r.key,
      meta: r.meta,
      createdAt: r.createdAt
    }))
  });
});

// All badges
router.get("/badges", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const rows = await BadgeGrant.find({ uid }).sort({ createdAt:-1 }).lean();
  res.json({ rows: rows.map(b => ({ id: b.badge, earnedAt: b.createdAt })) });
});

module.exports = router;
