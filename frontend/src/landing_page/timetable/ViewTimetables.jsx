import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ViewTimetables = () => {
  const [timetables, setTimetables] = useState([]);

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/timetable/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setTimetables(res.data);
    } catch (err) {
      console.error("Error fetching timetables:", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete all timetables?")) return;

    try {
      await axios.delete(`${SERVER_URL}/api/timetable/delete-all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setTimetables([]);
      alert("All timetables deleted successfully");
    } catch (err) {
      console.error("Error deleting timetables:", err);
    }
  };

  // ⭐ PDF EXPORT UPDATED – Free Period shows & lunchAfter per class
  const handleExportPDF = () => {
    if (timetables.length === 0) return;

    const doc = new jsPDF();

    timetables.forEach((timetable, index) => {
      if (index !== 0) doc.addPage();

      const lunchAfter = timetable.lunchAfter ?? 3;

      doc.setFontSize(16);
      doc.text(`Class: ${timetable.className}`, 14, 20);

      const times = [...new Set(timetable.schedule.map((s) => s.time))];

      const modifiedTimes = [...times];
      modifiedTimes.splice(lunchAfter, 0, "LUNCH");

      const daysList = [...new Set(timetable.schedule.map((s) => s.day))];

      const body = daysList.map((day) => {
        const row = [day];

        modifiedTimes.forEach((time) => {
          if (time === "LUNCH") {
            row.push("LUNCH BREAK");
            return;
          }

          const slot = timetable.schedule.find(
            (s) => s.day === day && s.time === time
          );

          // ⭐ FIX: Free periods now show properly
          if (!slot)
            return row.push("Free Period");

          row.push(
            `${slot.subject?.name || "Free Period"}\n${
              slot.teacher?.name || "-"
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

          {timetables.length === 0 ? (
            <div className="alert alert-info text-center">
              No timetables found.
            </div>
          ) : (
            timetables.map((timetable, idx) => {
              const days = [...new Set(timetable.schedule.map((s) => s.day))];
              const lunchAfter = timetable.lunchAfter ?? 3;

              const times = [...new Set(timetable.schedule.map((s) => s.time))];
              const modifiedTimes = [...times];
              modifiedTimes.splice(lunchAfter, 0, "LUNCH");

              return (
                <div key={idx} className="mb-5">
                  <div className="card shadow-sm">
                    <div className="card-header bg-primary text-white fw-bold">
                      Class: {timetable.className}
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

                                  const slot = timetable.schedule.find(
                                    (s) => s.day === day && s.time === time
                                  );

                                  if (!slot)
                                    return <td key={i}>Free Period</td>;

                                  return (
                                    <td key={i}>
                                      <div>
                                        {slot.subject?.name || "Free Period"}
                                      </div>
                                      <div className="text-muted small">
                                        {slot.teacher?.name || "-"}
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
              <button
                className="btn btn-danger px-4"
                onClick={handleDeleteAll}
              >
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
