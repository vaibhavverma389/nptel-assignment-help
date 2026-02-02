const mongoose = require("mongoose");

const VisitorLogSchema = new mongoose.Schema({
  ip: String,
  path: String,
  method: String,
  statusCode: Number,

  email: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  role: String,
  isAuthenticated: Boolean,

  isp: String,
  asn: String,

  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },

  device: {
    browser: String,
    os: String,
    device: String
  },

  referrer: String,
  responseTime: String,
  visitedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("VisitorLog", VisitorLogSchema);
