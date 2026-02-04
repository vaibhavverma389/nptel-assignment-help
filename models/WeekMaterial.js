
const mongoose = require("mongoose");

const weekMaterialSchema = new mongoose.Schema({
  subject: String,
  week: Number,
  studyMaterialUrl: String,
  finalAnswerPdfUrl: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("WeekMaterial", weekMaterialSchema);
