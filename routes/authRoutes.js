const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const { authLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("auth/login");
});

router.get("/register", (req, res) => {
  res.render("auth/register");
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      req.flash("error", "All fields are required");
      return res.redirect("/auth/register");
    }

    const trimmedPassword = String(password).trim();
    if (trimmedPassword.length < 8) {
      req.flash("error", "Password must be at least 8 characters long");
      return res.redirect("/auth/register");
    }

    if (!/[A-Za-z]/.test(trimmedPassword) || !/[0-9]/.test(trimmedPassword)) {
      req.flash("error", "Password must contain both letters and numbers");
      return res.redirect("/auth/register");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      req.flash("error", "Email is already registered");
      return res.redirect("/auth/register");
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "student"
    });

    // Session regeneration to prevent session fixation
    const csrfToken = req.session ? req.session.csrfToken : null;
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error("Session regeneration error during registration:", regenErr);
      }
      if (csrfToken) {
        req.session.csrfToken = csrfToken;
      }

      req.login(user, (err) => {
        if (err) {
          console.error(err);
          req.flash("error", "Error logging in after registration");
          return res.redirect("/auth/login");
        }
        req.flash("success", "Registration successful! Welcome.");
        return res.redirect("/dashboard");
      });
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during registration");
    res.redirect("/auth/register");
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash("error", "Email and password are required");
      return res.redirect("/auth/login");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      req.flash("error", "Invalid credentials");
      return res.redirect("/auth/login");
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      req.flash("error", "Invalid credentials");
      return res.redirect("/auth/login");
    }

    // Security: Regenerate session ID on login to eliminate Session Fixation vulnerabilities
    const csrfToken = req.session ? req.session.csrfToken : null;
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error("Session regeneration error during login:", regenErr);
      }
      if (csrfToken) {
        req.session.csrfToken = csrfToken;
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

    if (process.env.JWT_SECRET) {
      jwt.sign(
        {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
    }

    if (req.user.role === "admin") {
      return res.redirect("/admin");
    }

    return res.redirect("/dashboard");
  }
);

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("nptel.sid", { path: "/" });
        res.redirect("/auth/login");
      });
    } else {
      res.clearCookie("nptel.sid", { path: "/" });
      res.redirect("/auth/login");
    }
  });
});

module.exports = router;
