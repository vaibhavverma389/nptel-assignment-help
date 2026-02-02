const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

module.exports = (req, res, next) => {
  try {
    const startTime = Date.now();

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip) || {};
    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();
    const path = req.originalUrl;

    // ❌ admin pages ignore
    if (path === "/admin" || path === "/admin/visitors") {
      return next();
    }

    res.on("finish", async () => {
      try {
        await VisitorLog.create({
          ip,
          path,
          method: req.method,
          statusCode: res.statusCode,

          // user info
          email: req.user?.email || null,
          userId: req.user?._id || null,
          role: req.user?.role || "guest",
          isAuthenticated: !!req.user,

          // network info
          isp: geo.org || "Unknown",
          asn: geo.asn || "Unknown",

          // location
          location: {
            country: geo.country || "Unknown",
            region: geo.region || "Unknown",
            city: geo.city || "Unknown",
            timezone: geo.timezone || "Unknown"
          },

          // device
          device: {
            browser: ua.browser.name || "Unknown",
            os: ua.os.name || "Unknown",
            device: ua.device.type || "desktop"
          },

          // misc
          referrer: req.headers.referer || "Direct",
          responseTime: `${Date.now() - startTime}ms`,
          visitedAt: new Date()
        });
      } catch (err) {
        console.error("Visitor DB error:", err.message);
      }
    });
  } catch (err) {
    console.error("Visitor log error:", err.message);
  }

  next();
};
