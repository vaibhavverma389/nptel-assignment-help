const User = require("../models/User");

const UPDATE_INTERVAL = 2 * 60 * 1000; 

module.exports = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next();
    }

    const last = req.user.lastActive
      ? new Date(req.user.lastActive).getTime()
      : 0;

    const now = Date.now();

    if (now - last > UPDATE_INTERVAL) {
      await User.findByIdAndUpdate(req.user._id, {
        lastActive: new Date()
      });

      req.user.lastActive = new Date();
    }
  } catch (err) {
    console.error("lastActive update error:", err.message);
  }

  next();
};
