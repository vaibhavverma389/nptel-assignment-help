const express = require("express");
const router = express.Router();
// ❌ remove isAuth
const ContactMessage = require("../models/ContactMessage");

router.post("/contact-us", async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    await ContactMessage.create({
      name,
      email,
      mobile,
      message,
      email1: req.user ? req.user.email : "N/A",
      name1: req.user ? req.user.name : "Guest",
      // ✅ optional userId (only if logged in)
      userId: req.user ? req.user._id : null
    });

    req.flash("success", "Message sent successfully ✅");
    res.redirect(req.get("Referrer") || "/");

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong ❌");
    res.redirect(req.get("Referrer") || "/");
  }
});

module.exports = router;