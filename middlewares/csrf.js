const crypto = require("crypto");

/**
 * Robust Zero-Dependency Session-Bound CSRF Protection Middleware
 */
module.exports = function csrfMiddleware(req, res, next) {
  // 1. Ensure user has an active session CSRF secret token
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  // Expose token to all EJS templates and views via res.locals
  res.locals.csrfToken = req.session.csrfToken;

  // Safe HTTP methods do not mutate state
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (safeMethods.has(req.method)) {
    return next();
  }

  // Endpoints that are explicitly excluded from standard HTML form CSRF
  // 1. /ping (client telemetry beacon)
  // 2. /auth/google (OAuth handshakes)
  const isExcluded =
    req.path === "/ping" ||
    req.path.startsWith("/auth/google");

  if (isExcluded) {
    return next();
  }

  // Extract submitted CSRF token from body or headers
  const submittedToken =
    (req.body && req.body._csrf) ||
    req.headers["x-csrf-token"] ||
    req.headers["csrf-token"] ||
    req.headers["x-xsrf-token"];

  // Timing-safe comparison to prevent timing attacks
  if (
    !submittedToken ||
    typeof submittedToken !== "string" ||
    submittedToken.length !== req.session.csrfToken.length
  ) {
    console.warn(`[Security] CSRF Validation Failed for ${req.method} ${req.originalUrl} from IP ${req.ip}`);
    if (req.flash) {
      req.flash("error", "Security validation failed: Invalid or expired session form token. Please try again.");
    }
    return res.status(403).render("404");
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(submittedToken, "utf8"),
    Buffer.from(req.session.csrfToken, "utf8")
  );

  if (!isValid) {
    console.warn(`[Security] CSRF Token Mismatch for ${req.method} ${req.originalUrl}`);
    if (req.flash) {
      req.flash("error", "Security validation failed: Form token mismatch. Please refresh and try again.");
    }
    return res.status(403).render("404");
  }

  next();
};
