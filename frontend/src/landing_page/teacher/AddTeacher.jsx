import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const AddTeacher = () => {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [maxConsecutive, setMaxConsecutive] = useState(2);
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch subjects for dropdown
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${serverUrl}/api/teachers`,
        { name, subject, maxConsecutive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Teacher added successfully!");
      setName("");
      setSubject("");
      setMaxConsecutive(2);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to add teacher");
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container mt-5">
          <h2 className="text-center mb-4">Add Teacher</h2>
          {message && <div className="alert alert-info">{message}</div>}

          <form onSubmit={handleSubmit} className="shadow p-4 rounded bg-light">
            {/* Teacher Name */}
            <div className="mb-3">
              <label className="form-label">Teacher Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Subject Dropdown */}
            <div className="mb-3">
              <label className="form-label">Subject</label>
              <select
                className="form-select"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((subj) => (
                  <option key={subj._id} value={subj._id}>
                    {subj.name} ({subj.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Max Consecutive */}
            <div className="mb-3">
              <label className="form-label">Max Consecutive Classes</label>
              <input
                type="number"
                className="form-control"
                value={maxConsecutive}
                onChange={(e) => setMaxConsecutive(e.target.value)}
                min="1"
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Add Teacher
            </button>
          </form>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default AddTeacher;
