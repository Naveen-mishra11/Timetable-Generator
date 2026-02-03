import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function ViewSubstitutions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Per substitution row UI state
  const [freeTeachersBySubId, setFreeTeachersBySubId] = useState({}); // { [subId]: [{_id, username}] }
  const [selectedTeacherBySubId, setSelectedTeacherBySubId] = useState({}); // { [subId]: teacherId }
  const [loadingFreeBySubId, setLoadingFreeBySubId] = useState({}); // { [subId]: boolean }

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/leaves/substitutions`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setSubs(res.data);

      // Keep selected value in sync with current assigned substitute (if any)
      setSelectedTeacherBySubId((prev) => {
        const next = { ...prev };
        for (const s of res.data) {
          if (s?.substituteTeacher?._id) {
            next[s._id] = s.substituteTeacher._id;
          } else if (next[s._id] === undefined) {
            next[s._id] = "";
          }
        }
        return next;
      });
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to load substitutions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeTeachers = async (subId) => {
    try {
      setLoadingFreeBySubId((prev) => ({ ...prev, [subId]: true }));
      const res = await axios.get(
        `${SERVER_URL}/api/leaves/substitutions/${subId}/free-teachers`,
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );
      setFreeTeachersBySubId((prev) => ({ ...prev, [subId]: res.data.freeTeachers || [] }));
      // keep whatever selection we already have (it is synced in fetchSubs)
      setSelectedTeacherBySubId((prev) => ({ ...prev, [subId]: prev[subId] ?? "" }));
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to load free teachers.");
    } finally {
      setLoadingFreeBySubId((prev) => ({ ...prev, [subId]: false }));
    }
  };

  const assignTeacher = async (subId) => {
    try {
      const teacherId = selectedTeacherBySubId[subId] || null;
      await axios.patch(
        `${SERVER_URL}/api/leaves/substitutions/${subId}/assign`,
        { teacherId },
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );
      setMessage(teacherId ? "Assigned successfully." : "Left as unassigned.");
      await fetchSubs();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to assign teacher.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">Substitutions</h2>
          {message && <div className="alert alert-info">{message}</div>}

          {loading ? (
            <div className="text-center">Loading...</div>
          ) : subs.length === 0 ? (
            <div className="alert alert-info text-center">No substitutions.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-striped">
                <thead className="table-primary">
                  <tr>
                    <th>Valid Date</th>
                    <th>Class</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Original Teacher</th>
                    <th>Substitute Teacher</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s._id}>
                      <td>{s.validForDate ? new Date(s.validForDate).toDateString() : "-"}</td>
                      <td>{s.className}</td>
                      <td>{s.weekday}</td>
                      <td>{s.time}</td>
                      <td>{s.subject?.name || "-"}</td>
                      <td>{s.originalTeacher?.user?.username || "-"}</td>
                      <td>{s.substituteTeacher?.user?.username || "UNASSIGNED"}</td>
                      <td>
                        <span
                          className={`badge ${
                            s.status === "assigned" ? "bg-success" : "bg-danger"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <div className="d-flex flex-column gap-2">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => fetchFreeTeachers(s._id)}
                            disabled={!!loadingFreeBySubId[s._id]}
                          >
                            {loadingFreeBySubId[s._id] ? "Loading..." : "Show Free Teachers"}
                          </button>

                          {Array.isArray(freeTeachersBySubId[s._id]) && (
                            <>
                              {freeTeachersBySubId[s._id].length === 0 ? (
                                <div className="small text-danger">
                                  No free teachers found for this period.
                                </div>
                              ) : (
                                <select
                                  className="form-select form-select-sm"
                                  value={selectedTeacherBySubId[s._id] ?? ""}
                                  onChange={(e) =>
                                    setSelectedTeacherBySubId((prev) => ({
                                      ...prev,
                                      [s._id]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">
                                    -- Keep Unassigned --
                                  </option>
                                  {freeTeachersBySubId[s._id].map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {t.username}
                                      {t.familiarWithClass ? " (teaches this class)" : ""}
                                      {Array.isArray(t.subjects) && t.subjects.length > 0
                                        ? ` | Subjects: ${t.subjects
                                            .map((ss) => ss?.name || ss?.code)
                                            .filter(Boolean)
                                            .join(", ")}`
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => assignTeacher(s._id)}
                                disabled={freeTeachersBySubId[s._id].length === 0}
                              >
                                Assign
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
}
