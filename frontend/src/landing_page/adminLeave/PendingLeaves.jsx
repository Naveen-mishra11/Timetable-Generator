import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function PendingLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/leaves/pending`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setLeaves(res.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to load pending leaves.");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    if (!window.confirm("Approve this leave and generate substitutions?") ) return;
    try {
      const res = await axios.patch(
        `${SERVER_URL}/api/leaves/${id}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );
      setMessage(
        `Approved. Substitutions generated: ${res.data.substitutionsGenerated} (valid for ${new Date(
          res.data.validForDate
        ).toDateString()})`
      );
      await fetchPending();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to approve.");
    }
  };

  const reject = async (id) => {
    if (!window.confirm("Reject this leave?") ) return;
    try {
      await axios.patch(
        `${SERVER_URL}/api/leaves/${id}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );
      setMessage("Rejected.");
      await fetchPending();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to reject.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">Pending Leave Requests</h2>
          {message && <div className="alert alert-info">{message}</div>}

          {loading ? (
            <div className="text-center">Loading...</div>
          ) : leaves.length === 0 ? (
            <div className="alert alert-success text-center">No pending leaves.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-striped">
                <thead className="table-primary">
                  <tr>
                    <th>Teacher</th>
                    <th>Weekday</th>
                    <th>Duration</th>
                    <th>Periods</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id}>
                      <td>{l.teacher?.user?.username || "-"}</td>
                      <td>{l.weekday}</td>
                      <td>{l.isFullDay ? "Full day" : "Periods"}</td>
                      <td>{l.isFullDay ? "-" : (l.periods || []).join(", ")}</td>
                      <td>{l.reason || "-"}</td>
                      <td className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => approve(l._id)}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => reject(l._id)}>
                          Reject
                        </button>
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
