const express = require("express");
const { generateTimetable } = require("../controllers/timetableController");
const authMiddleware = require("../middleware/authMiddleware");
const Timetable = require("../models/Timetable");

const router = express.Router();

// GENERATE TIMETABLE
router.post("/generate", authMiddleware, generateTimetable);

// SAVE TIMETABLE
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { className, schedule, lunchAfter, periodsPerDay } = req.body;

    if (!className || !schedule) {
      return res.status(400).json({ error: "className and schedule required" });
    }

    let timetable = await Timetable.findOne({ className });

    if (timetable) {
      // ⭐ Update existing timetable
      timetable.schedule = schedule;

      if (lunchAfter !== undefined) timetable.lunchAfter = lunchAfter;
      if (periodsPerDay !== undefined) timetable.periodsPerDay = periodsPerDay;

      await timetable.save();

      return res.json({
        message: "Timetable updated successfully",
        timetable,
      });
    } else {
      // ⭐ Create new timetable with new fields
      timetable = new Timetable({
        className,
        schedule,
        lunchAfter: lunchAfter ?? 3,
        periodsPerDay: periodsPerDay ?? 7,
      });

      await timetable.save();

      return res.status(201).json({
        message: "Timetable saved successfully",
        timetable,
      });
    }
  } catch (err) {
    console.error("Error saving timetable:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET ALL TIMETABLES
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const timetables = await Timetable.find()
      .populate("schedule.subject")
      .populate({
    path: "schedule.teacher",
    populate: {
      path: "user",
      select: "username",
    },
  });

    res.json(timetables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE ALL
router.delete("/delete-all", authMiddleware, async (req, res) => {
  try {
    await Timetable.deleteMany({});
    res.json({ message: "All timetables deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
