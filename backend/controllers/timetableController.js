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

    // Global state tracking
    let globalTeacherAllocation = {};
    let globalTeacherWeeklyHours = {};
    let teacherDailyPeriods = {};
    let teacherDailyTheoryCount = {};
    let teacherDailyLabFlag = {};

    const isTeacherAvailable = (teacherId, day, period, isLab = false) => {
      const tId = teacherId.toString();
      const slotKey = `${day}_P${period}`;
      const nextSlotKey = `${day}_P${period + 1}`;

      if (globalTeacherAllocation[slotKey]?.includes(tId)) {
        return { available: false, reason: "conflict" };
      }
      
      if (isLab && globalTeacherAllocation[nextSlotKey]?.includes(tId)) {
        return { available: false, reason: "lab_conflict" };
      }

      const currentHours = globalTeacherWeeklyHours[tId] || 0;
      const requiredHours = isLab ? 2 : 1;
      if (currentHours + requiredHours > 25) {
        return { available: false, reason: "hours_limit" };
      }

      return { available: true, currentHours };
    };

    const canTeachAtPeriod = (teacher, day, period, maxConsecutive = 2) => {
      const tId = teacher._id.toString();
      const dayKey = `${tId}_${day}`;
      const periodsTaught = teacherDailyPeriods[dayKey] || [];
      
      if (periodsTaught.length === 0) return true;
      
      const sortedPeriods = [...periodsTaught].sort((a, b) => a - b);
      const lastTaught = sortedPeriods[sortedPeriods.length - 1];
      
      if (period !== lastTaught + 1) {
        return true;
      }
      
      let consecutiveCount = 1;
      for (let i = sortedPeriods.length - 2; i >= 0; i--) {
        if (sortedPeriods[i] === sortedPeriods[i + 1] - 1) {
          consecutiveCount++;
        } else {
          break;
        }
      }
      
      return consecutiveCount < maxConsecutive;
    };

    const canTeachTheoryToday = (teacherId, className, day) => {
      const tId = teacherId.toString();
      const theoryKey = `${tId}_${className}_${day}`;
      const labKey = `${tId}_${className}_${day}`;
      
      const theoryCount = teacherDailyTheoryCount[theoryKey] || 0;
      const taughtLabToday = teacherDailyLabFlag[labKey] || false;
      
      const maxTheoryAllowed = taughtLabToday ? 1 : 2;
      
      return theoryCount < maxTheoryAllowed;
    };

    const canAssignTeacher = (
      teacher,
      day,
      period,
      isLab = false,
      className = null,
      labDuration = 2
    ) => {
      const tId = teacher._id.toString();
      const availability = isTeacherAvailable(tId, day, period, isLab);
      
      if (!availability.available) return false;

      if (!isLab && className) {
        if (!canTeachTheoryToday(tId, className, day)) {
          return false;
        }
      }

      const maxConsecutive = teacher.maxConsecutive || 2;
      
      if (!canTeachAtPeriod(teacher, day, period, maxConsecutive)) {
        return false;
      }
      
      if (isLab) {
        // Check consecutive periods based on labDuration
        for (let i = 1; i < labDuration; i++) {
          if (!canTeachAtPeriod(teacher, day, period + i, maxConsecutive)) {
            return false;
          }
        }
      }

      return true;
    };

    const assignTeacher = (teacher, day, period, isLab = false, className = null, labDuration = 2) => {
      const tId = teacher._id.toString();
      const dayKey = `${tId}_${day}`;

      if (!teacherDailyPeriods[dayKey]) teacherDailyPeriods[dayKey] = [];
      
      // Assign all periods for the lab duration
      for (let i = 0; i < (isLab ? labDuration : 1); i++) {
        const slotKey = `${day}_P${period + i}`;
        if (!globalTeacherAllocation[slotKey])
          globalTeacherAllocation[slotKey] = [];
        globalTeacherAllocation[slotKey].push(tId);
        teacherDailyPeriods[dayKey].push(period + i);
      }

      if (isLab) {
        if (className) {
          const labFlagKey = `${tId}_${className}_${day}`;
          teacherDailyLabFlag[labFlagKey] = true;
        }
      } else {
        if (className) {
          const theoryKey = `${tId}_${className}_${day}`;
          teacherDailyTheoryCount[theoryKey] = (teacherDailyTheoryCount[theoryKey] || 0) + 1;
        }
      }

      const requiredHours = isLab ? labDuration : 1;
      globalTeacherWeeklyHours[tId] =
        (globalTeacherWeeklyHours[tId] || 0) + requiredHours;
    };

    const unassignTeacher = (teacher, day, period, isLab = false, className = null, labDuration = 2) => {
      const tId = teacher._id.toString();
      const dayKey = `${tId}_${day}`;

      // Remove all periods for the lab duration
      for (let i = 0; i < (isLab ? labDuration : 1); i++) {
        const slotKey = `${day}_P${period + i}`;
        if (globalTeacherAllocation[slotKey]) {
          globalTeacherAllocation[slotKey] = globalTeacherAllocation[slotKey].filter(id => id !== tId);
        }
      }

      if (teacherDailyPeriods[dayKey]) {
        for (let i = 0; i < (isLab ? labDuration : 1); i++) {
          teacherDailyPeriods[dayKey] = teacherDailyPeriods[dayKey].filter(p => p !== period + i);
        }
      }

      const requiredHours = isLab ? labDuration : 1;
      globalTeacherWeeklyHours[tId] = Math.max(0, (globalTeacherWeeklyHours[tId] || 0) - requiredHours);
      
      if (isLab && className) {
        const labFlagKey = `${tId}_${className}_${day}`;
        teacherDailyLabFlag[labFlagKey] = false;
      } else if (className) {
        const theoryKey = `${tId}_${className}_${day}`;
        teacherDailyTheoryCount[theoryKey] = Math.max(0, (teacherDailyTheoryCount[theoryKey] || 0) - 1);
      }
    };

    const getTeacherLoadScore = (teacher) => {
      return globalTeacherWeeklyHours[teacher._id.toString()] || 0;
    };

    const findBestTeacher = (
      subject,
      day,
      period,
      isLab,
      allTeachers,
      className,
      preferredTeacher = null,
      excludeTeachers = new Set()
    ) => {
      const subjectId = subject._id.toString();
      
      const qualifiedTeachers = allTeachers.filter(
        (t) =>
          t.subjects.some((s) => s._id.toString() === subjectId) &&
          t.teachingType.includes(isLab ? "lab" : "theory") &&
          !excludeTeachers.has(t._id.toString())
      );

      if (!qualifiedTeachers.length) return null;

      const availableTeachers = qualifiedTeachers.filter(t => {
        const availability = isTeacherAvailable(t._id, day, period, isLab);
        if (!availability.available) return false;
        
        if (!isLab && className) {
          if (!canTeachTheoryToday(t._id, className, day)) return false;
        }
        
        const maxConsecutive = t.maxConsecutive || 2;
        if (!canTeachAtPeriod(t, day, period, maxConsecutive)) return false;
        
        // Check consecutive periods for labs based on labDuration
        if (isLab) {
          const labDuration = subject.labDuration || 2;
          for (let i = 1; i < labDuration; i++) {
            if (!canTeachAtPeriod(t, day, period + i, maxConsecutive)) {
              return false;
            }
          }
        }
        
        return true;
      });

      if (!availableTeachers.length) return null;

      const sortedByLoad = availableTeachers.sort((a, b) => {
        return getTeacherLoadScore(a) - getTeacherLoadScore(b);
      });

      if (preferredTeacher) {
        const preferred = sortedByLoad.find(
          (t) => t._id.toString() === preferredTeacher.toString()
        );
        if (preferred) return preferred;
      }

      return sortedByLoad[0] || null;
    };

    // Initialize class schedules structure
    const initializeClassSchedules = () => {
      const schedules = {};
      classes.forEach(cls => {
        schedules[cls.name] = {
          classObj: cls,
          schedule: [],
          subjectTeacherMap: {},
          labScheduleMap: [],
          labsScheduledThisWeek: new Set(),
          theorySubjectFrequency: {},
          room: `Room-${Math.floor(Math.random() * 300) + 100}`
        };
      });
      return schedules;
    };

    // Build subject-teacher mapping for all classes
    const buildSubjectTeacherMaps = (classSchedules) => {
      for (const className in classSchedules) {
        const cls = classSchedules[className].classObj;
        const classSubjects = cls.subjects;
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
            const chosen = candidateTeachers.sort((a, b) => 
              getTeacherLoadScore(a) - getTeacherLoadScore(b)
            )[0];
            
            for (let sub of subjects) {
              classSchedules[className].subjectTeacherMap[sub._id.toString()] = chosen;
            }
          } else {
            for (let sub of subjects) {
              const fallbackTeachers = teachers.filter(
                (t) =>
                  t.subjects.some(
                    (ts) => ts._id.toString() === sub._id.toString()
                  ) && t.teachingType.includes(sub.type)
              );
              if (fallbackTeachers.length > 0) {
                classSchedules[className].subjectTeacherMap[sub._id.toString()] = 
                  fallbackTeachers.sort((a, b) => getTeacherLoadScore(a) - getTeacherLoadScore(b))[0];
              }
            }
          }
        }

        // Initialize theory subject frequencies
        const theorySubjects = cls.subjects.filter(s => s.type === "theory");
        theorySubjects.forEach(sub => {
          classSchedules[className].theorySubjectFrequency[sub._id.toString()] = 0;
        });
      }
    };

    // Schedule labs simultaneously across all classes
    const scheduleAllLabs = (classSchedules) => {
      const shuffledDays = [...days].sort(() => Math.random() - 0.5);
      
      for (let day of shuffledDays) {
        // Try to schedule one lab per class per day (round-robin)
        let classesNeedingLabs = Object.entries(classSchedules).filter(([name, data]) => {
          const labSubjects = data.classObj.subjects.filter(s => s.type === "lab");
          return data.labsScheduledThisWeek.size < labSubjects.length;
        });

        // Shuffle classes for fairness
        classesNeedingLabs.sort(() => Math.random() - 0.5);

        for (const [className, classData] of classesNeedingLabs) {
          const labSubjects = classData.classObj.subjects.filter(s => 
            s.type === "lab" && !classData.labsScheduledThisWeek.has(s._id.toString())
          );
          
          if (labSubjects.length === 0) continue;

          const possiblePeriods = [];
          for (let p = 1; p <= periodsPerDay; p++) {
            if (lunchBreakAfter && p === lunchBreakAfter) continue;
            
            // Check if this period and consecutive periods are available for the lab duration
            const labSubject = labSubjects[0]; // Take first available lab
            const labDuration = labSubject.labDuration || 2;
            
            let canFit = true;
            for (let i = 0; i < labDuration; i++) {
              const checkPeriod = p + i;
              if (checkPeriod > periodsPerDay) {
                canFit = false;
                break;
              }
              if (lunchBreakAfter && checkPeriod === lunchBreakAfter) {
                canFit = false;
                break;
              }
              // Check if this period is already occupied in this class
              const occupied = classData.schedule.some(e => e.day === day && e.time === `P${checkPeriod}`);
              if (occupied) {
                canFit = false;
                break;
              }
            }
            
            if (canFit) {
              possiblePeriods.push(p);
            }
          }

          const shuffledPeriods = possiblePeriods.sort(() => Math.random() - 0.5);

          for (let p of shuffledPeriods) {
            const labSubject = labSubjects[0]; // Take first available lab
            const labDuration = labSubject.labDuration || 2;
            const primaryTeacher = classData.subjectTeacherMap[labSubject._id.toString()];
            
            let selectedTeacher = null;
            
            if (primaryTeacher) {
              const avail = isTeacherAvailable(primaryTeacher._id, day, p, true);
              const maxConsecutive = primaryTeacher.maxConsecutive || 2;
              
              // Check consecutive periods based on labDuration
              let canAssign = avail.available;
              for (let i = 1; i < labDuration; i++) {
                if (!canTeachAtPeriod(primaryTeacher, day, p + i, maxConsecutive)) {
                  canAssign = false;
                  break;
                }
              }
              
              if (canAssign) {
                selectedTeacher = primaryTeacher;
              }
            }

            if (!selectedTeacher) {
              selectedTeacher = findBestTeacher(
                labSubject,
                day,
                p,
                true,
                teachers,
                className
              );
            }

            if (selectedTeacher) {
              assignTeacher(selectedTeacher, day, p, true, className, labDuration);
              classData.labsScheduledThisWeek.add(labSubject._id.toString());

              const labRoom = `Lab-${Math.floor(Math.random() * 20) + 1}`;
              
              // Add schedule entries for all periods of the lab duration
              for (let i = 0; i < labDuration; i++) {
                classData.schedule.push({
                  day,
                  time: `P${p + i}`,
                  subject: labSubject._id,
                  teacher: selectedTeacher._id,
                  room: labRoom,
                });
              }

              classData.labScheduleMap.push({
                day,
                period: p,
                subject: labSubject,
                teacher: selectedTeacher,
              });
              break; // Move to next class
            }
          }
        }
      }
    };

    // Schedule theory periods simultaneously across all classes
    const scheduleAllTheory = (classSchedules) => {
      for (let day of days) {
        for (let p = 1; p <= periodsPerDay; p++) {
          // Handle lunch break
          if (lunchBreakAfter && p === lunchBreakAfter) {
            for (const className in classSchedules) {
              classSchedules[className].schedule.push({
                day,
                time: `LUNCH`,
                subject: "LUNCH BREAK",
                teacher: null,
                room: "Cafeteria",
                isBreak: true,
              });
            }
            continue;
          }

          // Get classes that need scheduling for this slot
          let classesForThisSlot = [];
          for (const [className, classData] of Object.entries(classSchedules)) {
            // Check if slot already occupied (by lab)
            const occupied = classData.schedule.some(e => e.day === day && e.time === `P${p}`);
            if (!occupied) {
              classesForThisSlot.push({ className, classData });
            }
          }

          // Shuffle for fairness
          classesForThisSlot.sort(() => Math.random() - 0.5);

          for (const { className, classData } of classesForThisSlot) {
            const theorySubjects = classData.classObj.subjects.filter(s => s.type === "theory");
            
            // Get priority sorted subjects
            const sortedSubjects = [...theorySubjects].sort((a, b) => {
              const countA = classData.theorySubjectFrequency[a._id.toString()] || 0;
              const countB = classData.theorySubjectFrequency[b._id.toString()] || 0;
              const maxA = a.hoursPerWeek || 4;
              const maxB = b.hoursPerWeek || 4;
              return (maxB - countB) - (maxA - countA);
            });

            // Filter available subjects
            let availableSubjects = sortedSubjects.filter(sub => {
              const count = classData.theorySubjectFrequency[sub._id.toString()] || 0;
              const max = sub.hoursPerWeek || 4;
              return count < max;
            });

            if (availableSubjects.length === 0) {
              classData.schedule.push({
                day,
                time: `P${p}`,
                subject: null,
                teacher: null,
                room: classData.room,
              });
              continue;
            }

            let assigned = false;
            for (let selectedSubject of availableSubjects) {
              const primaryTeacher = classData.subjectTeacherMap[selectedSubject._id.toString()];
              
              let selectedTeacher = null;
              
              if (primaryTeacher) {
                const avail = isTeacherAvailable(primaryTeacher._id, day, p, false);
                const canTakeTheory = canTeachTheoryToday(primaryTeacher._id, className, day);
                const maxConsecutive = primaryTeacher.maxConsecutive || 2;
                const canTeach = canTeachAtPeriod(primaryTeacher, day, p, maxConsecutive);
                
                if (avail.available && canTakeTheory && canTeach) {
                  selectedTeacher = primaryTeacher;
                }
              }

              if (!selectedTeacher) {
                selectedTeacher = findBestTeacher(
                  selectedSubject,
                  day,
                  p,
                  false,
                  teachers,
                  className
                );
              }

              if (selectedTeacher) {
                assignTeacher(selectedTeacher, day, p, false, className);
                
                classData.theorySubjectFrequency[selectedSubject._id.toString()] =
                  (classData.theorySubjectFrequency[selectedSubject._id.toString()] || 0) + 1;

                classData.schedule.push({
                  day,
                  time: `P${p}`,
                  subject: selectedSubject._id,
                  teacher: selectedTeacher._id,
                  room: classData.room,
                });
                assigned = true;
                break;
              }
            }

            if (!assigned) {
              classData.schedule.push({
                day,
                time: `P${p}`,
                subject: null,
                teacher: null,
                room: classData.room,
              });
            }
          }
        }
      }
    };

    // Smart filling for remaining slots
    const fillRemainingSlots = (classSchedules) => {
      for (const [className, classData] of Object.entries(classSchedules)) {
        console.log(`\n🔧 Smart filling for ${className}...`);
        let filledCount = 0;

        const classSubjects = classData.classObj.subjects;

        for (let pass = 0; pass < 5; pass++) {
          const nullEntries = classData.schedule.filter(
            (e) => !e.teacher && e.subject && !e.isBreak
          );

          for (let entry of nullEntries) {
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

            const sortedTeachers = qualifiedTeachers.sort((a, b) => {
              const hoursA = globalTeacherWeeklyHours[a._id.toString()] || 0;
              const hoursB = globalTeacherWeeklyHours[b._id.toString()] || 0;
              return hoursA - hoursB;
            });

            let teacherFound = null;
            for (let teacher of sortedTeachers) {
              if (canAssignTeacher(teacher, day, period, false, className)) {
                teacherFound = teacher;
                break;
              }
            }

            if (teacherFound) {
              assignTeacher(teacherFound, day, period, false, className);
              entry.teacher = teacherFound._id;
              filledCount++;
            }
          }
        }

        // Emergency fill
        const remainingNulls = classData.schedule.filter(
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
            
            if (!globalTeacherAllocation[slotKey]?.includes(tId)) {
              if (canTeachTheoryToday(tId, className, day)) {
                const maxConsecutive = teacher.maxConsecutive || 2;
                if (canTeachAtPeriod(teacher, day, period, maxConsecutive)) {
                  assignTeacher(teacher, day, period, false, className);
                  entry.teacher = teacher._id;
                  filledCount++;
                  console.log(`  ⚡ Emergency assign: ${day} P${period} → ${teacher.user?.username}`);
                  break;
                }
              }
            }
          }
        }

        console.log(`  📊 Filled ${filledCount} slots`);
      }
    };

    // Main execution
    const classSchedules = initializeClassSchedules();
    buildSubjectTeacherMaps(classSchedules);
    
    console.log("🔬 Scheduling labs simultaneously...");
    scheduleAllLabs(classSchedules);
    
    console.log("📖 Scheduling theory periods simultaneously...");
    scheduleAllTheory(classSchedules);
    
    console.log("🔧 Filling remaining slots...");
    fillRemainingSlots(classSchedules);

    // Save all timetables
    let allTimetables = [];
    const dayOrder = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    for (const [className, classData] of Object.entries(classSchedules)) {
      // Sort schedule
      classData.schedule.sort((a, b) => {
        const dayDiff = dayOrder[a.day] - dayOrder[b.day];
        if (dayDiff !== 0) return dayDiff;
        const getPeriodNum = (t) =>
          t === "LUNCH" ? 99 : parseInt(t.replace("P", ""));
        return getPeriodNum(a.time) - getPeriodNum(b.time);
      });

      await Timetable.deleteMany({ className });
      const newTimetable = new Timetable({
        className,
        schedule: classData.schedule,
        lunchAfter: lunchBreakAfter,
        periodsPerDay: periodsPerDay,
      });
      await newTimetable.save();
      allTimetables.push(newTimetable);

      const nullTeachers = classData.schedule.filter(
        (e) => e.subject && !e.teacher && !e.isBreak
      ).length;
      const totalSlots = classData.schedule.filter(
        (e) => e.subject && !e.isBreak
      ).length;
      const filledSlots = totalSlots - nullTeachers;
      console.log(`\n📊 ${className} Final Statistics:`);
      console.log(`  Total Slots: ${totalSlots}`);
      console.log(`  Filled: ${filledSlots} (${((filledSlots / totalSlots) * 100).toFixed(1)}%)`);
      console.log(`  Unfilled: ${nullTeachers}`);
    }

    // Verification
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
      const utilization = ((hours / 25) * 100).toFixed(1);
      const teacherName = teacher.user?.username || "Unknown";
      console.log(`  ${teacherName}: ${hours}/25 hours (${utilization}%)`);
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