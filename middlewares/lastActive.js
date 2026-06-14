const User = require("../models/User");

const UPDATE_INTERVAL = 2 * 60 * 1000; 

module.exports = async (req, res, next) => {
  try {
    if (!req.user) return next();

    if (req.user.role === "admin") return next();

    if (req.originalUrl.startsWith("/admin")) return next();

    const last = req.user.lastActive
      ? new Date(req.user.lastActive).getTime()
      : 0;

    const now = Date.now();

    if (now - last > UPDATE_INTERVAL) {
      // Streak Calculation
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let streak = req.user.streak || 0;
      let streakLastUpdated = req.user.streakLastUpdated;
      let updatedStreak = false;

      if (!streakLastUpdated) {
        streak = 1;
        streakLastUpdated = today;
        updatedStreak = true;
      } else {
        const lastDate = new Date(streakLastUpdated);
        lastDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak += 1;
          streakLastUpdated = today;
          updatedStreak = true;
        } else if (diffDays > 1) {
          streak = 1;
          streakLastUpdated = today;
          updatedStreak = true;
        }
      }

      const updateFields = { lastActive: new Date() };
      if (updatedStreak) {
        updateFields.streak = streak;
        updateFields.streakLastUpdated = streakLastUpdated;
        req.user.streak = streak;
        req.user.streakLastUpdated = streakLastUpdated;
      }

      await User.findByIdAndUpdate(req.user._id, updateFields);

      req.user.lastActive = new Date(); 
    }
  } catch (err) {
    console.error("lastActive error:", err.message);
  }

  next();
};
