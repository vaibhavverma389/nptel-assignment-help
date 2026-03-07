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
  rawIsp: String,       
  asn: String,
  networkType: {
    type: String,
    enum: ["Mobile Network", "Broadband"],
    default: "Broadband"
  },
  isMobileIP: {
    type: Boolean,
    default: false
  },
  proxy: {
    type: Boolean,
    default: false
  },

  // location
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },

  // device
  device: {
    browser: String,
    os: String,
    device: String
  },

  // misc
  referrer: String,
  responseTime: String,
  visitedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("VisitorLog", VisitorLogSchema);
