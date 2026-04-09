const express = require("express");
const router = express.Router();
const isAuth = require("../middlewares/auth");
const ContactMessage = require("../models/ContactMessage");

router.post("/contact-us", isAuth, async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    await ContactMessage.create({
      name,
      email,
      mobile,
      message,
      userId: req.user._id
    });

    req.flash("success", "Message sent successfully ✅");
    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong ❌");
    res.redirect("/dashboard");
  }
});

module.exports = router;
