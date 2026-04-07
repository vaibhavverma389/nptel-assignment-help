const mongoose = require("mongoose");

const weekMaterialSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },

  week: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },

  type: {
    type: String,
    enum: ["material", "assignment"],
    required: true,
    default: "material"
  },

  fileUrl: {
    type: String,
    required: true
  }

}, {
  timestamps: true   // 🔥 createdAt, updatedAt
});

/* 🔥 UNIQUE COMBINATION (IMPORTANT) */
weekMaterialSchema.index({ subject: 1, week: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("WeekMaterial", weekMaterialSchema);