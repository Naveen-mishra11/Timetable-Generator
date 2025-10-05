const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Timetable = require("../models/Timetable");

exports.generateTimetable = async (req, res) => {
  try {
    const { days, periodsPerDay = 7 } = req.body;

    if (!days || !Array.isArray(days) || !days.length) {
      return res.status(400).json({ error: "Please provide days as a non-empty array" });
    }

    // Fetch all classes with their subjects
    const classes = await Class.find().populate("subjects");
    if (!classes.length) {
      return res.status(400).json({ error: "No classes found in database" });
    }

    // Fetch all teachers
    const teachers = await Teacher.find().populate("subject");
    if (!teachers.length) {
      return res.status(400).json({ error: "No teachers found in database" });
    }

    let timetable = {};
    let teacherAllocation = {}; // { "Monday_P1": [teacherId1, teacherId2] }

    // Track subject frequency per class
    let subjectFrequency = {}; // { "ClassName_subjectId": count }

    for (let cls of classes) {
      const className = cls.name;
      const classRoom = `Room-${Math.floor(Math.random() * 300) + 100}`;

      timetable[className] = [];

      for (let day of days) {
        let lastSubject = null;
        let lastTeacher = null;
        let dailySchedule = [];

        for (let p = 1; p <= periodsPerDay; p++) {
          const slotKey = `${day}_P${p}`;

          if (!cls.subjects.length) {
            dailySchedule.push({
              day,
              time: `P${p}`,
              subject: "No Subject",
              teacher: "No Teacher",
              room: classRoom,
            });
            continue;
          }

          // Filter candidate subjects → not same as lastSubject, and not exceeding weekly limit
          const availableSubjects = cls.subjects.filter((sub) => {
            const subKey = `${className}_${sub._id}`;
            const count = subjectFrequency[subKey] || 0;
            return sub.name !== lastSubject && count < days.length * 2; // max twice per week
          });

          if (!availableSubjects.length) {
            dailySchedule.push({
              day,
              time: `P${p}`,
              subject: "Free Period",
              teacher: "-",
              room: classRoom,
            });
            continue;
          }

          // Randomly pick subject
          const subject =
            availableSubjects[Math.floor(Math.random() * availableSubjects.length)];

          // Update frequency
          const subKey = `${className}_${subject._id}`;
          subjectFrequency[subKey] = (subjectFrequency[subKey] || 0) + 1;

          // Get teachers for this subject
          const possibleTeachers = teachers.filter(
            (t) => t.subject && t.subject._id.toString() === subject._id.toString()
          );

          let teacherName = "No Teacher";

          if (possibleTeachers.length) {
            // Shuffle teachers so not always the same
            const shuffled = [...possibleTeachers].sort(() => 0.5 - Math.random());

            let teacher = null;
            for (let t of shuffled) {
              // avoid conflict → teacher already in same slot in another class
              if (teacherAllocation[slotKey]?.includes(t._id.toString())) continue;

              // avoid consecutive repetition
              if (lastTeacher && lastTeacher.toString() === t._id.toString()) continue;

              teacher = t;
              break;
            }

            if (teacher) {
              teacherName = teacher.name;
              lastTeacher = teacher._id;

              if (!teacherAllocation[slotKey]) teacherAllocation[slotKey] = [];
              teacherAllocation[slotKey].push(teacher._id.toString());
            }
          }

          lastSubject = subject.name;

          dailySchedule.push({
            day,
            time: `P${p}`,
            subject: subject.name,
            teacher: teacherName,
            room: classRoom,
          });
        }

        timetable[className].push(...dailySchedule);
      }
    }

    res.json(timetable);
  } catch (err) {
    console.error("Timetable generation error:", err);
    res.status(500).json({ error: err.message });
  }
};
