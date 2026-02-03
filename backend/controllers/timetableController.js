const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Timetable = require("../models/Timetable");

// Generate Timetable
exports.generateTimetable = async (req, res) => {
  try {
    const { days, periodsPerDay = 7, lunchBreakAfter = null } = req.body;

    if (!days || !Array.isArray(days) || !days.length) {
      return res
        .status(400)
        .json({ error: "Please provide days as a non-empty array" });
    }

    const classes = await Class.find().populate("subjects");
    if (!classes.length)
      return res.status(400).json({ error: "No classes found" });

    const teachers = await Teacher.find()
      .populate("subjects")
      .populate("user", "username");

    if (!teachers.length)
      return res.status(400).json({ error: "No teachers found" });

    // Global state tracking - CRITICAL: This prevents double-booking across all classes
    let globalTeacherAllocation = {}; // Format: { "Monday_P1": ["teacherId1", "teacherId2"] }
    let globalTeacherWeeklyHours = {}; // Format: { "teacherId": hours }
    let teacherConsecutiveCount = {}; // Format: { "teacherId_Monday": count }
    let teacherLastPeriod = {}; // Format: { "teacherId_Monday": periodNumber }

    // Check if teacher is available for this slot (cross-class conflict detection)
    const isTeacherAvailable = (teacherId, day, period, isLab = false) => {
      const tId = teacherId.toString();
      const slotKey = `${day}_P${period}`;
      const nextSlotKey = `${day}_P${period + 1}`;
      const dayKey = `${tId}_${day}`;

      // CRITICAL CHECK: Is teacher already teaching another class at this time?
      if (globalTeacherAllocation[slotKey]?.includes(tId)) {
        return { available: false, reason: "conflict" };
      }
      
      // For labs, check next period too
      if (isLab && globalTeacherAllocation[nextSlotKey]?.includes(tId)) {
        return { available: false, reason: "lab_conflict" };
      }

      // Check weekly hours limit (17 hours max)
      const currentHours = globalTeacherWeeklyHours[tId] || 0;
      const requiredHours = isLab ? 2 : 1;
      if (currentHours + requiredHours > 17) {
        return { available: false, reason: "hours_limit" };
      }

      return { available: true, dayKey, currentHours };
    };

    const canAssignTeacher = (
      teacher,
      day,
      period,
      isLab = false,
      relaxConsecutive = false
    ) => {
      const tId = teacher._id.toString();
      const availability = isTeacherAvailable(tId, day, period, isLab);
      
      if (!availability.available) return false;

      // Check consecutive periods constraint (only if not relaxed)
      if (!relaxConsecutive) {
        const maxConsecutive = teacher.maxConsecutive || 2;
        const lastPeriod = teacherLastPeriod[availability.dayKey];
        const consecutiveCount = teacherConsecutiveCount[availability.dayKey] || 0;

        if (lastPeriod && period === lastPeriod + 1) {
          if (consecutiveCount >= maxConsecutive) return false;
        }
      }

      return true;
    };

    const assignTeacher = (teacher, day, period, isLab = false) => {
      const tId = teacher._id.toString();
      const slotKey = `${day}_P${period}`;
      const nextSlotKey = `${day}_P${period + 1}`;
      const dayKey = `${tId}_${day}`;
      const lastPeriod = teacherLastPeriod[dayKey];

      // Mark teacher as allocated for this slot
      if (!globalTeacherAllocation[slotKey])
        globalTeacherAllocation[slotKey] = [];
      globalTeacherAllocation[slotKey].push(tId);

      // For labs, mark next period too
      if (isLab) {
        if (!globalTeacherAllocation[nextSlotKey])
          globalTeacherAllocation[nextSlotKey] = [];
        globalTeacherAllocation[nextSlotKey].push(tId);
      }

      // Update hours
      const requiredHours = isLab ? 2 : 1;
      globalTeacherWeeklyHours[tId] =
        (globalTeacherWeeklyHours[tId] || 0) + requiredHours;

      // Update consecutive tracking
      if (lastPeriod && period === lastPeriod + 1) {
        teacherConsecutiveCount[dayKey] =
          (teacherConsecutiveCount[dayKey] || 0) + 1;
      } else {
        teacherConsecutiveCount[dayKey] = 1;
      }

      teacherLastPeriod[dayKey] = isLab ? period + 1 : period;
    };

    const unassignTeacher = (teacher, day, period, isLab = false) => {
      const tId = teacher._id.toString();
      const slotKey = `${day}_P${period}`;
      const nextSlotKey = `${day}_P${period + 1}`;
      const dayKey = `${tId}_${day}`;

      if (globalTeacherAllocation[slotKey]) {
        globalTeacherAllocation[slotKey] = globalTeacherAllocation[slotKey].filter(id => id !== tId);
      }
      if (isLab && globalTeacherAllocation[nextSlotKey]) {
        globalTeacherAllocation[nextSlotKey] = globalTeacherAllocation[nextSlotKey].filter(id => id !== tId);
      }

      const requiredHours = isLab ? 2 : 1;
      globalTeacherWeeklyHours[tId] = Math.max(0, (globalTeacherWeeklyHours[tId] || 0) - requiredHours);
      
      teacherConsecutiveCount[dayKey] = 0;
      teacherLastPeriod[dayKey] = null;
    };

    // Get teacher workload score
    const getTeacherLoadScore = (teacher) => {
      return globalTeacherWeeklyHours[teacher._id.toString()] || 0;
    };

    // ENHANCED: Find best teacher with strict conflict checking
    const findBestTeacher = (
      subject,
      day,
      period,
      isLab,
      lastTeacherId,
      allTeachers,
      preferredTeacher = null,
      avoidTeachers = new Set()
    ) => {
      const subjectId = subject._id.toString();
      
      // Filter qualified teachers
      const qualifiedTeachers = allTeachers.filter(
        (t) =>
          t.subjects.some((s) => s._id.toString() === subjectId) &&
          t.teachingType.includes(isLab ? "lab" : "theory") &&
          !avoidTeachers.has(t._id.toString())
      );

      if (!qualifiedTeachers.length) return null;

      // STRICT CHECK: Filter out teachers already booked at this slot
      const availableTeachers = qualifiedTeachers.filter(t => {
        const availability = isTeacherAvailable(t._id, day, period, isLab);
        return availability.available;
      });

      if (!availableTeachers.length) {
        console.log(`    ⚠️ No available teachers for ${subject.name} at ${day} P${period} - all are conflicted or at hour limit`);
        return null;
      }

      // Sort by current workload (ascending) for load balancing
      const sortedByLoad = availableTeachers.sort((a, b) => {
        return getTeacherLoadScore(a) - getTeacherLoadScore(b);
      });

      // Strategy 1: Try preferred teacher if available and not consecutive
      if (preferredTeacher) {
        const preferred = sortedByLoad.find(
          (t) => t._id.toString() === preferredTeacher.toString()
        );
        if (
          preferred &&
          (!lastTeacherId ||
            lastTeacherId.toString() !== preferred._id.toString())
        ) {
          // Check consecutive constraint
          const maxConsecutive = preferred.maxConsecutive || 2;
          const dayKey = `${preferred._id.toString()}_${day}`;
          const lastP = teacherLastPeriod[dayKey];
          const consecCount = teacherConsecutiveCount[dayKey] || 0;
          
          if (!lastP || period !== lastP + 1 || consecCount < maxConsecutive) {
            return preferred;
          }
        }
      }

      // Strategy 2: Try least loaded teachers first, avoiding consecutive same teacher
      for (let teacher of sortedByLoad) {
        if (
          lastTeacherId &&
          lastTeacherId.toString() === teacher._id.toString()
        )
          continue;
        
        const maxConsecutive = teacher.maxConsecutive || 2;
        const dayKey = `${teacher._id.toString()}_${day}`;
        const lastP = teacherLastPeriod[dayKey];
        const consecCount = teacherConsecutiveCount[dayKey] || 0;
        
        if (lastP && period === lastP + 1 && consecCount >= maxConsecutive) 
          continue;
          
        return teacher;
      }

      // Strategy 3: Allow consecutive if absolutely necessary
      for (let teacher of sortedByLoad) {
        return teacher;
      }

      return null;
    };

    // Calculate class requirements for prioritization
    const calculateClassRequirements = (cls) => {
      let totalHours = 0;
      const labSubjects = cls.subjects.filter(s => s.type === 'lab');
      const theorySubjects = cls.subjects.filter(s => s.type === 'theory');
      
      labSubjects.forEach(sub => {
        totalHours += (sub.hoursPerWeek || 2);
      });
      theorySubjects.forEach(sub => {
        totalHours += (sub.hoursPerWeek || 4);
      });
      
      return { totalHours, labCount: labSubjects.length, theoryCount: theorySubjects.length };
    };

    // Sort classes by difficulty (most constrained first)
    const sortedClasses = [...classes].sort((a, b) => {
      const reqA = calculateClassRequirements(a);
      const reqB = calculateClassRequirements(b);
      if (reqB.labCount !== reqA.labCount) return reqB.labCount - reqA.labCount;
      return reqB.totalHours - reqA.totalHours;
    });

    let allTimetables = [];

    for (let cls of sortedClasses) {
      const className = cls.name;
      const classSubjects = cls.subjects;

      console.log(`\n📚 Processing ${className}...`);

      // Step 1: Build subject-teacher mapping with load balancing
      let subjectTeacherMap = {};
      const subjectsByName = {};

      for (let subject of classSubjects) {
        const subjectName = subject.name
          .trim()
          .toLowerCase()
          .replace(/\s*lab\s*$/i, "")
          .trim();
        if (!subjectsByName[subjectName]) subjectsByName[subjectName] = [];
        subjectsByName[subjectName].push(subject);
      }

      for (let subjectName in subjectsByName) {
        const subjects = subjectsByName[subjectName];
        const hasLab = subjects.some((s) => s.type === "lab");
        const hasTheory = subjects.some((s) => s.type === "theory");

        const candidateTeachers = teachers.filter((t) => {
          const canTeachAll = subjects.every((sub) =>
            t.subjects.some((ts) => ts._id.toString() === sub._id.toString())
          );

          let hasRequiredTypes = true;
          if (hasLab && !t.teachingType.includes("lab"))
            hasRequiredTypes = false;
          if (hasTheory && !t.teachingType.includes("theory"))
            hasRequiredTypes = false;

          return canTeachAll && hasRequiredTypes;
        });

        if (candidateTeachers.length > 0) {
          // Choose teacher with lowest current workload
          const chosen = candidateTeachers.sort((a, b) => 
            getTeacherLoadScore(a) - getTeacherLoadScore(b)
          )[0];
          
          for (let sub of subjects) {
            subjectTeacherMap[sub._id.toString()] = chosen;
          }
        } else {
          // Fallback: assign separately with load balancing
          for (let sub of subjects) {
            const fallbackTeachers = teachers.filter(
              (t) =>
                t.subjects.some(
                  (ts) => ts._id.toString() === sub._id.toString()
                ) && t.teachingType.includes(sub.type)
            );
            if (fallbackTeachers.length > 0) {
              subjectTeacherMap[sub._id.toString()] = fallbackTeachers.sort((a, b) => 
                getTeacherLoadScore(a) - getTeacherLoadScore(b)
              )[0];
            }
          }
        }
      }

      console.log(`👩‍🏫 Teacher assignment for ${className}:`);
      for (let [subId, teacher] of Object.entries(subjectTeacherMap)) {
        const sub = classSubjects.find((s) => s._id.toString() === subId);
        if (sub && teacher && teacher.user) {
          console.log(`  ${sub.name} → ${teacher.user.username} (${getTeacherLoadScore(teacher)}h)`);
        }
      }

      // Step 2: Schedule labs with conflict checking
      let labScheduleMap = [];
      const labSubjects = cls.subjects.filter((sub) => sub.type === "lab");
      let labsScheduledThisWeek = new Set();

      const scheduleLabs = () => {
        // Clear previous lab assignments for this class
        labScheduleMap.forEach(lab => {
          unassignTeacher(lab.teacher, lab.day, lab.period, true);
        });
        labScheduleMap = [];
        labsScheduledThisWeek.clear();

        const shuffledDays = [...days].sort(() => Math.random() - 0.5);
        
        for (let day of shuffledDays) {
          if (labsScheduledThisWeek.size >= labSubjects.length) break;

          let labScheduledToday = false;
          const possiblePeriods = [];
          for (let p = 1; p <= periodsPerDay - 1; p++) {
            if (lunchBreakAfter && p === lunchBreakAfter) continue;
            possiblePeriods.push(p);
          }
          
          const shuffledPeriods = possiblePeriods.sort(() => Math.random() - 0.5);

          for (let p of shuffledPeriods) {
            if (labScheduledToday || labsScheduledThisWeek.size >= labSubjects.length) break;

            const availableLabs = labSubjects.filter(
              (lab) => !labsScheduledThisWeek.has(lab._id.toString())
            );
            if (availableLabs.length === 0) break;

            for (let labSubject of availableLabs) {
              const primaryTeacher = subjectTeacherMap[labSubject._id.toString()];
              
              // STRICT: Check if primary teacher is available at this slot
              let selectedTeacher = null;
              
              if (primaryTeacher) {
                const avail = isTeacherAvailable(primaryTeacher._id, day, p, true);
                if (avail.available) {
                  selectedTeacher = primaryTeacher;
                }
              }
              
              // If primary not available, find any available qualified teacher
              if (!selectedTeacher) {
                selectedTeacher = findBestTeacher(
                  labSubject,
                  day,
                  p,
                  true,
                  null,
                  teachers,
                  null
                );
              }

              if (selectedTeacher) {
                assignTeacher(selectedTeacher, day, p, true);
                labsScheduledThisWeek.add(labSubject._id.toString());
                labScheduledToday = true;

                labScheduleMap.push({
                  day,
                  period: p,
                  subject: labSubject,
                  teacher: selectedTeacher,
                });
                break;
              }
            }
          }
        }
        
        return labsScheduledThisWeek.size === labSubjects.length;
      };

      let labsFullyScheduled = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (scheduleLabs()) {
          labsFullyScheduled = true;
          break;
        }
      }

      if (!labsFullyScheduled) {
        console.log(`  ⚠️ Warning: Could not schedule all labs for ${className}`);
      }

      // Step 3: Fill theory subjects with strict conflict checking
      const classRoom = `Room-${Math.floor(Math.random() * 300) + 100}`;
      let dailySchedule = [];
      let theorySubjectFrequency = {};

      // Add labs to schedule
      for (let lab of labScheduleMap) {
        const { day, period, subject, teacher } = lab;
        const labRoom = `Lab-${Math.floor(Math.random() * 20) + 1}`;
        dailySchedule.push({
          day,
          time: `P${period}`,
          subject: subject._id,
          teacher: teacher._id,
          room: labRoom,
        });
        dailySchedule.push({
          day,
          time: `P${period + 1}`,
          subject: subject._id,
          teacher: teacher._id,
          room: labRoom,
        });
      }

      const theorySubjects = cls.subjects.filter(
        (sub) => sub.type === "theory"
      );

      theorySubjects.forEach(sub => {
        theorySubjectFrequency[sub._id.toString()] = 0;
      });

      const getSubjectPriority = (sub) => {
        const current = theorySubjectFrequency[sub._id.toString()] || 0;
        const max = sub.hoursPerWeek || 4;
        return max - current;
      };

      for (let day of days) {
        let lastSubject = null;
        let lastTeacher = null;

        for (let p = 1; p <= periodsPerDay; p++) {
          if (lunchBreakAfter && p === lunchBreakAfter) {
            dailySchedule.push({
              day,
              time: `LUNCH`,
              subject: "LUNCH BREAK",
              teacher: null,
              room: "Cafeteria",
              isBreak: true,
            });
            continue;
          }

          const slotOccupied = dailySchedule.some(
            (e) => e.day === day && e.time === `P${p}`
          );
          if (slotOccupied) {
            const occupiedSlot = dailySchedule.find(
              (e) => e.day === day && e.time === `P${p}`
            );
            if (occupiedSlot && !occupiedSlot.isBreak) {
              lastSubject = occupiedSlot.subject;
              lastTeacher = occupiedSlot.teacher;
            }
            continue;
          }

          const sortedSubjects = [...theorySubjects].sort((a, b) => 
            getSubjectPriority(b) - getSubjectPriority(a)
          );

          let availableTheory = sortedSubjects.filter((sub) => {
            const count = theorySubjectFrequency[sub._id.toString()] || 0;
            const maxHours = sub.hoursPerWeek || 4;
            return count < maxHours && sub._id.toString() !== lastSubject?.toString();
          });

          if (!availableTheory.length) {
            availableTheory = sortedSubjects.filter((sub) => {
              const count = theorySubjectFrequency[sub._id.toString()] || 0;
              const maxHours = sub.hoursPerWeek || 4;
              return count < maxHours;
            });
          }

          if (!availableTheory.length) {
            dailySchedule.push({
              day,
              time: `P${p}`,
              subject: null,
              teacher: null,
              room: classRoom,
            });
            continue;
          }

          let assigned = false;
          for (let selectedSubject of availableTheory) {
            const primaryTeacher = subjectTeacherMap[selectedSubject._id.toString()];
            
            // CRITICAL: Check if primary teacher is actually available at this slot
            let selectedTeacher = null;
            
            if (primaryTeacher) {
              const avail = isTeacherAvailable(primaryTeacher._id, day, p, false);
              if (avail.available && (!lastTeacher || lastTeacher.toString() !== primaryTeacher._id.toString())) {
                // Check consecutive constraint
                const dayKey = `${primaryTeacher._id.toString()}_${day}`;
                const lastP = teacherLastPeriod[dayKey];
                const consecCount = teacherConsecutiveCount[dayKey] || 0;
                const maxConsecutive = primaryTeacher.maxConsecutive || 2;
                
                if (!lastP || p !== lastP + 1 || consecCount < maxConsecutive) {
                  selectedTeacher = primaryTeacher;
                }
              }
            }
            
            // If primary not available, find alternative
            if (!selectedTeacher) {
              selectedTeacher = findBestTeacher(
                selectedSubject,
                day,
                p,
                false,
                lastTeacher,
                teachers,
                null
              );
            }

            if (selectedTeacher) {
              assignTeacher(selectedTeacher, day, p, false);
              lastTeacher = selectedTeacher._id;
              lastSubject = selectedSubject._id;
              
              theorySubjectFrequency[selectedSubject._id.toString()] =
                (theorySubjectFrequency[selectedSubject._id.toString()] || 0) + 1;

              dailySchedule.push({
                day,
                time: `P${p}`,
                subject: selectedSubject._id,
                teacher: selectedTeacher._id,
                room: classRoom,
              });
              assigned = true;
              break;
            }
          }

          if (!assigned) {
            dailySchedule.push({
              day,
              time: `P${p}`,
              subject: null,
              teacher: null,
              room: classRoom,
            });
          }
        }
      }

      // Step 4: Smart filling with conflict awareness
      console.log(`\n🔧 Smart filling for ${className}...`);
      let filledCount = 0;

      for (let pass = 0; pass < 5; pass++) {
        const nullEntries = dailySchedule.filter(
          (e) => 
            !e.teacher && 
            e.subject && 
            !e.isBreak
        );

        for (let entry of nullEntries) {
          const day = entry.day;
          const period = parseInt(entry.time.replace("P", ""));
          const subjectId = entry.subject.toString();

          let lastTeacherId = null;
          const dayEntries = dailySchedule.filter(e => e.day === day);
          const entryIndex = dayEntries.findIndex(e => e.time === entry.time);
          for (let i = entryIndex - 1; i >= 0; i--) {
            if (dayEntries[i].teacher) {
              lastTeacherId = dayEntries[i].teacher;
              break;
            }
          }

          const subject = classSubjects.find(
            (s) => s._id.toString() === subjectId
          );
          if (!subject) continue;

          // Find any available teacher, checking global conflicts
          const qualifiedTeachers = teachers.filter(
            (t) =>
              t.subjects.some((s) => s._id.toString() === subjectId) &&
              t.teachingType.includes(subject.type === 'lab' ? "lab" : "theory")
          );

          const sortedTeachers = qualifiedTeachers.sort((a, b) => {
            const hoursA = globalTeacherWeeklyHours[a._id.toString()] || 0;
            const hoursB = globalTeacherWeeklyHours[b._id.toString()] || 0;
            return hoursA - hoursB;
          });

          let teacherFound = null;
          for (let teacher of sortedTeachers) {
            if (canAssignTeacher(teacher, day, period, false, true)) {
              teacherFound = teacher;
              break;
            }
          }

          if (teacherFound) {
            assignTeacher(teacherFound, day, period, false);
            entry.teacher = teacherFound._id;
            filledCount++;
          }
        }
      }

      // Emergency pass: force assign if slot is empty (should rarely happen)
      const remainingNulls = dailySchedule.filter(
        (e) => e.subject && !e.teacher && !e.isBreak
      );

      for (let entry of remainingNulls) {
        const day = entry.day;
        const period = parseInt(entry.time.replace("P", ""));
        const subjectId = entry.subject.toString();
        
        const subject = classSubjects.find(
          (s) => s._id.toString() === subjectId
        );
        if (!subject) continue;

        const qualifiedTeachers = teachers.filter(
          (t) =>
            t.subjects.some((s) => s._id.toString() === subjectId) &&
            t.teachingType.includes(subject.type === 'lab' ? "lab" : "theory")
        );

        for (let teacher of qualifiedTeachers) {
          const slotKey = `${day}_P${period}`;
          const tId = teacher._id.toString();
          
          // Only check for hard conflicts, ignore hours limit
          if (!globalTeacherAllocation[slotKey]?.includes(tId)) {
            assignTeacher(teacher, day, period, false);
            entry.teacher = teacher._id;
            filledCount++;
            console.log(`  ⚡ Emergency assign: ${day} P${period} → ${teacher.user?.username}`);
            break;
          }
        }
      }

      console.log(`  📊 Filled ${filledCount} slots`);

      const dayOrder = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      dailySchedule.sort((a, b) => {
        const dayDiff = dayOrder[a.day] - dayOrder[b.day];
        if (dayDiff !== 0) return dayDiff;
        const getPeriodNum = (t) =>
          t === "LUNCH" ? 99 : parseInt(t.replace("P", ""));
        return getPeriodNum(a.time) - getPeriodNum(b.time);
      });

      await Timetable.deleteMany({ className });
      const newTimetable = new Timetable({
        className,
        schedule: dailySchedule,
        lunchAfter: lunchBreakAfter,
        periodsPerDay: periodsPerDay,
      });
      await newTimetable.save();
      allTimetables.push(newTimetable);

      const nullTeachers = dailySchedule.filter(
        (e) => e.subject && !e.teacher && !e.isBreak
      ).length;
      const totalSlots = dailySchedule.filter(
        (e) => e.subject && !e.isBreak
      ).length;
      const filledSlots = totalSlots - nullTeachers;
      console.log(`\n📊 ${className} Final Statistics:`);
      console.log(`  Total Slots: ${totalSlots}`);
      console.log(
        `  Filled: ${filledSlots} (${((filledSlots / totalSlots) * 100).toFixed(1)}%)`
      );
      console.log(`  Unfilled: ${nullTeachers}`);
    }

    // Final verification: Check for any cross-class conflicts
    console.log(`\n🔍 Verifying no cross-class teacher conflicts...`);
    let conflictFound = false;
    const slotMap = {};
    
    for (let tt of allTimetables) {
      for (let entry of tt.schedule) {
        if (entry.isBreak || !entry.teacher) continue;
        
        const key = `${entry.day}_${entry.time}`;
        if (!slotMap[key]) slotMap[key] = {};
        
        const teacherId = entry.teacher.toString();
        if (slotMap[key][teacherId]) {
          console.log(`  ❌ CONFLICT: Teacher ${teacherId} assigned to both ${slotMap[key][teacherId]} and ${tt.className} at ${key}`);
          conflictFound = true;
        } else {
          slotMap[key][teacherId] = tt.className;
        }
      }
    }
    
    if (!conflictFound) {
      console.log(`  ✅ No cross-class conflicts detected`);
    }

    console.log(`\n👥 Teacher Utilization:`);
    for (let teacher of teachers) {
      const tId = teacher._id.toString();
      const hours = globalTeacherWeeklyHours[tId] || 0;
      const utilization = ((hours / 17) * 100).toFixed(1);
      const teacherName = teacher.user?.username || "Unknown";
      console.log(`  ${teacherName}: ${hours}/17 hours (${utilization}%)`);
    }

    const formattedTimetables = {};
    for (let tt of allTimetables) {
      const populated = await Timetable.findById(tt._id)
        .populate("schedule.subject")
        .populate({
          path: "schedule.teacher",
          populate: { path: "user", select: "username" },
        });

      formattedTimetables[populated.className] = populated.schedule.map(
        (entry) => ({
          day: entry.day,
          time: entry.time,
          subject: entry.isBreak
            ? "LUNCH BREAK"
            : entry.subject?.name || "Free Period",
          teacher: entry.isBreak ? "-" : entry.teacher?.user?.username || "-",
          room: entry.room,
          isBreak: entry.isBreak || false,
        })
      );
    }

    res.json(formattedTimetables);
  } catch (err) {
    console.error("Timetable generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get Timetable for a specific class
exports.getTimetable = async (req, res) => {
  try {
    const { className } = req.params;
    const timetable = await Timetable.findOne({ className })
      .populate("schedule.subject")
      .populate({
        path: "schedule.teacher",
        populate: { path: "user", select: "username" },
      });

    if (!timetable)
      return res
        .status(404)
        .json({ error: "Timetable not found for this class" });

    res.json(timetable);
  } catch (err) {
    console.error("Error fetching timetable:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all timetables
exports.getAllTimetables = async (req, res) => {
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
    console.error("Error fetching timetables:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete timetable for a specific class
exports.deleteTimetable = async (req, res) => {
  try {
    const { className } = req.params;
    const result = await Timetable.deleteMany({ className });

    if (result.deletedCount === 0)
      return res
        .status(404)
        .json({ error: "No timetable found for this class" });

    res.json({
      message: "Timetable deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting timetable:", err);
    res.status(500).json({ error: err.message });
  }
};