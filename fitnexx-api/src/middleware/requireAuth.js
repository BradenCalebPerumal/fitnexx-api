const admin = require("../config/firebase");

module.exports = async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;           // uid, email, name...
    next();
  } catch (e) {
    console.error("verifyIdToken error:", e.message);
    res.status(401).json({ error: "Invalid token" });
  }
};
