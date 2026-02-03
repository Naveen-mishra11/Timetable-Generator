const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // JWT middleware
const Substitution = require("../models/Substitution");

// Teacher dashboard timetable
router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT

    // Find teacher using logged-in user
    const teacher = await require("../models/Teacher").findOne({
      user: userId,
    });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacherId = teacher._id;

    // A date can be passed to preview substitutions; default: today.
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // IMPORTANT: substitutions apply ONLY for the stored validForDate.
    // So we simply fetch substitutions for queryDate and overlay them, without recalculating weekdays.
    const subs = await Substitution.find({
      originalTeacher: teacherId,
      validForDate: queryDate,
    })
      .populate("subject")
      .populate({
        path: "substituteTeacher",
        populate: { path: "user", select: "username" },
      })
      .lean();

    // key: className_day_time
    const substitutionsByKey = subs.reduce((acc, s) => {
      acc[`${s.className}_${s.weekday}_${s.time}`] = s;
      return acc;
    }, {});

    // Get all timetables
    const timetables = await require("../models/Timetable")
      .find()
      .populate("schedule.subject")
      .populate({
        path: "schedule.teacher",
        populate: { path: "user", select: "username" },
      });

    let result = {};

    // Filter only this teacher's slots
    for (let tt of timetables) {
      const filteredSlots = tt.schedule.filter(
        (slot) =>
          slot.teacher && slot.teacher._id.toString() === teacherId.toString(),
      );

      if (!filteredSlots.length) continue;

      if (!result[tt.className]) {
        result[tt.className] = {};
      }

      for (let slot of filteredSlots) {
        if (!result[tt.className][slot.day]) {
          result[tt.className][slot.day] = [];
        }

        const subKey = `${tt.className}_${slot.day}_${slot.time}`;
        const sub = substitutionsByKey[subKey];
        const substituteName = sub?.substituteTeacher?.user?.username || null;
        const substitutionStatus = sub ? sub.status : null;

        result[tt.className][slot.day].push({
          time: slot.time,
          subject: slot.subject?.name || "N/A",
          room: slot.room,
          substituteTeacher: substituteName,
          substitutionStatus,
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Teacher timetable error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
