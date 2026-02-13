const VisitorLog = require("../models/VisitorLog");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");
const axios = require("axios");

/* ---------- helper: live IP location ---------- */
async function getLocation(ip) {
  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,timezone,mobile,proxy,as`
    );

    if (data.status !== "success") return {};

    let rawIsp = data.isp || data.org || "Unknown";
    let ispName = rawIsp;

    if (/reliance/i.test(rawIsp)) ispName = "Jio";
    else if (/airtel/i.test(rawIsp)) ispName = "Airtel";
    else if (/vodafone|idea|vi/i.test(rawIsp)) ispName = "VI";

    return {
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: ispName,
      rawIsp,
      asn: data.as || null,
      timezone: data.timezone,
      mobile: !!data.mobile,
      proxy: !!data.proxy
    };
  } catch (err) {
    return {};
  }
}

module.exports = (req, res, next) => {
  const startTime = Date.now();

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress;

  const path = req.originalUrl;

  const IGNORE_PATHS = ["/favicon.ico", "/admin"];

  if (IGNORE_PATHS.some(p => path.startsWith(p))) {
    return next();
  }

  const parser = new UAParser(req.headers["user-agent"]);
  const ua = parser.getResult();

  let location = geoip.lookup(ip) || {};

  res.on("finish", async () => {
    try {
      const isAuthenticated = !!req.user;
      if (!isAuthenticated) {
      return;
    }

      

      // Skip admin logs (optional)
      if (isAuthenticated && req.user.role === "admin") {
        return;
      }

      if (!location.city || !location.isp) {
        const liveLocation = await getLocation(ip);
        location = { ...location, ...liveLocation };
      }

      await VisitorLog.create({
        ip,
        path,
        method: req.method,
        statusCode: res.statusCode,

        email: isAuthenticated ? req.user.email : null,
        userId: isAuthenticated ? req.user._id : null,
        role: isAuthenticated ? req.user.role : "guest",
        isAuthenticated,

        isp: location.isp || "Unknown",
        rawIsp: location.rawIsp || location.isp || "Unknown",
        asn: location.asn || null,
        networkType: location.mobile ? "Mobile Network" : "Broadband",
        isMobileIP: !!location.mobile,
        proxy: !!location.proxy,

        location: {
          country: location.country || "Unknown",
          region: location.region || "Unknown",
          city: location.city || "Unknown",
          timezone: location.timezone || "Unknown"
        },

        device: {
          browser: ua.browser.name || "Unknown",
          os: ua.os.name || "Unknown",
          device: ua.device.type || "desktop"
        },

        referrer: req.headers.referer || "Direct",
        responseTime: `${Date.now() - startTime}ms`,
        visitedAt: new Date()
      });

    } catch (err) {
      console.error("Visitor DB error:", err.message);
    }
  });

  next();
};
