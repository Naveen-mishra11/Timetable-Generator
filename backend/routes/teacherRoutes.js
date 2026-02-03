const express = require("express");
const router = express.Router();
const Teacher = require("../models/Teacher");
const authMiddleware = require("../middleware/authMiddleware");

// Get teacher profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user.id })
      .populate("subjects")
      .populate("user", "username");

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    res.json({
      _id: teacher._id,
      name: teacher.user.username,
      subjects: teacher.subjects,
    });
  } catch (err) {
    console.error("Get teacher profile error:", err);
    res.status(500).json({ error: err.message });
  }
});


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
    const teachers = await Teacher.find()
      .populate("subjects")
      .populate("user", "username") // populate name, code, and type (theory/lab)
      .lean();

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
