module.exports = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); // ✅ login hai
  }

  // ❌ login nahi hai → login page
  return res.redirect("/auth/login");
};
