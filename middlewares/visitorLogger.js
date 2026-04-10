const VisitorLog = require("../models/VisitorLog");
const axios = require("axios");
const crypto = require("crypto");

// ================= CONFIG =================

const IPINFO_TOKEN = process.env.IPINFO_TOKEN;

const IGNORE_PATHS = new Set(["/ping", "/favicon.ico", "/robots.txt"]);
const IGNORE_EXTS = new Set([".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".map"]);

const GEO_CACHE = new Map();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h per IP
const GEO_CACHE_MAX = 10000;

// ================= HELPERS =================

function hashIP(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex");
}

function isValidIPv4(ip) {
  return /^(25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\.(25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\.(25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\.(25[0-5]|2[0-4]\d|1\d\d|\d{1,2})$/.test(ip);
}

function extractIP(req) {
  let ip =
    req.headers["cf-connecting-ip"] ||           // Cloudflare
    req.headers["x-real-ip"] ||                  // Nginx proxy
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "0.0.0.0";

  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);

  return isValidIPv4(ip) ? ip : "0.0.0.0";
}

function shouldIgnore(path) {
  if (IGNORE_PATHS.has(path.split("?")[0])) return true;
  const lastDot = path.lastIndexOf(".");
  if (lastDot !== -1) {
    const ext = path.slice(lastDot).toLowerCase().split("?")[0];
    if (IGNORE_EXTS.has(ext)) return true;
  }
  return false;
}

// ================= UA PARSING =================

function parseUserAgent(ua = "") {
  const device = /tablet|ipad/i.test(ua)
    ? "Tablet"
    : /mobile|android|iphone/i.test(ua)
    ? "Mobile"
    : "Desktop";

  const browser = ua.includes("Edg")
    ? "Edge"
    : ua.includes("OPR") || ua.includes("Opera")
    ? "Opera"
    : ua.includes("Chrome")
    ? "Chrome"
    : ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Safari")
    ? "Safari"
    : ua.includes("MSIE") || ua.includes("Trident")
    ? "IE"
    : "Other";

  const os = ua.includes("Windows NT 10") ? "Windows 10"
    : ua.includes("Windows NT 6.3") ? "Windows 8.1"
    : ua.includes("Windows") ? "Windows"
    : ua.includes("Android") ? "Android"
    : ua.includes("iPhone") ? "iOS (iPhone)"
    : ua.includes("iPad") ? "iOS (iPad)"
    : ua.includes("Mac OS X") ? "macOS"
    : ua.includes("Linux") ? "Linux"
    : "Other";

  const isBot = /bot|crawl|spider|curl|wget|headless|python|axios|go-http|java|scrapy/i.test(ua);

  // Extract browser version
  let browserVersion = null;
  const versionMatch =
    ua.match(/(?:Chrome|Firefox|Safari|Edg(?:e)?|OPR)\/(\d+\.\d+)/) ||
    ua.match(/rv:(\d+\.\d+)/);
  if (versionMatch) browserVersion = versionMatch[1];

  return { device, browser, browserVersion, os, isBot };
}

// ================= GEO =================

const ISP_ALIASES = [
  ["Jio", "Jio"],
  ["Airtel", "Airtel"],
  ["BSNL", "BSNL"],
  ["Vodafone", "Vi"],
  ["Idea", "Vi"],
  ["Hathway", "Hathway"],
  ["ACT", "ACT Fibernet"],
  ["YOU Broadband", "YOU Broadband"],
];

function normalizeISP(org = "") {
  for (const [key, label] of ISP_ALIASES) {
    if (org.toLowerCase().includes(key.toLowerCase())) return label;
  }
  // Strip leading AS##### prefix from org field
  return org.replace(/^AS\d+\s+/i, "").trim() || "Unknown";
}

async function fetchGeoFromIPInfo(ip) {
  const res = await axios.get(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`, { timeout: 3000 });
  const d = res.data;
  const [lat, lon] = d.loc ? d.loc.split(",").map(Number) : [null, null];
  return {
    country: d.country || "",
    city: d.city || "",
    region: d.region || "",
    timezone: d.timezone || "",
    postal: d.postal || "",
    lat: lat || null,
    lon: lon || null,
    isp: normalizeISP(d.org || ""),
    asn: d.org?.match(/^AS(\d+)/)?.[1] || null,
  };
}

async function fetchGeoFromIPAPI(ip) {
  const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
  const d = res.data;
  if (d.error) throw new Error(d.reason || "ipapi error");
  return {
    country: d.country_code || "",
    city: d.city || "",
    region: d.region || "",
    timezone: d.timezone || "",
    postal: d.postal || "",
    lat: d.latitude || null,
    lon: d.longitude || null,
    isp: normalizeISP(d.org || ""),
    asn: d.asn?.replace("AS", "") || null,
  };
}

async function fetchGeo(ip) {
  try {
    return await fetchGeoFromIPInfo(ip);
  } catch {
    try {
      return await fetchGeoFromIPAPI(ip);
    } catch {
      return {};
    }
  }
}

async function getGeoData(ip) {
  const now = Date.now();

  if (GEO_CACHE.has(ip)) {
    const { data, timestamp } = GEO_CACHE.get(ip);
    if (now - timestamp < GEO_CACHE_TTL) return data;
  }

  const geo = await fetchGeo(ip);

  // Evict oldest 20% when full
  if (GEO_CACHE.size >= GEO_CACHE_MAX) {
    const cutoff = Math.floor(GEO_CACHE_MAX * 0.2);
    let i = 0;
    for (const key of GEO_CACHE.keys()) {
      if (i++ >= cutoff) break;
      GEO_CACHE.delete(key);
    }
  }

  GEO_CACHE.set(ip, { data: geo, timestamp: now });
  return geo;
}

// ================= EVENT TYPE =================

function resolveEventType(path, method) {
  if (path.includes("/admit-card")) return "admit-card-click";
  if (path.includes("/login")) return "login";
  if (path.includes("/register") || path.includes("/signup")) return "register";
  if (path.includes("/logout")) return "logout";
  if (path.includes("/download")) return "download";
  if (method === "POST") return "form-submit";
  return "visit";
}

// ================= EXTRA REQUEST INFO =================

function extractRequestMeta(req) {
  return {
    referer: req.headers["referer"] || req.headers["referrer"] || null,
    language: req.headers["accept-language"]?.split(",")[0]?.trim() || null,
    acceptEncoding: req.headers["accept-encoding"] || null,
    contentType: req.headers["content-type"] || null,
    dnt: req.headers["dnt"] === "1",                          // Do Not Track
    secFetchSite: req.headers["sec-fetch-site"] || null,      // same-origin / cross-site / none
    secFetchMode: req.headers["sec-fetch-mode"] || null,      // navigate / cors / no-cors
    isAjax: req.headers["x-requested-with"] === "XMLHttpRequest",
    protocol: req.protocol || (req.secure ? "https" : "http"),
    port: req.headers["host"]?.split(":")?.[1] || null,
    queryParams: Object.keys(req.query).length ? Object.keys(req.query) : null, // key names only, not values
  };
}

// ================= MIDDLEWARE =================

module.exports = (req, res, next) => {
  const startTime = Date.now();
  const path = req.originalUrl || "/";

  if (shouldIgnore(path.split("?")[0])) return next();

  const ip = extractIP(req);
  const hashedIP = hashIP(ip);
  const ua = req.headers["user-agent"] || "";
  const uaParsed = parseUserAgent(ua);
  const requestMeta = extractRequestMeta(req);

  res.on("finish", async () => {
    try {
      const user = req.user || {};
      const responseTime = Date.now() - startTime;

      // Skip admin
      if (user.email && user.email === process.env.ADMIN_EMAIL) return;

      // Geo lookup
      let geo = {};
      if (ip !== "0.0.0.0" && ip !== "127.0.0.1") {
        try { geo = await getGeoData(ip); } catch {}
      }

      // Only log Indian traffic (skip if geo lookup failed for unknown IPs)
      if (geo.country && geo.country !== "IN") return;

      await VisitorLog.create({
        // User identity
        userId: user._id || null,
        email: user.email || "guest",
        role: user.role || "guest",

        // IP
        ip,
        hashedIP,

        // Geo
        country: geo.country || "",
        city: geo.city || "",
        region: geo.region || "",
        timezone: geo.timezone || "",
        postal: geo.postal || "",
        lat: geo.lat || null,
        lon: geo.lon || null,
        isp: geo.isp || "",
        asn: geo.asn || null,

        // Device / browser
        device: uaParsed.device,
        browser: uaParsed.browser,
        browserVersion: uaParsed.browserVersion,
        os: uaParsed.os,
        isBot: uaParsed.isBot,
        userAgent: ua,                     // store raw UA for future re-parsing

        // Request
        path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        eventType: resolveEventType(path, req.method),

        // Session / tracking
        sessionId: req.sessionID || null,

        // Extra metadata
        referer: requestMeta.referer,
        language: requestMeta.language,
        dnt: requestMeta.dnt,
        isAjax: requestMeta.isAjax,
        secFetchSite: requestMeta.secFetchSite,
        secFetchMode: requestMeta.secFetchMode,
        protocol: requestMeta.protocol,
        queryParams: requestMeta.queryParams,

        visitedAt: new Date(),
      });

    } catch (err) {
      console.error("[VisitorLog] Failed to save log:", err.message);
    }
  });

  next();
};