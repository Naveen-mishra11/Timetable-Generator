import React, { useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"]; // matches your default periodsPerDay

export default function ApplyLeave() {
  const [weekday, setWeekday] = useState("Monday");
  const [isFullDay, setIsFullDay] = useState(true);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const togglePeriod = (p) => {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!isFullDay && selectedPeriods.length === 0) {
      setMessage("Please select periods for half-day leave.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${SERVER_URL}/api/leaves`,
        {
          weekday,
          isFullDay,
          periods: isFullDay ? [] : selectedPeriods,
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      setMessage("Leave applied successfully (Pending admin approval).");
      setReason("");
      setIsFullDay(true);
      setSelectedPeriods([]);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to apply leave.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5" style={{ maxWidth: 700 }}>
          <h2 className="mb-4 text-center">Apply Leave</h2>

          {message && <div className="alert alert-info">{message}</div>}

          <div className="card shadow-sm">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Weekday</label>
                  <select
                    className="form-select"
                    value={weekday}
                    onChange={(e) => setWeekday(e.target.value)}
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    This leave will apply only for the <b>next coming</b> {weekday}.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Duration</label>
                  <div className="d-flex gap-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="duration"
                        checked={isFullDay}
                        onChange={() => setIsFullDay(true)}
                      />
                      <label className="form-check-label">Full day</label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="duration"
                        checked={!isFullDay}
                        onChange={() => setIsFullDay(false)}
                      />
                      <label className="form-check-label">Half day / periods</label>
                    </div>
                  </div>
                </div>

                {!isFullDay && (
                  <div className="mb-3">
                    <label className="form-label">Select periods</label>
                    <div className="d-flex flex-wrap gap-2">
                      {PERIODS.map((p) => (
                        <button
                          type="button"
                          key={p}
                          className={`btn btn-sm ${
                            selectedPeriods.includes(p)
                              ? "btn-success"
                              : "btn-outline-success"
                          }`}
                          onClick={() => togglePeriod(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Reason (optional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <button className="btn btn-primary" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Leave"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
