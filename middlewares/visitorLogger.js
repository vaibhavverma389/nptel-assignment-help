const VisitorLog = require("../models/VisitorLog");
const axios = require("axios");

const ipCache = new Map(); // in-memory cache

module.exports = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    let isp = "Unknown";
    let asn = "Unknown";

    // Skip localhost
    if (ip && ip !== "::1" && ip !== "127.0.0.1") {

      // 🔥 CACHE HIT
      if (ipCache.has(ip)) {
        ({ isp, asn } = ipCache.get(ip));
      } else {
        try {
          const response = await axios.get(`https://ipwho.is/${ip}`, {
            timeout: 3000
          });

          if (response.data?.success) {
            isp = response.data.isp || "Unknown";
            asn = response.data.asn || "Unknown";

            // cache store
            ipCache.set(ip, { isp, asn });
          }
        } catch (apiErr) {
          console.warn("⚠️ ISP lookup failed:", apiErr.message);
        }
      }
    }

    await VisitorLog.create({
      ip,
      email: req.user ? req.user.email : null,
      isp,
      asn,
      userAgent: req.headers["user-agent"],
      path: req.originalUrl
    });

  } catch (err) {
    console.error("❌ Visitor log error:", err.message);
  }

  next();
};
