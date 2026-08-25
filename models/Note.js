const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  email: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, {
  timestamps: true
});

/* Indexes for High Performance Queries */
noteSchema.index({ email: 1, isFavorite: 1 });
noteSchema.index({ subject: 1, status: 1 });
noteSchema.index({ status: 1, createdAt: -1 });
noteSchema.index({ email: 1, lastAccessed: -1 });

module.exports = mongoose.model("Note", noteSchema);

