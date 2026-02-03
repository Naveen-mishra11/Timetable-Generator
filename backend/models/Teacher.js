const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  subjects: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true }
  ],

  teachingType: {
    type: [String],
    enum: ["theory", "lab"],
    default: ["theory"],
  },

  maxConsecutive: { type: Number, default: 2 },
});


module.exports = mongoose.model("Teacher", teacherSchema);
