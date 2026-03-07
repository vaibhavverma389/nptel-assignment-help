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

  responseTime: Number,

  visitedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("VisitorLog", VisitorLogSchema);