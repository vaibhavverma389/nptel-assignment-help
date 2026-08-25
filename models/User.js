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

  lastActive: {
    type: Date,
    default: null
  },
  photo: {
    type: String,
    default: null,
  },
  streak: {
    type: Number,
    default: 0
  },
  streakLastUpdated: {
    type: Date,
    default: null
  }

});

userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);

