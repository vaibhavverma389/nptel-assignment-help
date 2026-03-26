const VisitorLog = require("../models/VisitorLog");
const axios = require("axios");
const crypto = require("crypto");

const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
const IPAPI_URL = "https://ipapi.co";

// ================= CONFIG =================
const IGNORE_PATHS = ["/ping", "/favicon.ico", "/robots.txt"];
const IGNORE_EXT = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"];

// Reduce DB load (log only 70% requests)
const SAMPLE_RATE = 0.7;

// Cache for geo data
const geoCache = new Map();

// ================= HELPERS =================

function detectDevice(ua) {
  if (!ua) return "Unknown";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function detectBrowser(ua) {
  if (!ua) return "Unknown";

  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";

  return "Other";
}

function detectOS(ua) {
  if (!ua) return "Unknown";

  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Mac")) return "MacOS";
  if (ua.includes("Linux")) return "Linux";

  return "Other";
}

function detectBot(ua) {
  return /bot|crawler|spider|crawling|curl|wget|headless/i.test(ua);
}

function hashIP(ip) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

// ================= GEO =================

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
      isp: data.org || "",
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
        isp: data.org || "",
      };

    } catch {
      return {};
    }
  }
}

async function getGeoData(ip) {
  if (geoCache.has(ip)) return geoCache.get(ip);

  const geo = await fetchGeo(ip);
  geoCache.set(ip, geo);

  return geo;
}

// ================= MIDDLEWARE =================

module.exports = (req, res, next) => {
  const startTime = Date.now();
  const path = req.originalUrl || "";

  // Ignore static and system routes
  if (IGNORE_PATHS.some(p => path.startsWith(p))) return next();
  if (IGNORE_EXT.some(ext => path.endsWith(ext))) return next();

  // Sampling (reduce DB writes)
  if (Math.random() > SAMPLE_RATE) return next();

  // Correct IP handling (proxy safe)
  let ip = req.ip || req.connection.remoteAddress || "0.0.0.0";

  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  const hashedIP = hashIP(ip);

  res.on("finish", () => {
    setImmediate(async () => {
      try {
        if (!req.user) return;

        const { _id: userId, email, role } = req.user;

        // Ignore admin
        if (email === process.env.ADMIN_EMAIL) return;

        const ua = req.headers["user-agent"] || "";

        const geo = await getGeoData(ip);

        await VisitorLog.create({
          userId,
          email,
          role,

          ip: hashedIP, // hashed for privacy

          country: geo.country || "",
          city: geo.city || "",
          region: geo.region || "",
          timezone: geo.timezone || "",
          lat: geo.lat,
          lon: geo.lon,
          isp: geo.isp || "",

          path,
          method: req.method,
          statusCode: res.statusCode,

          responseTime: Date.now() - startTime,

          device: detectDevice(ua),
          browser: detectBrowser(ua),
          os: detectOS(ua),

          isBot: detectBot(ua),

          referer: req.headers["referer"] || "",
          language: req.headers["accept-language"] || "",

          visitedAt: new Date()
        });

      } catch (err) {
        console.error("Visitor log error:", err);
      }
    });
  });

  next();
};