const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/User");

// Upsert user after Firebase login
router.post("/login", requireAuth, async (req, res) => {
  const { uid, email, name } = req.user;
  const user = await User.findOneAndUpdate(
    { uid },
    { $setOnInsert: { uid }, $set: { email: email || undefined, displayName: name || undefined } },
    { upsert: true, new: true }
  );
  res.json({ uid: user.uid, profileCompleted: user.profileCompleted });
});

module.exports = router;
