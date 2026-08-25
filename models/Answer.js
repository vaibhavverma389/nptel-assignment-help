const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  course: String,
  week: Number,
  question: Number,
  option: String,
  user: String,
  email: String,        
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/* Indexes for Fast Answer Queries */
answerSchema.index({ course: 1, week: 1 });
answerSchema.index({ email: 1, course: 1, week: 1 });

module.exports = mongoose.model("Answer", answerSchema);

