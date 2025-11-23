import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const ViewSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/subjects`);
      setSubjects(res.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to load subjects");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${serverUrl}/api/subjects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Subject deleted successfully!");
      // Remove deleted subject from state
      setSubjects(subjects.filter((s) => s._id !== id));
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to delete subject");
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">All Subjects</h2>
          {message && <div className="alert alert-info">{message}</div>}

          {subjects.length === 0 ? (
            <p className="text-center">No subjects found</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead className="table-primary">
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Hours/Week</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject._id}>
                    <td>{subject.name}</td>
                    <td>{subject.code}</td>
                    <td className="text-capitalize">
                      {subject.type}
                    </td>
                    <td>{subject.hoursPerWeek}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(subject._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ViewSubjects;
