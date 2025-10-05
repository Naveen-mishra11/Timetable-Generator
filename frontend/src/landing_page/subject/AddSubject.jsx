import React, { useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const AddSubject = () => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    hoursPerWeek: 4,
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "hoursPerWeek" ? Number(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Replace with your backend API
      const token = localStorage.getItem("token"); // if protected
      const res = await axios.post(
        `${serverUrl}/api/subjects`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message || "Subject added successfully!");
      setFormData({ name: "", code: "", hoursPerWeek: 4 });
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong!");
    }
  };

  return (
    <>
      <Navbar />
      <div className="d-flex flex-column min-vh-100">
        <div className="flex-grow-1 container d-flex justify-content-center align-items-center mt-5">
          <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
            <h3 className="text-center mb-4">Add Subject</h3>
            {message && <div className="alert alert-info">{message}</div>}
            <form onSubmit={handleSubmit}>
              {/* Subject Name */}
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Subject Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Subject Code */}
              <div className="mb-3">
                <label htmlFor="code" className="form-label">
                  Subject Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Hours per Week */}
              <div className="mb-3">
                <label htmlFor="hoursPerWeek" className="form-label">
                  Hours per Week
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="hoursPerWeek"
                  name="hoursPerWeek"
                  value={formData.hoursPerWeek}
                  onChange={handleChange}
                  min={1}
                  max={10}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Add Subject
              </button>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default AddSubject;
