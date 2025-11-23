import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const AddTeacher = () => {
  const [name, setName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [teachingType, setTeachingType] = useState([]);
  const [maxConsecutive, setMaxConsecutive] = useState(2);
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const toggleSubject = (id) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleTeachingTypeChange = (type) => {
    setTeachingType((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${serverUrl}/api/teachers`,
        {
          name,
          subjects: selectedSubjects,
          teachingType,
          maxConsecutive,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage("✅ Teacher added successfully!");
      setName("");
      setSelectedSubjects([]);
      setTeachingType([]);
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

            {/* Custom Multi-Select for Subjects */}
            <div className="mb-3 position-relative">
              <label className="form-label">Select Subjects</label>
              <div
                className="form-control d-flex justify-content-between align-items-center"
                style={{ cursor: "pointer" }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedSubjects.length > 0
                  ? `${selectedSubjects.length} subject(s) selected`
                  : "Select subjects"}
                <i
                  className={`bi bi-chevron-${dropdownOpen ? "up" : "down"}`}
                ></i>
              </div>

              {dropdownOpen && (
                <div
                  className="border rounded mt-1 p-2 bg-white shadow-sm position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: "200px", overflowY: "auto" }}
                >
                  {subjects.map((subj) => (
                    <div
                      key={subj._id}
                      className="form-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={subj._id}
                        checked={selectedSubjects.includes(subj._id)}
                        onChange={() => toggleSubject(subj._id)}
                      />
                      <label
                        htmlFor={subj._id}
                        className="form-check-label"
                      >
                        {subj.name} ({subj.code})
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teaching Type (Theory / Lab) */}
            <div className="mb-3">
              <label className="form-label d-block">Teaching Type</label>
              <div className="form-check form-check-inline">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="theory"
                  checked={teachingType.includes("theory")}
                  onChange={() => handleTeachingTypeChange("theory")}
                />
                <label htmlFor="theory" className="form-check-label">
                  Theory
                </label>
              </div>

              <div className="form-check form-check-inline">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="lab"
                  checked={teachingType.includes("lab")}
                  onChange={() => handleTeachingTypeChange("lab")}
                />
                <label htmlFor="lab" className="form-check-label">
                  Lab
                </label>
              </div>
            </div>

            {/* Max Consecutive Classes */}
            <div className="mb-3">
              <label className="form-label">Max Consecutive Classes</label>
              <input
                type="number"
                className="form-control"
                value={maxConsecutive}
                onChange={(e) => setMaxConsecutive(Number(e.target.value))}
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
