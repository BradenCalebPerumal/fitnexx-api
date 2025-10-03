require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectMongo } = require("./config/mongo");

const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// health + root (so Render health check never 502s)
app.get("/", (_, res) => res.send("Fitnexx API OK"));
app.get("/healthz", (_, res) => res.status(200).json({ ok: true }));

// routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
// after other routes
app.use("/steps", require("./routes/steps"));

// start HTTP server immediately (don’t block on DB)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API listening on :${PORT}`));

// connect to Mongo in background
connectMongo(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((e) => console.error("❌ Mongo connect error:", e.message));

// helpful diagnostics (won’t crash the process silently)
process.on("unhandledRejection", (r) => console.error("UNHANDLED REJECTION:", r));
process.on("uncaughtException", (e) => console.error("UNCAUGHT EXCEPTION:", e));
