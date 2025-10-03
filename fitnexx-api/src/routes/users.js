const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/User");

// GET /users/status  -> { profileCompleted: boolean }
router.get("/status", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid }).lean();
  res.json({ profileCompleted: !!(user && user.profileCompleted) });
});

// NEW: GET /users/profile  -> return the stored profile
router.get("/profile", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid }).lean();
  if (!user) return res.status(404).json({ error: "not_found" });
  // Return only what the app needs
  const {
    gender,
    age,
    heightValue, heightUnit,
    weightValue, weightUnit,
    goal,
    targetSteps,
    profileCompleted
  } = user || {};
  res.json({
    gender, age,
    heightValue, heightUnit,
    weightValue, weightUnit,
    goal, targetSteps,
    profileCompleted: !!profileCompleted
  });
});

// POST /users/profile (unchanged)
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
