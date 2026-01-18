const mongoose = require("mongoose");

const visitorLogSchema = new mongoose.Schema({
  ip: String,

  email: {
    type: String,
    default: null
  },

  isp: String,
  asn: String,
  userAgent: String,
  path: String,

  visitedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("VisitorLog", visitorLogSchema);
