import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const TeacherTimetable = () => {
  const [timetables, setTimetables] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherTimetable();
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

      setTimetables(res.data);
    } catch (err) {
      console.error("Error fetching teacher timetable:", err);
    } finally {
      setLoading(false);
    }
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

  const classEntries = Object.entries(timetables);

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">📘 My Teaching Timetable</h2>

          {classEntries.length === 0 ? (
            <div className="alert alert-info text-center">
              No timetable assigned yet.
            </div>
          ) : (
            classEntries.map(([className, daysObj]) => {
              const days = Object.keys(daysObj);

              // collect unique periods
              const timesSet = new Set();
              Object.values(daysObj).forEach(slots =>
                slots.forEach(s => timesSet.add(s.time))
              );
              const times = [...timesSet].sort();

              return (
                <div key={className} className="mb-5">
                  <div className="card shadow-sm">
                    <div className="card-header bg-success text-white fw-bold">
                      Class: {className}
                    </div>

                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-bordered table-striped text-center">
                          <thead className="table-success">
                            <tr>
                              <th>DAY / TIME</th>
                              {times.map((t) => (
                                <th key={t}>{t}</th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {days.map((day) => (
                              <tr key={day}>
                                <td className="fw-bold">{day}</td>

                                {times.map((time) => {
                                  const slot = daysObj[day].find(
                                    (s) => s.time === time
                                  );

                                  return (
                                    <td key={time}>
                                      {slot ? (
                                        <>
                                          <div>{slot.subject}</div>
                                          <div className="small text-muted">
                                            {slot.room}
                                          </div>
                                        </>
                                      ) : (
                                        "-"
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
                </div>
              );
            })
          )}
        </div>

        <Footer />
      </div>
    </>
  );
};

export default TeacherTimetable;
