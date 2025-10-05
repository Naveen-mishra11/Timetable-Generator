const express = require("express");
const { generateTimetable } = require("../controllers/timetableController");
const authMiddleware = require("../middleware/authMiddleware");
const Timetable = require("../models/Timetable"); //  Import model

const router = express.Router();

router.post("/generate", authMiddleware, generateTimetable);

router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { className, schedule } = req.body;

    if (!className || !schedule) {
      return res.status(400).json({ error: "className and schedule required" });
    }

    // Try to find existing timetable for the class
    let timetable = await Timetable.findOne({ className });

    if (timetable) {
      // Update existing timetable
      timetable.schedule = schedule;
      await timetable.save();
      return res.json({ message: "Timetable updated successfully", timetable });
    } else {
      // Create new timetable
      timetable = new Timetable({ className, schedule });
      await timetable.save();
      return res
        .status(201)
        .json({ message: "Timetable saved successfully", timetable });
    }
  } catch (err) {
    console.error("Error saving timetable:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all timetables
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const timetables = await Timetable.find()
      .populate("schedule.subject")
      .populate("schedule.teacher");
    res.json(timetables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete all timetables
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
