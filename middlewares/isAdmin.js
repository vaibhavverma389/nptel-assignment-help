module.exports = (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    if (req.user.role !== "admin") {
      return res.status(403).send("Access Denied: Admins only");
    }

    next();
  } catch (err) {
    console.error("isAdmin middleware error:", err);
    res.status(500).send("Admin middleware error");
  }
};
