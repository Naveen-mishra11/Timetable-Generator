import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Define ALL periods (fixed)
const ALL_PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];

// Day order for sorting
const DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};

const TeacherTimetable = () => {
  const [unifiedTimetable, setUnifiedTimetable] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherTimetable();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeacherTimetable = async () => {
    try {
      const res = await axios.get(
        `${SERVER_URL}/api/teacher-timetable/teacher`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );

      // Transform class-wise data to unified teacher view
      const unified = transformToUnifiedTimetable(res.data);
      setUnifiedTimetable(unified);
    } catch (err) {
      console.error("Error fetching teacher timetable:", err);
    } finally {
      setLoading(false);
    }
  };

  // Transform class-wise timetables to unified teacher view
  const transformToUnifiedTimetable = (classWiseTimetables) => {
    const unified = {};

    // Initialize structure: { day: { period: [slots] } }
    Object.keys(DAY_ORDER).forEach((day) => {
      unified[day] = {};
      ALL_PERIODS.forEach((period) => {
        unified[day][period] = null;
      });
    });

    // Populate with data from all classes
    Object.entries(classWiseTimetables).forEach(([className, daysObj]) => {
      Object.entries(daysObj).forEach(([day, slots]) => {
        if (!unified[day]) unified[day] = {};

        slots.forEach((slot) => {
          // Skip breaks/lunch
          if (slot.isBreak || slot.subject === "LUNCH BREAK") return;

          const period = slot.time;
          if (ALL_PERIODS.includes(period)) {
            unified[day][period] = {
              className: className,
              subject: slot.subject,
              room: slot.room,
              substituteTeacher: slot.substituteTeacher,
              substitutionStatus: slot.substitutionStatus,
            };
          }
        });
      });
    });

    return unified;
  };

  // Get sorted days
  const getSortedDays = () => {
    return Object.keys(unifiedTimetable).sort(
      (a, b) => (DAY_ORDER[a] || 99) - (DAY_ORDER[b] || 99)
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <h5>Loading timetable...</h5>
        </div>
        <Footer />
      </>
    );
  }

  const sortedDays = getSortedDays();
  const hasTimetable = sortedDays.some(
    (day) =>
      unifiedTimetable[day] &&
      Object.values(unifiedTimetable[day]).some((slot) => slot !== null)
  );

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">📘 My Weekly Timetable</h2>

          {!hasTimetable ? (
            <div className="alert alert-info text-center">
              No timetable assigned yet.
            </div>
          ) : (
            <div className="card shadow-sm">
              <div className="card-header bg-success text-white fw-bold">
                Weekly Schedule
              </div>

              <div className="card-body p-3">
                <div className="table-responsive">
                  <table className="table table-bordered table-striped text-center">
                    <thead className="table-success">
                      <tr>
                        <th style={{ minWidth: "100px" }}>DAY / TIME</th>
                        {ALL_PERIODS.map((time) => (
                          <th key={time} style={{ minWidth: "120px" }}>
                            {time}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {sortedDays.map((day) => (
                        <tr key={day}>
                          <td className="fw-bold align-middle">{day}</td>

                          {ALL_PERIODS.map((period) => {
                            const slot = unifiedTimetable[day]?.[period];

                            return (
                              <td
                                key={period}
                                className={slot ? "table-primary" : ""}
                                style={{ verticalAlign: "middle" }}
                              >
                                {slot ? (
                                  <div>
                                    <div className="fw-bold text-primary">
                                      {slot.className}
                                    </div>
                                    <div>{slot.subject}</div>
                                    <div className="small text-muted">
                                      {slot.room}
                                    </div>

                                    {slot.substituteTeacher && (
                                      <div className="small text-success mt-1">
                                        <span className="badge bg-success">
                                          Sub: {slot.substituteTeacher}
                                        </span>
                                      </div>
                                    )}

                                    {slot.substitutionStatus === "unassigned" && (
                                      <div className="small text-danger mt-1">
                                        <span className="badge bg-danger">
                                          Sub: UNASSIGNED
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
};

export default TeacherTimetable;