import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const daysOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const GenerateTimetable = () => {
  const navigate = useNavigate();

  const [days, setDays] = useState([...daysOptions]);
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [lunchAfter, setLunchAfter] = useState(3);
  const [timetable, setTimetable] = useState(null);
  const [message, setMessage] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchSubjects(token);
    fetchTeachers(token);
  }, [navigate]);

  const fetchSubjects = async (token) => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(res.data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchTeachers = async (token) => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(res.data);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await axios.post(
        `${SERVER_URL}/api/timetable/generate`,
        {
          days,
          periodsPerDay,
          lunchAfter, // ⭐ Include lunch
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimetable(res.data);
      setMessage("Timetable generated successfully!");
    } catch (err) {
      console.error("Generate Error:", err);
      setMessage(
        "Error generating timetable: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  const handleSaveAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
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
          {
            className,
            schedule,
            lunchAfter, // ⭐ Save lunch position
            periodsPerDay, // ⭐ Save periods count
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert("All timetables saved successfully");
    } catch (err) {
      console.error("Save Error:", err);
      alert(
        "Error saving timetable: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

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

      // Insert lunch
      const modifiedTimes = [...times];
      modifiedTimes.splice(lunchAfter, 0, "LUNCH BREAK");

      const daysList = [
        ...new Set(timetable[className].map((slot) => slot.day)),
      ];

      const body = daysList.map((day) => {
        const row = [day];

        modifiedTimes.forEach((time) => {
          if (time === "LUNCH BREAK") {
            row.push("LUNCH BREAK");
            return;
          }

          const slot = timetable[className].find(
            (s) => s.day === day && s.time === time
          );

          row.push(
            slot
              ? `${slot.subject || ""}\n${slot.teacher || ""}\n${
                  slot.room || ""
                }`
              : "-"
          );
        });

        return row;
      });

      autoTable(doc, {
        startY: 30,
        head: [["DAY / TIME", ...modifiedTimes]],
        body,
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
              <label className="form-label">
                Lunch Break After Which Period?
              </label>
              <select
                className="form-select"
                value={lunchAfter}
                onChange={(e) => setLunchAfter(parseInt(e.target.value))}
              >
                {Array.from({ length: periodsPerDay }, (_, period) => (
                  <option key={period} value={period}>
                    After Period {period}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Select Days</label>
              <div className="d-flex flex-wrap gap-2">
                {daysOptions.map((day) => (
                  <div className="form-check" key={day}>
                    <input
                      className="form-check-input"
                      type="checkbox"
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
                    <label className="form-check-label">{day}</label>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Generate Timetable
            </button>
          </form>

          {timetable &&
            Object.keys(timetable).map((className) => {
              const times = [
                ...new Set(timetable[className].map((slot) => slot.time)),
              ];

              const modifiedTimes = [...times];
              modifiedTimes.splice(lunchAfter, 0, "LUNCH");

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
                        {modifiedTimes.map((time, idx) => (
                          <th key={idx}>{time}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {daysList.map((day) => (
                        <tr key={day}>
                          <td className="fw-bold">{day}</td>

                          {modifiedTimes.map((time) => {
                            if (time === "LUNCH") {
                              return (
                                <td key={time} className="fw-bold">
                                  LUNCH
                                </td>
                              );
                            }

                            const slot = timetable[className].find(
                              (s) => s.day === day && s.time === time
                            );

                            return (
                              <td key={time}>
                                {slot ? (
                                  <>
                                    <div>{slot.subject}</div>
                                    <div className="small text-muted">
                                      {slot.teacher}
                                    </div>
                                    <div className="small">{slot.room}</div>
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
