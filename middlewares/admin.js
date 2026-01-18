module.exports = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/auth/login"); 
  }

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).send("Access Denied");
  }

  next();
};
