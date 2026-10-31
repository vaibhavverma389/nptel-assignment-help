const express = require("express");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");
const { contactLimiter } = require("../middlewares/rateLimiter");

router.post("/contact-us", contactLimiter, async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    if (!name || !email || !mobile || !message) {
      req.flash("error", "All fields are required");
      return res.redirect(req.get("Referrer") || "/");
    }

    // Basic length limits to prevent DoS / payload flooding
    const safeName = String(name).trim().slice(0, 100);
    const safeEmail = String(email).trim().toLowerCase().slice(0, 150);
    const safeMobile = String(mobile).trim().slice(0, 20);
    const safeMessage = String(message).trim().slice(0, 2000);

    await ContactMessage.create({
      name: safeName,
      email: safeEmail,
      mobile: safeMobile,
      message: safeMessage,
      userId: req.user ? req.user._id : null
    });

    req.flash("success", "Message sent successfully ✅");
    res.redirect(req.get("Referrer") || "/");

  } catch (err) {
    console.error("Contact message error:", err.message);
    req.flash("error", "Something went wrong sending your message ❌");
    res.redirect(req.get("Referrer") || "/");
  }
});

module.exports = router;
