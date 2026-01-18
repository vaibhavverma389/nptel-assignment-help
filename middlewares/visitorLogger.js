const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");

module.exports = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip) || {};

    await VisitorLog.create({
      ip,
      email: req.user ? req.user.email : null,   // 🔥 EMAIL HERE
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
