const VisitorLog = require("../models/VisitorLog");

module.exports = (req, res, next) => {
  const startTime = Date.now();

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "Unknown";

  const path = req.originalUrl;

  // Skip static files
  if (/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/.test(path)) {
    return next();
  }

  res.on("finish", () => {
    setImmediate(() => {
      try {
        // Only logged-in users
        if (!req.user) return;

        // Skip admin
        if (req.user.role === "admin") return;

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
