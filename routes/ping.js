const express = require("express");
const router = express.Router();
const VisitorLog = require("../models/VisitorLog");
const crypto = require("crypto");

function hashIP(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex");
}

function extractIP(req) {
  let ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "0.0.0.0";

  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

const handlePing = async (req, res) => {
  try {
    const body = req.body || {};

    let sessionId =
      body.sessionId ||
      req.headers["x-session-id"] ||
      null;

    if (!sessionId && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)v_sid=([^;]+)/);
      if (match) sessionId = decodeURIComponent(match[1]);
    }
    if (!sessionId) {
      sessionId = req.sessionID || null;
    }

    const screenWidth = Number(body.screenWidth ?? req.headers["x-screen-width"]) || null;
    const screenHeight = Number(body.screenHeight ?? req.headers["x-screen-height"]) || null;
    const connectionType = body.connectionType || req.headers["x-connection-type"] || null;
    const cpuCores = Number(body.cpuCores ?? req.headers["x-cpu-cores"]) || null;
    const deviceMemory = Number(body.deviceMemory ?? req.headers["x-device-memory"]) || null;
    const clientReferer = body.referer || req.headers["x-referer"] || null;
    const clientPath = body.path || null;

    let latestLog = null;

    // 1. Try finding by sessionId (and path if available)
    if (sessionId) {
      if (clientPath) {
        latestLog = await VisitorLog.findOne({ sessionId, path: clientPath }).sort({ visitedAt: -1 });
      }
      if (!latestLog) {
        latestLog = await VisitorLog.findOne({ sessionId }).sort({ visitedAt: -1 });
      }
    }

    // 2. Fallback: match by IP / user within the last 5 minutes
    if (!latestLog) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const ip = extractIP(req);
      const hashed = hashIP(ip);

      const conditions = [{ hashedIP: hashed }];
      if (req.user && req.user._id) {
        conditions.push({ userId: req.user._id });
      }

      const query = {
        $or: conditions,
        visitedAt: { $gte: fiveMinutesAgo }
      };
      if (clientPath) {
        query.path = clientPath;
      }

      latestLog = await VisitorLog.findOne(query).sort({ visitedAt: -1 });

      if (!latestLog && clientPath) {
        delete query.path;
        latestLog = await VisitorLog.findOne(query).sort({ visitedAt: -1 });
      }
    }

    if (latestLog) {
      if (screenWidth) latestLog.screenWidth = screenWidth;
      if (screenHeight) latestLog.screenHeight = screenHeight;
      if (connectionType) latestLog.connectionType = connectionType;
      if (cpuCores) latestLog.cpuCores = cpuCores;
      if (deviceMemory) latestLog.deviceMemory = deviceMemory;

      // Link sessionId if not present or placeholder
      if (sessionId && (!latestLog.sessionId || latestLog.sessionId.startsWith("s:"))) {
        latestLog.sessionId = sessionId;
      }

      // If referer was empty/direct and client-side document.referrer provided a value
      if (clientReferer && (!latestLog.referer || latestLog.referer === "Direct")) {
        latestLog.referer = clientReferer;
      }

      await latestLog.save();
    }
  } catch (err) {
    console.error("Error updating ping data:", err.message);
  }

  res.status(200).json({ success: true });
};

router.get("/ping", handlePing);
router.post("/ping", handlePing);

module.exports = router;
