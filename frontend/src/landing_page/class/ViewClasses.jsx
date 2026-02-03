import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ViewClasses = () => {
  const [classes, setClasses] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch all classes
  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/classes`);
      setClasses(res.data || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setClasses([]);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Delete a class
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;

    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`${SERVER_URL}/api/classes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Class deleted successfully!");
      fetchClasses(); // refresh list
    } catch (err) {
      console.error(err);
      setMessage("Error deleting class: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">View Classes</h2>
          {message && <div className="alert alert-info">{message}</div>}

          {classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            <table className="table table-bordered shadow-sm bg-light">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Class Name</th>
                  <th>Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls, index) => (
                  <tr key={cls._id}>
                    <td>{index + 1}</td>
                    <td>{cls.name}</td>
                    <td>
                      {cls.subjects && cls.subjects.length > 0
                        ? cls.subjects.map((subj) => subj.name).join(", ")
                        : "No Subjects"}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(cls._id)}
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

export default ViewClasses;
