const VisitorLog = require("../models/VisitorLog");

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

  res.on("finish", () => {
    setImmediate(() => {
      try {
        if (!req.user) return; // only logged in users
        if (req.user.role === "admin") return; // skip admin

        VisitorLog.create({
          userId: req.user._id,
          email: req.user.email,
          role: req.user.role,

          ip,
          path,
          method: req.method,
          statusCode: res.statusCode,

          responseTime: Date.now() - startTime,
          visitedAt: new Date()
        }).catch(() => {});
      } catch (_) {}
    });
  });

  next();
};