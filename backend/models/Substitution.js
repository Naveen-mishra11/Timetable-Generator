const mongoose = require("mongoose");

const substitutionSchema = new mongoose.Schema(
  {
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      required: true,
    },
    validForDate: {
      // Substitution applies only for this calendar date ("next coming Monday")
      type: Date,
      required: true,
    },
    className: { type: String, required: true },
    weekday: { type: String, required: true },
    time: { type: String, required: true }, // e.g. "P1"
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    originalTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    substituteTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    status: {
      type: String,
      enum: ["assigned", "unassigned"],
      default: "unassigned",
    },
  },
  { timestamps: true }
);

substitutionSchema.index({ validForDate: 1, weekday: 1, time: 1 });
substitutionSchema.index({ leaveRequest: 1 });

module.exports = mongoose.model("Substitution", substitutionSchema);
