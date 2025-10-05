import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "admin", // default
  });

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 🔗 Update with your backend signup API route
      const res = await axios.post(
        `${serverUrl}/api/auth/register`,
        formData
      );

      // ✅ Save token in localStorage if provided
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/login");
      }

      setMessage(res.data.message || "User registered successfully!");
      setFormData({ username: "", password: "", role: "admin" });
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong!");
    }
  };

  return (
    <>
      <Navbar />
      <div
        className="container d-flex justify-content-center align-items-center mt-4"
        style={{ minHeight: "80vh" }}
      >
        <div
          className="card shadow p-4"
          style={{ maxWidth: "400px", width: "100%" }}
        >
          <h3 className="text-center mb-4">Sign Up</h3>
          {message && <div className="alert alert-info">{message}</div>}
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                type="text"
                className="form-control"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {/* Role Selection */}
            <div className="mb-3">
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <select
                className="form-select"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-primary w-100">
              Sign Up
            </button>
          </form>
          <br />
          <p style={{ marginLeft: "3rem" }}>
            Already have an account?{" "}
            <a href="/login" style={{ textDecoration: "none" }}>
              Login
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Signup;
