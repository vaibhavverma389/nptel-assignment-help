const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");
const axios = require("axios");

/* ---------- helper: live IP location ---------- */
async function getLocation(ip) {
  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,timezone,mobile,proxy`
    );

    if (data.status !== "success") return {};

    // Normalize Indian ISPs
    let ispName = data.isp || data.org || "Unknown";

    if (/reliance/i.test(ispName)) ispName = "Jio";
    else if (/airtel/i.test(ispName)) ispName = "Airtel";
    else if (/vodafone|idea|vi/i.test(ispName)) ispName = "VI";

    return {
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: ispName,
      timezone: data.timezone,
      mobile: data.mobile,
      proxy: data.proxy
    };
  } catch (err) {
    return {};
  }
}

module.exports = (req, res, next) => {
  try {
    const startTime = Date.now();

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();
    const path = req.originalUrl;

    // ❌ ignore admin pages
    if (path === "/admin" || path === "/admin/visitors") {
      return next();
    }

    /* ---------- LOCATION LOGIC ---------- */
    let location = geoip.lookup(ip) || {};

    res.on("finish", async () => {
      try {
        // Fallback to live API if ISP / city missing
        if (!location.city || !location.isp) {
          const liveLocation = await getLocation(ip);
          location = { ...location, ...liveLocation };
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
          isp: location.isp || "Unknown",
          networkType: location.mobile ? "Mobile Network" : "Broadband",

          // location
          location: {
            country: location.country || "Unknown",
            region: location.region || "Unknown",
            city: location.city || "Unknown",
            timezone: location.timezone || "Unknown"
          },

          // device info
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
