const mongoose = require("mongoose");

const VisitorLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },

  email: {
    type: String,
    index: true
  },

  role: String,

  ip: String,
  path: {
    type: String,
    index: true
  },

  method: String,
  statusCode: Number,

  responseTime: Number,

  visitedAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, { versionKey: false });

module.exports = mongoose.model("VisitorLog", VisitorLogSchema);
