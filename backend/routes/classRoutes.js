const express = require("express");
const router = express.Router();
const Class = require("../models/Class");

// Add a new class
router.post("/", async (req, res) => {
  try {
    const newClass = new Class(req.body);
    await newClass.save();
    // populate subjects before sending response
    await newClass.populate("subjects");
    res.json(newClass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all classes
router.get("/", async (req, res) => {
  try {
    const classes = await Class.find().populate("subjects");
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get class by ID
router.get("/:id", async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id).populate("subjects");
    if (!classData) return res.status(404).json({ error: "Class not found" });
    res.json(classData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a class
router.put("/:id", async (req, res) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("subjects");
    if (!updatedClass) return res.status(404).json({ error: "Class not found" });
    res.json(updatedClass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a class
router.delete("/:id", async (req, res) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) return res.status(404).json({ error: "Class not found" });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
