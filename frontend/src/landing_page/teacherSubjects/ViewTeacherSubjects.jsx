import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ViewTeacherSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMySubjects();
  }, []);

  const fetchMySubjects = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setError("Unauthorized. Please login again.");
        setLoading(false);
        return;
      }

      const res = await axios.get(`${SERVER_URL}/api/teachers/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSubjects(res.data.subjects || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setError(
        err.response?.data?.error || "Failed to load assigned subjects"
      );
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5 mb-5">
        <h2 className="text-center mb-4">My Assigned Subjects</h2>

        {loading && <p className="text-center">Loading...</p>}

        {error && (
          <div className="alert alert-danger text-center">{error}</div>
        )}

        {!loading && !error && subjects.length === 0 && (
          <p className="text-center">No subjects assigned.</p>
        )}

        {!loading && subjects.length > 0 && (
          <div className="table-responsive shadow rounded">
            <table className="table table-bordered table-striped align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subj, index) => (
                  <tr key={subj._id}>
                    <td>{index + 1}</td>
                    <td>{subj.name}</td>
                    <td>{subj.code}</td>
                    <td className="text-capitalize">{subj.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ViewTeacherSubjects;
