const mongoose = require("mongoose");

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const leaveRequestSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    weekday: {
      type: String,
      enum: WEEKDAYS,
      required: true,
    },
    isFullDay: { type: Boolean, default: true },
    periods: {
      type: [String],
      default: [],
      // e.g. ["P1","P2","P3"]
    },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    adminComment: { type: String, default: "" },
  },
  { timestamps: true }
);

leaveRequestSchema.statics.WEEKDAYS = WEEKDAYS;

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
