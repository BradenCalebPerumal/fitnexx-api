// src/middleware/requireAuth.js
const admin = require("../config/firebase");

module.exports = async function requireAuth(req, res, next) {
  try {
    const auth = (req.headers.authorization || "").trim();
    const [scheme, raw] = auth.split(/\s+/);
    if (scheme !== "Bearer" || !raw) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    // TEMP: print token claims to Render logs (aud/iss/user_id)
    try {
      const payload = JSON.parse(Buffer.from(raw.split(".")[1], "base64").toString("utf8"));
      console.log("token aud:", payload.aud, "iss:", payload.iss, "uid:", payload.user_id);
    } catch {}

    const decoded = await admin.auth().verifyIdToken(raw);
    req.user = { uid: decoded.uid, email: decoded.email };
    return next();
  } catch (e) {
    // Log firebase admin error info
    console.error("verifyIdToken error:", e.code || e.name, e.message);
    return res.status(401).json({ error: "Unauthorized", code: e.code || "verify_failed" });
  }
};
