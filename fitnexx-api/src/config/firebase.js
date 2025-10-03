// src/config/firebase.js
const admin = require("firebase-admin");

let projectId = "(unknown)";
let credential;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    projectId = sa.project_id;
    credential = admin.credential.cert(sa);
  } else if (process.env.FIREBASE_PROJECT_ID) {
    projectId = process.env.FIREBASE_PROJECT_ID;
    credential = admin.credential.cert({
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });
  } else {
    credential = admin.credential.applicationDefault();
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential, projectId });
    console.log("✅ Firebase Admin initialized for project:", projectId);
  }
} catch (e) {
  console.error("❌ Firebase Admin init failed:", e.message);
}

module.exports = { admin, projectId };
