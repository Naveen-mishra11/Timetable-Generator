const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  hoursPerWeek: { type: Number, default: 4 },
  type: {
    type: String,
    enum: ["theory", "lab"], // restricts to only these two values
    default: "theory",       // default value if not specified
    required: true
  }
});

module.exports = mongoose.model("Subject", subjectSchema);
