const express = require("express");
const router = express.Router();
const Teacher = require("../models/Teacher");

// Add teacher
router.post("/", async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all teachers (with subject populated)
router.get("/", async (req, res) => {
  try {
    const teachers = await Teacher.find().populate("subject");
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete teacher by ID
router.delete("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
