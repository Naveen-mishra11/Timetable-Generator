import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ViewTimetables = () => {
  const [timetables, setTimetables] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  });
  const [subsByKey, setSubsByKey] = useState({}); // { "class_day_time": { substituteTeacherName, status } }

  useEffect(() => {
    fetchTimetables();
  }, []);

  useEffect(() => {
    fetchSubstitutionsForDate(selectedDate);
  }, [selectedDate]);

  const fetchTimetables = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/timetable/all`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });

      setTimetables(res.data);
    } catch (err) {
      console.error("Error fetching timetables:", err);
    }
  };

  const fetchSubstitutionsForDate = async (dateStr) => {
    try {
      // dateStr = yyyy-mm-dd, backend expects ISO-ish; passing date string works.
      const res = await axios.get(
        `${SERVER_URL}/api/leaves/substitutions?date=${encodeURIComponent(dateStr)}`,
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );

      const map = {};
      for (const s of res.data || []) {
        const key = `${s.className}_${s.weekday}_${s.time}`;
        map[key] = {
          substituteTeacherName: s.substituteTeacher?.user?.username || null,
          status: s.status,
        };
      }
      setSubsByKey(map);
    } catch (err) {
      console.error("Error fetching substitutions:", err);
      setSubsByKey({});
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete all timetables?")) return;

    try {
      await axios.delete(`${SERVER_URL}/api/timetable/delete-all`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });

      setTimetables([]);
      alert("All timetables deleted successfully");
    } catch (err) {
      console.error("Error deleting timetables:", err);
    }
  };

  const handleExportPDF = () => {
    if (!timetables.length) return;

    const doc = new jsPDF();

    timetables.forEach((tt, index) => {
      if (index !== 0) doc.addPage();

      doc.setFontSize(16);
      doc.text(`Class: ${tt.className}`, 14, 20);

      const times = [...new Set(tt.schedule.map((s) => s.time))];
      const modifiedTimes = [...times];
      modifiedTimes.splice(tt.lunchAfter ?? 3, 0, "LUNCH");

      const daysList = [...new Set(tt.schedule.map((s) => s.day))];

      const body = daysList.map((day) => {
        const row = [day];
        modifiedTimes.forEach((time) => {
          if (time === "LUNCH") {
            row.push("LUNCH BREAK");
            return;
          }

          const slot = tt.schedule.find((s) => s.day === day && s.time === time);
          if (!slot) {
            row.push("Free Period");
            return;
          }

          row.push(
            `${slot.subject?.name || "Free Period"}\n${
              slot.teacher?.user?.username || "-"
            }\n${slot.room || ""}`
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

    doc.save("timetables.pdf");
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">📅 All Timetables</h2>

          <div className="card p-3 shadow-sm mb-4">
            <div className="row align-items-center g-2">
              <div className="col-md-3">
                <label className="form-label mb-1">View for Date (substitutions)</label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="col-md-9 small text-muted">
                This view overlays substitutions (if any) for the selected date. Your base weekly timetable is unchanged.
              </div>
            </div>
          </div>

          {!timetables.length ? (
            <div className="alert alert-info text-center">
              No timetables found.
            </div>
          ) : (
            timetables.map((tt, idx) => {
              const days = [...new Set(tt.schedule.map((s) => s.day))];
              const times = [...new Set(tt.schedule.map((s) => s.time))];
              const modifiedTimes = [...times];
              modifiedTimes.splice(tt.lunchAfter ?? 3, 0, "LUNCH");

              return (
                <div key={idx} className="mb-5">
                  <div className="card shadow-sm">
                    <div className="card-header bg-primary text-white fw-bold">
                      Class: {tt.className}
                    </div>

                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-bordered table-striped text-center">
                          <thead className="table-primary">
                            <tr>
                              <th>DAY / TIME</th>
                              {modifiedTimes.map((time, i) => (
                                <th key={i}>{time}</th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {days.map((day) => (
                              <tr key={day}>
                                <td className="fw-bold">{day}</td>

                                {modifiedTimes.map((time, i) => {
                                  if (time === "LUNCH") {
                                    return (
                                      <td key={i} className="fw-bold">
                                        LUNCH
                                      </td>
                                    );
                                  }

                                  const slot = tt.schedule.find(
                                    (s) => s.day === day && s.time === time
                                  );

                                  if (!slot)
                                    return <td key={i}>Free Period</td>;

                                  return (
                                    <td key={i}>
                                      <div>{slot.subject?.name || "Free Period"}</div>
                                      <div className="text-muted small">
                                        {(() => {
                                          const subKey = `${tt.className}_${day}_${time}`;
                                          const sub = subsByKey[subKey];
                                          if (sub?.status === "assigned" && sub.substituteTeacherName) {
                                            return (
                                              <>
                                                <span className="text-decoration-line-through">
                                                  {slot.teacher?.user?.username || "-"}
                                                </span>
                                                <span className="text-success">
                                                  {` → ${sub.substituteTeacherName}`}
                                                </span>
                                              </>
                                            );
                                          }
                                          if (sub?.status === "unassigned") {
                                            return (
                                              <>
                                                {slot.teacher?.user?.username || "-"}
                                                <span className="text-danger"> (Substitute UNASSIGNED)</span>
                                              </>
                                            );
                                          }
                                          return slot.teacher?.user?.username || "-";
                                        })()}
                                      </div>
                                      <div className="small">{slot.room}</div>
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

          {timetables.length > 0 && (
            <div className="text-center mt-4 d-flex gap-3 justify-content-center">
              <button className="btn btn-danger px-4" onClick={handleDeleteAll}>
                🗑️ Delete All
              </button>

              <button
                className="btn btn-secondary px-4"
                onClick={handleExportPDF}
              >
                📥 Download PDF
              </button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ViewTimetables;
