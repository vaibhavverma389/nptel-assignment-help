const VisitorLog = require("../models/VisitorLog");
const axios = require("axios");
const crypto = require("crypto");

const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
const IPAPI_URL = "https://ipapi.co";

const IGNORE_PATHS = ["/ping", "/favicon.ico", "/robots.txt"];
const IGNORE_EXT = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"];

const geoCache = new Map();

// 🔐 Hash IP
function hashIP(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex");
}

// ✅ Validate IPv4
function isValidIP(ip) {
  return /^(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)$/.test(ip);
}

// 📱 Device
function detectDevice(ua) {
  if (!ua) return "Unknown";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}

// 🌐 Browser
function detectBrowser(ua) {
  if (!ua) return "Unknown";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  return "Other";
}

// 💻 OS
function detectOS(ua) {
  if (!ua) return "Unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Mac")) return "MacOS";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}

// 🤖 Bot detection
function detectBot(ua) {
  return /bot|crawler|spider|crawling|curl|wget|headless/i.test(ua);
}

function formatISP(isp) {
  if (!isp) return "Unknown";
  if (isp.includes("Jio")) return "Jio";
  if (isp.includes("Airtel")) return "Airtel";
  if (isp.includes("BSNL")) return "BSNL";
  if (isp.includes("Vodafone") || isp.includes("Idea")) return "Vi";
  return isp;
}

// 🌍 Fetch Geo
async function fetchGeo(ip) {
  try {
    const res = await axios.get(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`);
    const data = res.data;

    const [lat, lon] = data.loc ? data.loc.split(",") : [];

    return {
      country: data.country || "",
      city: data.city || "",
      region: data.region || "",
      timezone: data.timezone || "",
      lat: lat ? Number(lat) : null,
      lon: lon ? Number(lon) : null,
      isp: formatISP(data.org || ""),
    };
  } catch {
    try {
      const res = await axios.get(`${IPAPI_URL}/${ip}/json/`);
      const data = res.data;

      return {
        country: data.country || "",
        city: data.city || "",
        region: data.region || "",
        timezone: data.timezone || "",
        lat: data.latitude || null,
        lon: data.longitude || null,
        isp: formatISP(data.org || ""),
      };
    } catch {
      return {};
    }
  }
}

// 📦 Cache (with limit)
async function getGeoData(ip) {
  if (geoCache.has(ip)) return geoCache.get(ip);

  const geo = await fetchGeo(ip);

  if (geoCache.size > 5000) geoCache.clear(); // prevent memory leak

  geoCache.set(ip, geo);
  return geo;
}

// ================= MIDDLEWARE =================

module.exports = (req, res, next) => {
  const startTime = Date.now();
  const path = req.originalUrl || "";

  // ❌ Ignore static
  if (IGNORE_PATHS.some(p => path.startsWith(p))) return next();
  if (IGNORE_EXT.some(ext => path.endsWith(ext))) return next();

  // 🌐 IP detection
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "0.0.0.0";

  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  if (!isValidIP(ip)) ip = "0.0.0.0";

  const hashedIP = hashIP(ip);

  res.on("finish", async () => {
    try {
      const user = req.user || {};

      const ua = req.headers["user-agent"] || "";

      let geo = {};
      try {
        geo = await getGeoData(ip);
      } catch {}

      // 🚀 Fire & forget (NO BLOCKING)
      VisitorLog.create({
        userId: user._id || null,
        email: user.email || "guest",
        role: user.role || "guest",

        ip,
        hashedIP,

        country: geo.country || "",
        city: geo.city || "",
        region: geo.region || "",
        isp: geo.isp || "",

        path,
        method: req.method,
        statusCode: res.statusCode,

        responseTime: Date.now() - startTime,

        device: detectDevice(ua),
        browser: detectBrowser(ua),
        os: detectOS(ua),

        isBot: detectBot(ua),

        sessionId: req.sessionID || null,

        eventType: path.includes("/admit-card")
          ? "admit-card-click"
          : "visit",

        visitedAt: new Date()
      }).catch(err => console.error("Log error:", err));

    } catch (err) {
      console.error("Visitor log error:", err);
    }
  });

  next();
};