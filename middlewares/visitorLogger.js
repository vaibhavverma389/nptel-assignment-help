const VisitorLog = require("../models/VisitorLog");
const axios = require("axios");

module.exports = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    let isp = "Unknown";
    let asn = "Unknown";

    // Skip localhost
    if (ip && ip !== "::1" && ip !== "127.0.0.1") {
      const response = await axios.get(`https://ipwho.is/${ip}`);

      if (response.data && response.data.success) {
        isp = response.data.isp || "Unknown";
        asn = response.data.asn || "Unknown";
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
    console.error("Visitor log error:", err.message);
  }

  next();
};
