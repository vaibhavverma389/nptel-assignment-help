const mongoose = require("mongoose")

const visitorLogSchema = new mongoose.Schema({

  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  email: String,
  role: String,

  ip: { type: String, index: true },
hashedIP: { type: String },
  country: String,
  city: String,
  region: String,
  timezone: String,
  lat: Number,
  lon: Number,
  isp: String,

  path: { type: String, index: true },
  method: String,
  statusCode: Number,

  responseTime: Number,

  device: String,
  browser: String,
  os: String,

  isBot: Boolean,

  referer: String,
  language: String,

  sessionId: String,

  visitedAt: {
    type: Date,
    default: Date.now,
    index: true
  }

})

// 🔥 Important indexes for analytics
visitorLogSchema.index({ userId: 1, visitedAt: -1 })
visitorLogSchema.index({ path: 1, visitedAt: -1 })
visitorLogSchema.index({ country: 1 })
visitorLogSchema.index({ isBot: 1 })

module.exports = mongoose.model("VisitorLog", visitorLogSchema)