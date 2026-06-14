const mongoose = require("mongoose");

const visitorLogSchema = new mongoose.Schema(
  {
    // 👤 User Info
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    email: { type: String, default: "guest" },
    role: { type: String, default: "guest" },

    // 🌐 IP Info (privacy safe)
    ip: { type: String, select: false }, // ❌ hide by default
    hashedIP: { type: String, index: true },

    // 📍 Geo Info
    country: { type: String, index: true },
    city: String,
    region: String,
    timezone: String,
    postal: String,
    lat: Number,
    lon: Number,
    isp: String,
    asn: String,

    // 🌍 Request Info
    path: { type: String, index: true },
    method: String,
    statusCode: Number,
    responseTime: Number,
    eventType: { type: String, index: true }, // 🔥 important

    // 💻 Device Info
    device: String,
    browser: String,
    browserVersion: String,
    os: String,
    isBot: { type: Boolean, index: true },

    // 🔗 Tracking Info
    referer: String,
    language: String,
    dnt: Boolean,
    isAjax: Boolean,
    secFetchSite: String,
    secFetchMode: String,
    protocol: String,
    queryParams: [String],

    // 🔐 Session
    sessionId: { type: String, index: true },

    // 💻 Client System Info
    screenWidth: Number,
    screenHeight: Number,
    connectionType: String,
    cpuCores: Number,
    deviceMemory: Number,

    // ⏱️ Time
    visitedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);


module.exports = mongoose.model("VisitorLog", visitorLogSchema);