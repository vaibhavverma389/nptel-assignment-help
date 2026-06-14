const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true },
    userName: { type: String, required: true },
    activityType: { type: String, enum: ["upload", "download", "approve_note", "reject_note", "delete_note"], required: true },
    itemType: { type: String, enum: ["Note", "WeekMaterial"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    fileName: { type: String, required: true },
    subject: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  {
    timestamps: false
  }
);

activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ email: 1 });
activityLogSchema.index({ activityType: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
