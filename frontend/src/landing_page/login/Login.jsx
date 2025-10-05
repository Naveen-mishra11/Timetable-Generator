import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
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
      // 🔗 Update with your backend login API route
      const res = await axios.post(
        `${serverUrl}/api/auth/login`,
        formData
      );

      // ✅ Save token in localStorage
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("username", res.data.username);
        setMessage("Login successful!");
        navigate("/admin-home");
      } else {
        setMessage("No token received!");
      }

      setFormData({ username: "", password: "" });
    } catch (err) {
      setMessage(err.response?.data?.error || "Invalid credentials!");
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
          <h3 className="text-center mb-4">Login</h3>
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

            {/* Submit */}
            <button type="submit" className="btn btn-primary w-100">
              Login
            </button>
          </form>
          <br />
          <p style={{ marginLeft: "3rem" }}>
            Don't have an account?{" "}
            <a href="/signup" style={{ textDecoration: "none" }}>
              Sign Up
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Login;
