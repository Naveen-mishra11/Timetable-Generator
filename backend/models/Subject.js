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
  },
  labDuration: {
    type: Number,
    enum: [1, 2], // labs can be either 1 or 2 consecutive periods
    default: 2,   // default to 2 periods for backward compatibility
    validate: {
      validator: function(value) {
        // labDuration should only be set for lab subjects
        return this.type !== 'lab' || (value === 1 || value === 2);
      },
      message: 'Lab duration must be 1 or 2 periods for lab subjects'
    }
  }
});

module.exports = mongoose.model("Subject", subjectSchema);
