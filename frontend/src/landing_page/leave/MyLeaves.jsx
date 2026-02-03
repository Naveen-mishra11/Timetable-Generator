import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/leaves/my`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setLeaves(res.data);
    } catch (err) {
      console.error("fetchLeaves error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <h5>Loading leaves...</h5>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">My Leave Requests</h2>

          {leaves.length === 0 ? (
            <div className="alert alert-info text-center">No leave requests.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-striped">
                <thead className="table-primary">
                  <tr>
                    <th>Weekday</th>
                    <th>Duration</th>
                    <th>Periods</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Admin Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id}>
                      <td>{l.weekday}</td>
                      <td>{l.isFullDay ? "Full day" : "Periods"}</td>
                      <td>{l.isFullDay ? "-" : (l.periods || []).join(", ")}</td>
                      <td>
                        <span
                          className={`badge ${
                            l.status === "approved"
                              ? "bg-success"
                              : l.status === "rejected"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td>{l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}</td>
                      <td>{l.adminComment || "-"}</td>
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
