import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ Correct import

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const daysOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const GenerateTimetable = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState([...daysOptions]);
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [timetable, setTimetable] = useState(null);
  const [message, setMessage] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Check login + fetch subjects & teachers
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchSubjects();
      fetchTeachers();
    }
  }, [navigate]);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/subjects`);
      setSubjects(res.data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/teachers`);
      setTeachers(res.data);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  // Generate timetable
  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Please login to generate timetable");
        navigate("/login");
        return;
      }

      const res = await axios.post(
        `${SERVER_URL}/api/timetable/generate`,
        { days, periodsPerDay },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimetable(res.data);
      setMessage("Timetable generated successfully!");
    } catch (err) {
      console.error(err);
      setMessage(
        "Error generating timetable: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  // ✅ Save ALL timetables at once
  const handleSaveAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Please login to save timetable");
        navigate("/login");
        return;
      }

      for (const className of Object.keys(timetable)) {
        const schedule = timetable[className].map((slot) => {
          const subjectDoc = subjects.find(
            (s) => s.name.toLowerCase() === slot.subject?.toLowerCase()
          );
          const teacherDoc = teachers.find(
            (t) => t.name.toLowerCase() === slot.teacher?.toLowerCase()
          );

          return {
            day: slot.day,
            time: slot.time,
            subject: subjectDoc ? subjectDoc._id : null,
            teacher: teacherDoc ? teacherDoc._id : null,
            room: slot.room || "",
          };
        });

        await axios.post(
          `${SERVER_URL}/api/timetable/save`,
          { className, schedule },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setMessage("✅ All timetables saved successfully!");
    } catch (err) {
      console.error(err);
      setMessage(
        "Error saving timetable: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  // ✅ Export ALL timetables as PDF
  const handleExportPDF = () => {
    if (!timetable) {
      setMessage("No timetable to export");
      return;
    }

    const doc = new jsPDF();

    Object.keys(timetable).forEach((className, index) => {
      if (index !== 0) doc.addPage();

      doc.setFontSize(16);
      doc.text(`Class: ${className}`, 14, 20);

      const times = [...new Set(timetable[className].map((slot) => slot.time))];
      const daysList = [
        ...new Set(timetable[className].map((slot) => slot.day)),
      ];

      const body = daysList.map((day) => {
        const row = [day];
        times.forEach((time) => {
          const slot = timetable[className].find(
            (s) => s.day === day && s.time === time
          );
          if (slot) {
            row.push(
              `${slot.subject || ""}\n${slot.teacher || ""}\n${slot.room || ""}`
            );
          } else {
            row.push("-");
          }
        });
        return row;
      });

      autoTable(doc, {
        startY: 30,
        head: [["DAY / TIME", ...times]],
        body: body,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185] },
      });
    });

    doc.save("timetable.pdf");
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">Generate Timetable</h2>

          {message && <div className="alert alert-info">{message}</div>}

          {/* Form Section */}
          <form
            onSubmit={handleGenerate}
            className="card p-4 shadow bg-light mb-4"
          >
            <div className="mb-3">
              <label className="form-label">Periods per Day</label>
              <input
                type="number"
                className="form-control"
                value={periodsPerDay}
                min={1}
                max={10}
                onChange={(e) => setPeriodsPerDay(parseInt(e.target.value))}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Select Days</label>
              <div className="d-flex flex-wrap gap-2">
                {daysOptions.map((day) => (
                  <div className="form-check" key={day}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={day}
                      value={day}
                      checked={days.includes(day)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDays((prev) =>
                          checked
                            ? [...prev, day]
                            : prev.filter((d) => d !== day)
                        );
                      }}
                    />
                    <label className="form-check-label" htmlFor={day}>
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Generate Timetable
            </button>
          </form>

          {/* Timetable Section */}
          {timetable &&
            Object.keys(timetable).map((className) => {
              const times = [
                ...new Set(timetable[className].map((slot) => slot.time)),
              ];
              const daysList = [
                ...new Set(timetable[className].map((slot) => slot.day)),
              ];

              return (
                <div key={className} className="mb-5">
                  <h4 className="mb-3">{className}</h4>
                  <table className="table table-bordered table-striped shadow-sm text-center">
                    <thead className="table-primary">
                      <tr>
                        <th>DAY / TIME</th>
                        {times.map((time) => (
                          <th key={time}>{time}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daysList.map((day) => (
                        <tr key={day}>
                          <td className="fw-bold">{day}</td>
                          {times.map((time) => {
                            const slot = timetable[className].find(
                              (s) => s.day === day && s.time === time
                            );
                            return (
                              <td key={time}>
                                {slot ? (
                                  <>
                                    <div>{slot.subject}</div>
                                    {slot.teacher && (
                                      <div className="text-muted small">
                                        ({slot.teacher})
                                      </div>
                                    )}
                                    {slot.room && (
                                      <div className="small">{slot.room}</div>
                                    )}
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
              );
            })}

          {/* ✅ Single Button at the bottom */}
          {timetable && (
            <div className="d-flex gap-3 mt-3">
              <button className="btn btn-success" onClick={handleSaveAll}>
                Save All Timetables
              </button>
              <button className="btn btn-secondary" onClick={handleExportPDF}>
                Download All Timetables (PDF)
              </button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default GenerateTimetable;
