const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,

  role: {
    type: String,
    default: "student"
  },

  date: {
    type: Date,
    default: Date.now
  },

  // ✅ NEW: last active time
  lastActive: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
