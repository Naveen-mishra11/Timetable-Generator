import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const serverUrl = import.meta.env.VITE_SERVER_URL;

const AddTeacher = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [teachingType, setTeachingType] = useState([]);
  const [maxConsecutive, setMaxConsecutive] = useState(2);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, []);

  /* ================= FETCH TEACHERS ================= */
  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/users/teachers`);
      setTeachers(res.data);
    } catch (err) {
      setMessage("❌ Failed to load teachers",err);
    }
  };

  /* ================= FETCH SUBJECTS ================= */
  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/subjects`);
      setSubjects(res.data);
    } catch (err) {
      setMessage("❌ Failed to load subjects",err);
    }
  };

  /* ================= SUBJECT MULTI-SELECT ================= */
  const toggleSubject = (id) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  /* ================= TEACHING TYPE ================= */
  const handleTeachingTypeChange = (type) => {
    setTeachingType((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTeacher) {
      setMessage("⚠️ Please select a teacher");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");

      await axios.post(
        `${serverUrl}/api/teachers`,
        {
          user: selectedTeacher,        // 🔥 USER ID (Teacher)
          subjects: selectedSubjects,
          teachingType,
          maxConsecutive,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage("✅ Teacher added successfully!");
      setSelectedTeacher("");
      setSelectedSubjects([]);
      setTeachingType([]);
      setMaxConsecutive(2);
    } catch (err) {
      setMessage(err.response?.data?.error || "❌ Failed to add teacher");
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

            {/* ================= SELECT TEACHER ================= */}
            <div className="mb-3">
              <label className="form-label">Select Teacher</label>
              <select
                className="form-select"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                required
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.username}
                  </option>
                ))}
              </select>
            </div>

            {/* ================= SUBJECT MULTI SELECT ================= */}
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
                <i className={`bi bi-chevron-${dropdownOpen ? "up" : "down"}`} />
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
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedSubjects.includes(subj._id)}
                        onChange={() => toggleSubject(subj._id)}
                      />
                      <label className="form-check-label">
                        {subj.name} ({subj.code})
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ================= TEACHING TYPE ================= */}
            <div className="mb-3">
              <label className="form-label d-block">Teaching Type</label>

              <div className="form-check form-check-inline">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={teachingType.includes("theory")}
                  onChange={() => handleTeachingTypeChange("theory")}
                />
                <label className="form-check-label">Theory</label>
              </div>

              <div className="form-check form-check-inline">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={teachingType.includes("lab")}
                  onChange={() => handleTeachingTypeChange("lab")}
                />
                <label className="form-check-label">Lab</label>
              </div>
            </div>

            {/* ================= MAX CONSECUTIVE ================= */}
            <div className="mb-3">
              <label className="form-label">Max Consecutive Classes</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={maxConsecutive}
                onChange={(e) => setMaxConsecutive(Number(e.target.value))}
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
