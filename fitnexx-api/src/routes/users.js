const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/User");

// GET /users/status
router.get("/status", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid });
  res.json({ profileCompleted: !!(user && user.profileCompleted) });
});

// NEW: GET /users/profile
router.get("/profile", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid }).lean();
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    gender: user.gender,
    age: user.age,
    heightValue: user.heightValue, heightUnit: user.heightUnit,
    weightValue: user.weightValue, weightUnit: user.weightUnit,
    goal: user.goal,
    targetSteps: user.targetSteps,
    profileCompleted: !!user.profileCompleted
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
