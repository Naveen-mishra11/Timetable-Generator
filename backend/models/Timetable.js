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
  ],

  lunchAfter: { type: Number, default: 3 },
  periodsPerDay: { type: Number, default: 7 },
  
});

module.exports = mongoose.model("Timetable", timetableSchema);
