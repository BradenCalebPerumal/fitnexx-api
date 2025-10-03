// src/config/firebase.js
const admin = require("firebase-admin");

try {
  if (!admin.apps.length) {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Paste the **entire** service account JSON into this env var
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(sa);
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Or provide individual fields
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      });
    } else {
      // Fallback if you ever run on GCP with default creds
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({ credential });
    console.log("✅ Firebase Admin initialized");
  }
} catch (e) {
  console.error("❌ Firebase Admin init failed:", e.message);
}

module.exports = admin;
