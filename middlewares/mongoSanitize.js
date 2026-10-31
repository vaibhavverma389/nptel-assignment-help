/**
 * Native NoSQL Injection Sanitization Middleware
 * Recursively removes any object keys that begin with '$' or contain '.'
 * from req.body, req.query, and req.params to prevent MongoDB operator injection.
 */

function sanitize(target) {
  if (!target || typeof target !== "object") {
    return;
  }

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      if (typeof target[i] === "object" && target[i] !== null) {
        sanitize(target[i]);
      }
    }
    return;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete target[key];
    } else if (typeof target[key] === "object" && target[key] !== null) {
      sanitize(target[key]);
    }
  }
}

module.exports = function mongoSanitize(req, res, next) {
  try {
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
  } catch (err) {
    console.error("NoSQL Sanitization error:", err);
  }
  next();
};
