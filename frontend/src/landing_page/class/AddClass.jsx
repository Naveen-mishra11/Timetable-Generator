import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const AddClass = () => {
  const [className, setClassName] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch subjects for selection
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/api/subjects`);
        setSubjects(res.data || []);
      } catch (err) {
        console.error("Error fetching subjects:", err);
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, []);

  // Handle checkbox selection
  const handleSubjectChange = (id) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Submit new class
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!className) {
      setMessage("Class name is required!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${SERVER_URL}/api/classes`,
        { name: className, subjects: selectedSubjects },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Class added successfully!");
      setClassName("");
      setSelectedSubjects([]);
    } catch (err) {
      console.error(err);
      setMessage("Error adding class: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">Add Class</h2>
          {message && <div className="alert alert-info">{message}</div>}

          <form onSubmit={handleSubmit} className="card p-4 shadow bg-light">
            {/* Class Name */}
            <div className="mb-3">
              <label className="form-label">Class Name</label>
              <input
                type="text"
                className="form-control"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
            </div>

            {/* Subjects */}
            <div className="mb-3">
              <label className="form-label">Select Subjects</label>
              <div className="row">
                {subjects.length === 0 && <p>No subjects available</p>}
                {subjects.map((subj) => (
                  <div className="col-md-4" key={subj._id}>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={subj._id}
                        checked={selectedSubjects.includes(subj._id)}
                        onChange={() => handleSubjectChange(subj._id)}
                      />
                      <label className="form-check-label" htmlFor={subj._id}>
                        {subj.name} ({subj.code})
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn btn-primary w-100">
              Add Class
            </button>
          </form>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default AddClass;
