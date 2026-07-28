require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "change-me-in-production";

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
const VALID_MODES = ["HEALTHY", "DEGRADED", "UNAVAILABLE", "RECOVERED"];

const state = {
  mode: "HEALTHY",
  observationVersion: 1,
  lastTransition: new Date().toISOString(),
  startedAt: Date.now(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isOperational(mode) {
  return mode === "HEALTHY" || mode === "RECOVERED";
}

// ---------------------------------------------------------------------------
// Public endpoints (no auth)
// ---------------------------------------------------------------------------

// GET /health
app.get("/health", (_req, res) => {
  const payload = {
    status: state.mode === "UNAVAILABLE" ? "unavailable" : "ok",
    service_id: "temper-ref-001",
    mode: state.mode,
    version: state.observationVersion,
    last_transition: state.lastTransition,
  };

  if (state.mode === "UNAVAILABLE") {
    return res.status(503).json(payload);
  }

  return res.json(payload);
});

// GET /status
app.get("/status", (_req, res) => {
  const uptimeMs = Date.now() - state.startedAt;
  const payload = {
    status: state.mode === "UNAVAILABLE" ? "unavailable" : "ok",
    service_id: "temper-ref-001",
    mode: state.mode,
    version: state.observationVersion,
    last_transition: state.lastTransition,
    uptime_seconds: Math.floor(uptimeMs / 1000),
    operational: isOperational(state.mode),
    degraded: state.mode === "DEGRADED",
  };

  if (state.mode === "UNAVAILABLE") {
    return res.status(503).json(payload);
  }

  return res.json(payload);
});

// GET /commitment-state
app.get("/commitment-state", (_req, res) => {
  return res.json({
    operational: isOperational(state.mode),
    mode: state.mode,
    observation_version: state.observationVersion,
    last_transition_time: state.lastTransition,
  });
});

// ---------------------------------------------------------------------------
// Admin endpoint (requires ADMIN_SECRET header)
// ---------------------------------------------------------------------------

app.post("/admin/set-mode", (req, res) => {
  const secret = req.headers["x-admin-secret"] || req.headers["admin-secret"];
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { mode } = req.body;
  if (!mode || !VALID_MODES.includes(mode)) {
    return res.status(400).json({
      error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}`,
    });
  }

  state.mode = mode;
  state.observationVersion += 1;
  state.lastTransition = new Date().toISOString();

  return res.json({
    success: true,
    mode: state.mode,
    observation_version: state.observationVersion,
    last_transition: state.lastTransition,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`temper-reference-service running on port ${PORT}`);
});
