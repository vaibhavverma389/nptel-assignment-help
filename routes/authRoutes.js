const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("auth/login");
});

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  (req, res) => {
    req.session.user = req.user;

    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    if (req.user.role === "admin") {
  return res.redirect("/admin");
}

return res.redirect("/dashboard");

  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.redirect("/auth/login");
  });
});

module.exports = router;
