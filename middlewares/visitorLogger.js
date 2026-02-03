const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");
const axios = require("axios");

/* ---------- helper: live IP location ---------- */
async function getLocation(ip) {
  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${ip}`
    );

    if (data.status !== "success") return {};

    return {
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: data.isp,
      timezone: data.timezone
    };
  } catch (err) {
    return {};
  }
}

module.exports = (req, res, next) => {
  try {
    const startTime = Date.now();

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();
    const path = req.originalUrl;

    // ❌ admin pages ignore
    if (path === "/admin" || path === "/admin/visitors") {
      return next();
    }

    /* ---------- LOCATION LOGIC (HYBRID) ---------- */
    let location = geoip.lookup(ip) || {};

    res.on("finish", async () => {
      try {
        // if (!req.user || !req.user.email) {
        // return;
        // }
        // fallback to live API if city missing
        if (!location.city) {
          location = await getLocation(ip);
        }

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
          isp: location.isp || location.org || "Unknown",

          // location
          location: {
            country: location.country || "Unknown",
            region: location.region || "Unknown",
            city: location.city || "Unknown",
            timezone: location.timezone || "Unknown"
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
