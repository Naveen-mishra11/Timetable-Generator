const LeaveRequest = require("../models/LeaveRequest");
const Substitution = require("../models/Substitution");
const Teacher = require("../models/Teacher");
const Timetable = require("../models/Timetable");

const { getNextWeekdayDate } = require("../utils/dateUtils");

function normalizePeriods({ isFullDay, periods }) {
  if (isFullDay) return [];
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new Error("For half-day leave, please provide periods");
  }
  // ensure e.g. P1..P9
  const normalized = [...new Set(periods.map(String))].map((p) => p.trim());
  for (const p of normalized) {
    if (!/^P\d+$/.test(p)) throw new Error(`Invalid period format: ${p}`);
  }
  return normalized;
}

async function findTeacherByLoggedInUser(userId) {
  const teacher = await Teacher.findOne({ user: userId }).populate("subjects");
  if (!teacher) {
    const err = new Error("Teacher not found for this user");
    err.statusCode = 404;
    throw err;
  }
  return teacher;
}

// Teacher: apply leave
exports.applyLeave = async (req, res) => {
  try {
    const { weekday, isFullDay = true, periods = [], reason = "" } = req.body;
    const teacher = await findTeacherByLoggedInUser(req.user.id);

    const normalizedPeriods = normalizePeriods({ isFullDay, periods });

    const leave = await LeaveRequest.create({
      teacher: teacher._id,
      weekday,
      isFullDay: !!isFullDay,
      periods: normalizedPeriods,
      reason,
      status: "pending",
    });

    res.status(201).json(leave);
  } catch (err) {
    console.error("applyLeave error:", err);
    res.status(err.statusCode || 400).json({ error: err.message });
  }
};

// Teacher: list own leaves
exports.getMyLeaves = async (req, res) => {
  try {
    const teacher = await findTeacherByLoggedInUser(req.user.id);
    const leaves = await LeaveRequest.find({ teacher: teacher._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(leaves);
  } catch (err) {
    console.error("getMyLeaves error:", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

// Admin: list pending leaves
exports.getPendingLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ status: "pending" })
      .populate({
        path: "teacher",
        populate: { path: "user", select: "username" },
      })
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    console.error("getPendingLeaves error:", err);
    res.status(500).json({ error: err.message });
  }
};

function buildBusyMapFromTimetables(timetables) {
  // key: `${weekday}_${time}` -> Set(teacherId)
  const busy = new Map();
  for (const tt of timetables) {
    for (const slot of tt.schedule) {
      if (!slot.teacher) continue;
      const key = `${slot.day}_${slot.time}`;
      if (!busy.has(key)) busy.set(key, new Set());
      busy.get(key).add(slot.teacher.toString());
    }
  }
  return busy;
}

function buildTeachersByClassFromTimetables(timetables) {
  // className -> Set(teacherId)
  const map = new Map();
  for (const tt of timetables) {
    const className = tt.className;
    if (!map.has(className)) map.set(className, new Set());
    for (const slot of tt.schedule || []) {
      if (!slot.teacher) continue;
      map.get(className).add(slot.teacher.toString());
    }
  }
  return map;
}

async function buildBusyMapFromAssignedSubstitutions({ validForDate, excludeSubstitutionId = null }) {
  // key: `${weekday}_${time}` -> Set(teacherId)
  const busy = new Map();

  const filter = {
    validForDate,
    status: "assigned",
    substituteTeacher: { $ne: null },
  };
  if (excludeSubstitutionId) {
    filter._id = { $ne: excludeSubstitutionId };
  }

  const subs = await Substitution.find(filter)
    .select("weekday time substituteTeacher")
    .lean();

  for (const s of subs) {
    const key = `${s.weekday}_${s.time}`;
    if (!busy.has(key)) busy.set(key, new Set());
    busy.get(key).add(s.substituteTeacher.toString());
  }

  return busy;
}

async function chooseSubstitute({
  allTeachers,
  subjectId,
  weekday,
  time,
  busyMap,
  avoidTeacherId,
}) {
  const key = `${weekday}_${time}`;
  const busySet = busyMap.get(key) || new Set();

  const qualified = allTeachers.filter((t) => {
    if (t._id.toString() === avoidTeacherId.toString()) return false;
    const canTeach = t.subjects.some((s) => s._id.toString() === subjectId.toString());
    if (!canTeach) return false;
    return !busySet.has(t._id.toString());
  });

  if (qualified.length === 0) return null;

  // Simple heuristic: pick teacher with least total assigned slots across week in current timetables
  // (approx using busyMap counts).
  const loadCount = (teacherId) => {
    let c = 0;
    for (const set of busyMap.values()) {
      if (set.has(teacherId.toString())) c++;
    }
    return c;
  };

  qualified.sort((a, b) => loadCount(a._id) - loadCount(b._id));
  return qualified[0];
}

async function generateSubstitutionsForApproval(leave, adminUserId) {
  const validForDate = getNextWeekdayDate(leave.weekday);

  // delete any previous substitutions for this leave (safety)
  await Substitution.deleteMany({ leaveRequest: leave._id });

  const timetables = await Timetable.find().lean();
  const busyMap = buildBusyMapFromTimetables(timetables);

  const allTeachers = await Teacher.find()
    .populate("subjects")
    .populate("user", "username")
    .lean();

  const teacherOnLeaveId = leave.teacher.toString();

  // Determine which times are affected
  const affectedTimesSet = new Set();
  if (leave.isFullDay) {
    // Discover all possible times from timetables (P1..Pn)
    for (const tt of timetables) {
      for (const slot of tt.schedule) {
        if (slot.day === leave.weekday && slot.time && /^P\d+$/.test(slot.time)) {
          affectedTimesSet.add(slot.time);
        }
      }
    }
  } else {
    leave.periods.forEach((p) => affectedTimesSet.add(p));
  }

  // Find all affected slots (all classes) for that weekday where teacher is assigned
  const affectedSlots = [];
  for (const tt of timetables) {
    for (const slot of tt.schedule) {
      if (slot.day !== leave.weekday) continue;
      if (!slot.teacher) continue;
      if (slot.teacher.toString() !== teacherOnLeaveId) continue;
      if (!affectedTimesSet.has(slot.time)) continue;
      if (!slot.subject) continue;

      affectedSlots.push({
        className: tt.className,
        weekday: slot.day,
        time: slot.time,
        subject: slot.subject,
        originalTeacher: slot.teacher,
      });
    }
  }

  const substitutions = [];
  for (const s of affectedSlots) {
    const substitute = await chooseSubstitute({
      allTeachers,
      subjectId: s.subject,
      weekday: s.weekday,
      time: s.time,
      busyMap,
      avoidTeacherId: teacherOnLeaveId,
    });

    if (substitute) {
      // mark substitute as busy for this slot too to avoid assigning same substitute twice if multi-class at same time
      const key = `${s.weekday}_${s.time}`;
      if (!busyMap.has(key)) busyMap.set(key, new Set());
      busyMap.get(key).add(substitute._id.toString());
    }

    substitutions.push({
      leaveRequest: leave._id,
      validForDate,
      className: s.className,
      weekday: s.weekday,
      time: s.time,
      subject: s.subject,
      originalTeacher: s.originalTeacher,
      substituteTeacher: substitute ? substitute._id : null,
      status: substitute ? "assigned" : "unassigned",
    });
  }

  await Substitution.insertMany(substitutions);
  return { validForDate, count: substitutions.length };
}

// Admin: list free teachers for a specific substitution slot
exports.getFreeTeachersForSubstitution = async (req, res) => {
  try {
    const { subId } = req.params;

    const substitution = await Substitution.findById(subId)
      .populate({ path: "subject", select: "name" })
      .lean();
    if (!substitution) {
      return res.status(404).json({ error: "Substitution not found" });
    }

    const timetables = await Timetable.find().lean();
    const ttBusyMap = buildBusyMapFromTimetables(timetables);
    const teachersByClass = buildTeachersByClassFromTimetables(timetables);

    // Also mark teachers already assigned as substitutes on that valid date as busy
    const subBusyMap = await buildBusyMapFromAssignedSubstitutions({
      validForDate: substitution.validForDate,
      excludeSubstitutionId: substitution._id,
    });

    const key = `${substitution.weekday}_${substitution.time}`;
    const busySet = new Set([
      ...(ttBusyMap.get(key) || new Set()),
      ...(subBusyMap.get(key) || new Set()),
    ]);

    const teachers = await Teacher.find()
      .populate("subjects", "name code type")
      .populate("user", "username")
      .lean();

    // IMPORTANT: As per requirement, admin wants a substitute teacher who is
    // (a) free in this exact period, and
    // (b) already teaches this class somewhere in the base timetable (familiar with the class).
    // If none found, we fall back to ANY free teacher (still excluding the original teacher).
    const eligibleTeacherIdsForClass = teachersByClass.get(substitution.className) || new Set();

    const baseFilter = (t) => {
      if (t._id.toString() === substitution.originalTeacher.toString()) return false;
      return !busySet.has(t._id.toString());
    };

    const familiarFree = teachers.filter(
      (t) => baseFilter(t) && eligibleTeacherIdsForClass.has(t._id.toString())
    );
    const anyFree = teachers.filter((t) => baseFilter(t));

    const selectedList = familiarFree.length ? familiarFree : anyFree;

    const freeTeachers = selectedList.map((t) => ({
      _id: t._id,
      username: t.user?.username || "Unknown",
      subjects: (t.subjects || []).map((s) => ({
        _id: s._id,
        name: s.name,
        code: s.code,
        type: s.type,
      })),
      familiarWithClass: eligibleTeacherIdsForClass.has(t._id.toString()),
    }));

    res.json({
      substitution: {
        _id: substitution._id,
        className: substitution.className,
        weekday: substitution.weekday,
        time: substitution.time,
        subject: substitution.subject?.name || "-",
        validForDate: substitution.validForDate,
      },
      freeTeachers,
    });
  } catch (err) {
    console.error("getFreeTeachersForSubstitution error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Admin: assign or unassign substitute teacher for a substitution
exports.assignSubstituteTeacher = async (req, res) => {
  try {
    const { subId } = req.params;
    const { teacherId = null } = req.body;

    const substitution = await Substitution.findById(subId);
    if (!substitution) {
      return res.status(404).json({ error: "Substitution not found" });
    }

    // If admin wants to keep it unassigned / remove assignment
    if (!teacherId) {
      substitution.substituteTeacher = null;
      substitution.status = "unassigned";
      await substitution.save();
      return res.json({ message: "Substitution unassigned" });
    }

    const teacher = await Teacher.findById(teacherId).populate("subjects");
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    if (teacher._id.toString() === substitution.originalTeacher.toString()) {
      return res
        .status(400)
        .json({ error: "Original teacher cannot be assigned as substitute" });
    }

    // Eligibility rule (as per requirement): teacher should already teach this class
    // somewhere in the base timetable. If not, we still allow admin to force-assign,
    // but we warn via response message.
    const timetables = await Timetable.find().lean();
    const teachersByClass = buildTeachersByClassFromTimetables(timetables);
    const eligibleTeacherIdsForClass = teachersByClass.get(substitution.className) || new Set();
    const isFamiliar = eligibleTeacherIdsForClass.has(teacher._id.toString());

    // Busy check: base timetables + already assigned substitutions on same valid date
    const ttBusyMap = buildBusyMapFromTimetables(timetables);
    const subBusyMap = await buildBusyMapFromAssignedSubstitutions({
      validForDate: substitution.validForDate,
      excludeSubstitutionId: substitution._id,
    });

    const key = `${substitution.weekday}_${substitution.time}`;
    const busySet = new Set([
      ...(ttBusyMap.get(key) || new Set()),
      ...(subBusyMap.get(key) || new Set()),
    ]);

    if (busySet.has(teacher._id.toString())) {
      return res.status(400).json({ error: "Selected teacher is not free in this period" });
    }

    substitution.substituteTeacher = teacher._id;
    substitution.status = "assigned";
    await substitution.save();

    res.json({
      message: isFamiliar
        ? "Substitute teacher assigned successfully"
        : "Assigned successfully (note: selected teacher is not currently teaching this class)",
    });
  } catch (err) {
    console.error("assignSubstituteTeacher error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Admin: approve leave (and generate substitutions)
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComment = "" } = req.body;

    const leave = await LeaveRequest.findById(id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });
    if (leave.status !== "pending") {
      return res.status(400).json({ error: "Only pending leave can be approved" });
    }

    // generate substitutions first, then finalize leave
    const { validForDate, count } = await generateSubstitutionsForApproval(
      leave,
      req.user.id
    );

    leave.status = "approved";
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    leave.adminComment = adminComment;
    await leave.save();

    res.json({
      message: "Leave approved and substitutions generated",
      validForDate,
      substitutionsGenerated: count,
    });
  } catch (err) {
    console.error("approveLeave error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Admin: reject leave
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComment = "" } = req.body;

    const leave = await LeaveRequest.findById(id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });
    if (leave.status !== "pending") {
      return res.status(400).json({ error: "Only pending leave can be rejected" });
    }

    leave.status = "rejected";
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    leave.adminComment = adminComment;
    await leave.save();

    // ensure no substitutions exist
    await Substitution.deleteMany({ leaveRequest: leave._id });

    res.json({ message: "Leave rejected" });
  } catch (err) {
    console.error("rejectLeave error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Admin: list substitutions (optionally by date)
exports.getSubstitutions = async (req, res) => {
  try {
    const { date } = req.query; // ISO date optional
    const filter = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      filter.validForDate = d;
    }

    const subs = await Substitution.find(filter)
      .populate({
        path: "subject",
        select: "name code type",
      })
      .populate({
        path: "originalTeacher",
        populate: { path: "user", select: "username" },
      })
      .populate({
        path: "substituteTeacher",
        populate: { path: "user", select: "username" },
      })
      .sort({ className: 1, weekday: 1, time: 1 })
      .lean();

    res.json(subs);
  } catch (err) {
    console.error("getSubstitutions error:", err);
    res.status(500).json({ error: err.message });
  }
};
