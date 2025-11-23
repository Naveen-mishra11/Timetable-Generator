const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Timetable = require("../models/Timetable");

// Generate Timetable
exports.generateTimetable = async (req, res) => {
  try {
    const { days, periodsPerDay = 7 } = req.body;

    if (!days || !Array.isArray(days) || !days.length) {
      return res.status(400).json({ error: "Please provide days as a non-empty array" });
    }

    const classes = await Class.find().populate("subjects");
    if (!classes.length) return res.status(400).json({ error: "No classes found" });

    const teachers = await Teacher.find().populate("subjects");
    if (!teachers.length) return res.status(400).json({ error: "No teachers found" });

    let globalTeacherAllocation = {};
    let globalTeacherWeeklyHours = {};
    let teacherConsecutiveCount = {};
    let teacherLastPeriod = {};

    const canAssignTeacher = (teacher, day, period, isLab = false) => {
      const tId = teacher._id.toString();
      const slotKey = `${day}_P${period}`;
      const nextSlotKey = `${day}_P${period + 1}`;
      const dayKey = `${tId}_${day}`;

      if (globalTeacherAllocation[slotKey]?.includes(tId)) return false;
      if (isLab && globalTeacherAllocation[nextSlotKey]?.includes(tId)) return false;

      const currentHours = globalTeacherWeeklyHours[tId] || 0;
      const requiredHours = isLab ? 2 : 1;
      if (currentHours + requiredHours > 17) return false;

      const maxConsecutive = teacher.maxConsecutive || 2;
      const lastPeriod = teacherLastPeriod[dayKey];
      const consecutiveCount = teacherConsecutiveCount[dayKey] || 0;

      if (lastPeriod && period === lastPeriod + 1) {
        if (consecutiveCount >= maxConsecutive) return false;
      }

      return true;
    };

    const assignTeacher = (teacher, day, period, isLab = false) => {
      const tId = teacher._id.toString();
      const slotKey = `${day}_P${period}`;
      const nextSlotKey = `${day}_P${period + 1}`;
      const dayKey = `${tId}_${day}`;
      const lastPeriod = teacherLastPeriod[dayKey];

      if (!globalTeacherAllocation[slotKey]) globalTeacherAllocation[slotKey] = [];
      globalTeacherAllocation[slotKey].push(tId);

      if (isLab) {
        if (!globalTeacherAllocation[nextSlotKey]) globalTeacherAllocation[nextSlotKey] = [];
        globalTeacherAllocation[nextSlotKey].push(tId);
      }

      const requiredHours = isLab ? 2 : 1;
      globalTeacherWeeklyHours[tId] = (globalTeacherWeeklyHours[tId] || 0) + requiredHours;

      if (lastPeriod && period === lastPeriod + 1) {
        teacherConsecutiveCount[dayKey] = (teacherConsecutiveCount[dayKey] || 0) + 1;
      } else {
        teacherConsecutiveCount[dayKey] = 1;
      }

      teacherLastPeriod[dayKey] = isLab ? period + 1 : period;
    };

    let allTimetables = [];

    for (let cls of classes) {
      const className = cls.name;
      const classSubjects = cls.subjects;

      // STEP 1: Map subjects to teachers (one teacher per subject)
      let subjectTeacherMap = {};
      const subjectsByName = {};

      for (let subject of classSubjects) {
        const subjectName = subject.name.trim().toLowerCase();
        if (!subjectsByName[subjectName]) subjectsByName[subjectName] = [];
        subjectsByName[subjectName].push(subject);
      }

      for (let subjectName in subjectsByName) {
        const subjects = subjectsByName[subjectName];
        const candidateTeachers = teachers.filter(t =>
          t.subjects.some(s =>
            subjects.some(sub => s._id.toString() === sub._id.toString())
          )
        );

        if (candidateTeachers.length > 0) {
          const chosen = candidateTeachers[Math.floor(Math.random() * candidateTeachers.length)];
          for (let sub of subjects) {
            subjectTeacherMap[sub._id.toString()] = chosen;
          }
        } else {
          console.warn(`⚠️ No teacher found for subject: ${subjectName}`);
        }
      }

      // STEP 2: Schedule labs
      let labScheduleMap = [];
      const labSubjects = cls.subjects.filter(sub => sub.type === "lab");
      let labsScheduledThisWeek = new Set();

      for (let day of days) {
        if (labsScheduledThisWeek.size >= labSubjects.length) break;

        let labScheduledToday = false;
        for (let p = 1; p <= periodsPerDay - 1; p++) {
          if (labScheduledToday) break;

          const availableLabs = labSubjects.filter(lab => !labsScheduledThisWeek.has(lab._id.toString()));
          if (!availableLabs.length) break;

          const labSubject = availableLabs[Math.floor(Math.random() * availableLabs.length)];
          const assignedTeacher = subjectTeacherMap[labSubject._id.toString()];
          if (!assignedTeacher) continue;

          if (canAssignTeacher(assignedTeacher, day, p, true)) {
            assignTeacher(assignedTeacher, day, p, true);
            labsScheduledThisWeek.add(labSubject._id.toString());
            labScheduledToday = true;

            labScheduleMap.push({
              day,
              period: p,
              subject: labSubject,
              teacher: assignedTeacher
            });
          }
        }
      }

      // STEP 3: Fill THEORY periods (YOUR OPTION B LOGIC APPLIED)
      const classRoom = `Room-${Math.floor(Math.random() * 300) + 100}`;
      let dailySchedule = [];
      let theorySubjectFrequency = {};

      // Add lab periods into daily schedule
      for (let lab of labScheduleMap) {
        const { day, period, subject, teacher } = lab;

        dailySchedule.push({
          day,
          time: `P${period}`,
          subject: subject._id,
          teacher: teacher._id,
          room: `Lab-${Math.floor(Math.random() * 20) + 1}`,
        });

        dailySchedule.push({
          day,
          time: `P${period + 1}`,
          subject: subject._id,
          teacher: teacher._id,
          room: `Lab-${Math.floor(Math.random() * 20) + 1}`,
        });
      }

      const theorySubjects = cls.subjects.filter(sub => sub.type === "theory");

      for (let day of days) {
        let lastSubject = null;

        for (let p = 1; p <= periodsPerDay; p++) {
          const slotOccupied = dailySchedule.some(e => e.day === day && e.time === `P${p}`);
          if (slotOccupied) continue;

          // Pick subject with MAX remaining hours whose teacher is available
          const pickableSubjects = theorySubjects.filter(sub => {
            const count = theorySubjectFrequency[sub._id.toString()] || 0;
            return count < (sub.hoursPerWeek || 4) && sub._id.toString() !== lastSubject;
          });

          if (!pickableSubjects.length) {
            dailySchedule.push({
              day,
              time: `P${p}`,
              subject: null,
              teacher: null,
              room: classRoom,
            });
            continue;
          }

          // SORT by remaining hours DESC
          pickableSubjects.sort((a, b) => {
            const remA = (a.hoursPerWeek || 4) - (theorySubjectFrequency[a._id.toString()] || 0);
            const remB = (b.hoursPerWeek || 4) - (theorySubjectFrequency[b._id.toString()] || 0);
            return remB - remA;
          });

          let selectedSubject = null;
          let selectedTeacher = null;

          for (let sub of pickableSubjects) {
            const teacherAssigned = subjectTeacherMap[sub._id.toString()];
            if (!teacherAssigned) continue;

            if (canAssignTeacher(teacherAssigned, day, p, false)) {
              selectedSubject = sub;
              selectedTeacher = teacherAssigned;
              assignTeacher(selectedTeacher, day, p, false);
              break;
            }
          }

          if (!selectedSubject) {
            dailySchedule.push({
              day,
              time: `P${p}`,
              subject: null,
              teacher: null,
              room: classRoom,
            });
            continue;
          }

          theorySubjectFrequency[selectedSubject._id.toString()] =
            (theorySubjectFrequency[selectedSubject._id.toString()] || 0) + 1;

          dailySchedule.push({
            day,
            time: `P${p}`,
            subject: selectedSubject._id,
            teacher: selectedTeacher._id,
            room: classRoom,
          });

          lastSubject = selectedSubject._id.toString();
        }
      }

      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
      dailySchedule.sort((a, b) => {
        const d = dayOrder[a.day] - dayOrder[b.day];
        if (d !== 0) return d;
        return parseInt(a.time.replace("P", "")) - parseInt(b.time.replace("P", ""));
      });

      await Timetable.deleteMany({ className });
      const newTimetable = new Timetable({ className, schedule: dailySchedule });
      await newTimetable.save();

      allTimetables.push(newTimetable);
    }

    const response = {};
    for (let tt of allTimetables) {
      const full = await Timetable.findById(tt._id)
        .populate("schedule.subject")
        .populate("schedule.teacher");

      response[full.className] = full.schedule.map(e => ({
        day: e.day,
        time: e.time,
        subject: e.subject?.name || "Free Period",
        teacher: e.teacher?.name || "-",
        room: e.room
      }));
    }

    res.json(response);
  } catch (err) {
    console.error("Timetable generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET timetable for a class
exports.getTimetable = async (req, res) => {
  try {
    const { className } = req.params;
    const timetable = await Timetable.findOne({ className })
      .populate("schedule.subject")
      .populate("schedule.teacher");

    if (!timetable)
      return res.status(404).json({ error: "Timetable not found for this class" });

    res.json(timetable);
  } catch (err) {
    console.error("Error fetching timetable:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET all timetables
exports.getAllTimetables = async (req, res) => {
  try {
    const tts = await Timetable.find()
      .populate("schedule.subject")
      .populate("schedule.teacher");

    res.json(tts);
  } catch (err) {
    console.error("Error fetching timetables:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE timetable
exports.deleteTimetable = async (req, res) => {
  try {
    const { className } = req.params;
    const out = await Timetable.deleteMany({ className });

    if (out.deletedCount === 0)
      return res.status(404).json({ error: "No timetable found for this class" });

    res.json({ message: "Timetable deleted", deletedCount: out.deletedCount });
  } catch (err) {
    console.error("Error deleting timetable:", err);
    res.status(500).json({ error: err.message });
  }
};
