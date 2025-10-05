const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
  className: { type: String, required: true },
  schedule: [
    {
      day: String,
      time: String,
      subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
      teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      room: String
    }
  ]
});

module.exports = mongoose.model("Timetable", timetableSchema);
