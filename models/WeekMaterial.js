const mongoose = require("mongoose");

const weekMaterialSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },

  week: {
    type: Number,
    required: function() {
      return this.type === "assignment";
    },
    validate: {
      validator: function(v) {
        if (this.type === "assignment") {
          return Number.isInteger(v) && v >= 1 && v <= 12;
        }
        return v === undefined || v === null || (Number.isInteger(v) && v >= 1 && v <= 12);
      },
      message: "Week must be between 1 and 12 for assignments"
    }
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

/* 🔥 UNIQUE COMBINATION (IMPORTANT - PARTIAL INDEX FOR ASSIGNMENTS) */
weekMaterialSchema.index(
  { subject: 1, week: 1, type: 1 },
  { 
    unique: true,
    partialFilterExpression: { week: { $exists: true, $ne: null } }
  }
);

module.exports = mongoose.model("WeekMaterial", weekMaterialSchema);