const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("auth/login");
});

router.get("/register", (req, res) => {
  res.render("auth/register");
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      req.flash("error", "All fields are required");
      return res.redirect("/auth/register");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash("error", "Email is already registered");
      return res.redirect("/auth/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "student"
    });

    req.login(user, (err) => {
      if (err) {
        console.error(err);
        req.flash("error", "Error logging in after registration");
        return res.redirect("/auth/login");
      }
      req.flash("success", "Registration successful! Welcome.");
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during registration");
    res.redirect("/auth/register");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash("error", "Email and password are required");
      return res.redirect("/auth/login");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) {
      req.flash("error", "Invalid credentials");
      return res.redirect("/auth/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Invalid credentials");
      return res.redirect("/auth/login");
    }

    req.login(user, (err) => {
      if (err) {
        console.error(err);
        req.flash("error", "Session login failed");
        return res.redirect("/auth/login");
      }
      req.flash("success", "Welcome back!");
      if (user.role === "admin") {
        return res.redirect("/admin");
      }
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during login");
    res.redirect("/auth/login");
  }
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
    res.redirect("/");
  });
});

module.exports = router;
