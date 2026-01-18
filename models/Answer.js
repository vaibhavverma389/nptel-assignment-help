const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  course: String,
  week: Number,
  question: Number,
  option: String,
  user: String,
  email: String,        // ✅ ADD THIS
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Answer", answerSchema);
