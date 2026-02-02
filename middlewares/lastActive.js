const User = require("../models/User");

const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes

module.exports = async (req, res, next) => {
  try {
    // ❌ no user
    if (!req.user) return next();

    // ❌ admin browsing admin panel
    if (req.user.role === "admin") return next();

    // ❌ ignore admin routes
    if (req.originalUrl.startsWith("/admin")) return next();

    const last = req.user.lastActive
      ? new Date(req.user.lastActive).getTime()
      : 0;

    const now = Date.now();

    if (now - last > UPDATE_INTERVAL) {
      await User.findByIdAndUpdate(req.user._id, {
        lastActive: new Date()
      });

      req.user.lastActive = new Date(); // keep session in sync
    }
  } catch (err) {
    console.error("lastActive error:", err.message);
  }

  next();
};
