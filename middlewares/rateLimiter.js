// High-performance, zero-dependency sliding window rate limiter
const ipWindows = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipWindows.entries()) {
    if (now > record.resetTime) {
      ipWindows.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // unref so it does not block node shutdown

function getClientIp(req) {
  let ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "0.0.0.0";

  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

/**
 * Creates a rate-limiting middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests within the window
 * @param {string} options.message - Error message returned when limit exceeded
 * @param {string} [options.keyPrefix] - Prefix to isolate different endpoints
 */
function createRateLimiter({ windowMs, max, message, keyPrefix = "rl" }) {
  return (req, res, next) => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = ipWindows.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      ipWindows.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader("Retry-After", retryAfterSeconds);
      if (req.xhr || (req.headers.accept && req.headers.accept.includes("json"))) {
        return res.status(429).json({
          error: message || "Too many requests, please try again later.",
          retryAfter: retryAfterSeconds
        });
      }

      if (req.flash) {
        req.flash("error", message || "Too many requests. Please try again later.");
        return res.redirect(req.get("Referrer") || "/");
      }

      return res.status(429).send(message || "Too many requests, please try again later.");
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  authLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 15, // 15 attempts
    message: "Too many login/registration attempts from this IP. Please wait 15 minutes before trying again.",
    keyPrefix: "auth"
  }),
  contactLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many contact messages sent. Please wait 15 minutes before submitting again.",
    keyPrefix: "contact"
  }),
  uploadLimiter: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: "Hourly note upload limit reached. Please try again later.",
    keyPrefix: "upload"
  }),
  pingLimiter: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: "Rate limit exceeded for telemetry.",
    keyPrefix: "ping"
  })
};

