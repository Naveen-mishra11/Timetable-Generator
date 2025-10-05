import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ViewTimetables = () => {
  const [timetables, setTimetables] = useState([]);
  const [times, setTimes] = useState([]);

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/timetable/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setTimetables(res.data);

      // Extract unique time slots
      if (res.data.length > 0) {
        const uniqueTimes = [
          ...new Set(res.data.flatMap((t) => t.schedule.map((s) => s.time))),
        ];
        setTimes(uniqueTimes);
      }
    } catch (err) {
      console.error("Error fetching timetables:", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all timetables?")) return;

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

  // ✅ Download all timetables as PDF
  const handleExportPDF = () => {
    if (timetables.length === 0) return;

    const doc = new jsPDF();

    timetables.forEach((timetable, index) => {
      if (index !== 0) doc.addPage();

      doc.setFontSize(16);
      doc.text(`Class: ${timetable.className}`, 14, 20);

      const timesList = [...new Set(timetable.schedule.map((s) => s.time))];
      const daysList = [...new Set(timetable.schedule.map((s) => s.day))];

      const body = daysList.map((day) => {
        const row = [day];
        timesList.forEach((time) => {
          const slot = timetable.schedule.find(
            (s) => s.day === day && s.time === time
          );
          if (slot) {
            row.push(
              `${slot.subject?.name || slot.subject || ""}\n` +
              `${slot.teacher?.name || slot.teacher || ""}\n` +
              `${slot.room || ""}`
            );
          } else {
            row.push("-");
          }
        });
        return row;
      });

      autoTable(doc, {
        startY: 30,
        head: [["DAY / TIME", ...timesList]],
        body: body,
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
                              {times.map((time) => (
                                <th key={time}>{time}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {days.map((day) => (
                              <tr key={day}>
                                <td className="fw-bold">{day}</td>
                                {times.map((time) => {
                                  const slot = timetable.schedule.find(
                                    (s) => s.day === day && s.time === time
                                  );
                                  return (
                                    <td key={time}>
                                      {slot ? (
                                        <>
                                          <div>{slot.subject?.name || slot.subject || ""}</div>
                                          {slot.teacher && (
                                            <div className="text-muted small">
                                              ({slot.teacher?.name || slot.teacher || ""})
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
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {timetables.length > 0 && (
            <div className="text-center mt-4 d-flex gap-3 justify-content-center">
              <button
                onClick={handleDeleteAll}
                className="btn btn-danger px-4"
              >
                🗑️ Delete All Timetables
              </button>

              <button
                onClick={handleExportPDF}
                className="btn btn-secondary px-4"
              >
                📥 Download All Timetables (PDF)
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
