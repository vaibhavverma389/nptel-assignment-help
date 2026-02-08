const mongoose = require("mongoose");

const VisitorLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    index: true
  },
  path: String,
  method: String,
  statusCode: Number,

  email: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
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

  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },

  device: {
    type: {
      type: String,
      default: "desktop"
    },
    brand: {
      type: String,
      default: "Unknown"
    },
    model: {
      type: String,
      default: "Unknown"
    },
    browser: {
      type: String,
      default: "Unknown"
    },
    os: {
      type: String,
      default: "Unknown"
    }
  },

  referrer: String,
  responseTime: Number,

  visitedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("VisitorLog", VisitorLogSchema);
