const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");

module.exports = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip) || {};
    const path = req.originalUrl;

    // ❌ admin pages skip (optional)
    if (path === "/admin" || path === "/admin/visitors") {
      return next();
    }

    await VisitorLog.create({
      ip,
      email: req.user?.email || "guest",   // ✅ guest handled
      isp: geo.org || "Unknown",
      asn: geo.asn || "Unknown",
      userAgent: req.headers["user-agent"],
      path,
      isGuest: !req.user                   // ✅ optional flag
    });

  } catch (err) {
    console.error("Visitor log error:", err.message);
  }

  next();
};
