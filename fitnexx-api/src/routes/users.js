const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/User");

// GET /users/status
router.get("/status", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid });
  res.json({ profileCompleted: !!(user && user.profileCompleted) });
});

// POST /users/profile
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
