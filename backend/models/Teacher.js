const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true }, 
  maxConsecutive: { type: Number, default: 2 } 
});

module.exports = mongoose.model("Teacher", teacherSchema);
