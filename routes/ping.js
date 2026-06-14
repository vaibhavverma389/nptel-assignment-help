const express = require("express");
const router = express.Router();
const VisitorLog = require("../models/VisitorLog");

router.get("/ping", async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"];
    
    if (sessionId) {
      const screenWidth = Number(req.headers["x-screen-width"]) || null;
      const screenHeight = Number(req.headers["x-screen-height"]) || null;
      const connectionType = req.headers["x-connection-type"] || null;
      const cpuCores = Number(req.headers["x-cpu-cores"]) || null;
      const deviceMemory = Number(req.headers["x-device-memory"]) || null;

      // Find the most recent log entry for this session and update it
      const latestLog = await VisitorLog.findOne({ sessionId })
        .sort({ visitedAt: -1 });

      if (latestLog) {
        latestLog.screenWidth = screenWidth;
        latestLog.screenHeight = screenHeight;
        latestLog.connectionType = connectionType;
        latestLog.cpuCores = cpuCores;
        latestLog.deviceMemory = deviceMemory;
        await latestLog.save();
      }
    }
  } catch (err) {
    console.error("Error updating ping data:", err.message);
  }
  
  res.status(204).send();
});

module.exports = router;