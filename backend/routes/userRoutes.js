const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/teachers", async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("_id username");

    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

module.exports = router;
