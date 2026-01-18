const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");

module.exports = async (req, res, next) => {
  try {
    // ❌ Guest user → skip logging
    if (!req.user || !req.user.email) {
      return next();
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    // 🔍 Geo lookup
    const geo = geoip.lookup(ip) || {};

    await VisitorLog.create({
      ip,
      email: req.user.email,           // ✅ only logged-in
      isp: geo.org || "Unknown",
      asn: geo.asn || "Unknown",
      userAgent: req.headers["user-agent"],
      path: req.originalUrl
    });

  } catch (err) {
    console.error("Visitor log error:", err.message);
  }

  next();
};
