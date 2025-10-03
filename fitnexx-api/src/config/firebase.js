// src/config/firebase.js
const admin = require("firebase-admin");

let cred = null;

// Preferred for Render: paste full JSON into one env var
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}
// Alternative: 3 separate env vars
else if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  cred = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}
// Local dev fallback (keep your file for running on your laptop)
else {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    cred = require("../../serviceAccountKey.json");
    console.warn("[firebase] Using local serviceAccountKey.json");
  } catch {
    console.warn("[firebase] No Firebase Admin credentials provided.");
  }
}

if (!admin.apps.length && cred) {
  admin.initializeApp({ credential: admin.credential.cert(cred) });
}

module.exports = admin;
