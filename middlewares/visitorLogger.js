const VisitorLog = require("../models/VisitorLog");
const axios = require("axios");

const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
const IPAPI_URL = "https://ipapi.co";

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

// ================= GEO =================

async function getGeoData(ip) {
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

// ================= MIDDLEWARE =================

module.exports = (req, res, next) => {
  const startTime = Date.now();
  const path = req.originalUrl || "";

  const IGNORE_PATHS = ["/ping", "/favicon.ico", "/robots.txt"];
  const IGNORE_EXT = [".css",".js",".png",".jpg",".jpeg",".gif",".svg",".ico"];

  if (IGNORE_PATHS.some(p => path.startsWith(p))) return next();
  if (IGNORE_EXT.some(ext => path.endsWith(ext))) return next();

  let ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip;

  if (!ip) ip = "0.0.0.0";
  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  res.on("finish", () => {
    setImmediate(async () => {
      try {
        if (!req.user) return;

        const { _id: userId, email, role } = req.user;
        if (email === process.env.ADMIN_EMAIL) return;

        const ua = req.headers["user-agent"] || "";

        const geo = await getGeoData(ip);

        await VisitorLog.create({
          userId,
          email,
          role,

          ip,

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

          isBot: /bot|crawler|spider/i.test(ua),

          referer: req.headers["referer"] || "",
          language: req.headers["accept-language"] || "",

          visitedAt: new Date()
        });

      } catch (err) {
        console.log("Visitor log error:", err.message);
      }
    });
  });

  next();
};