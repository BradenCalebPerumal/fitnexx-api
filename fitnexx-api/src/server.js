require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectMongo } = require("./config/mongo");

const app = express();

// Security & basics
app.use(helmet());
app.use(express.json());

// CORS (Android/Render safe)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Health checks (Render pings these)
app.get("/", (_, res) => res.status(200).send("Fitnexx API OK"));
app.get("/healthz", (_, res) => res.status(200).json({ ok: true }));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing MONGODB_URI");
    }
    await connectMongo(process.env.MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`🚀 API listening on :${PORT}`);
    });
  } catch (e) {
    console.error("Fatal startup error:", e);
    process.exit(1);
  }
})();

// Keep process alive visibility
process.on("unhandledRejection", (r) => console.error("UnhandledRejection:", r));
process.on("uncaughtException", (e) => {
  console.error("UncaughtException:", e);
  // decide if you want to exit(1); for now, log only
});
    