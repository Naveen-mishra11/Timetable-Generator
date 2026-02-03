import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";

const TeacherHomePage = () => {
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userRole = sessionStorage.getItem("role");
    const userName = sessionStorage.getItem("username");

    // redirect if not logged in or not teacher
    if (!userRole || userRole !== "teacher") {
      navigate("/login");
    } else {
      setRole(userRole);
      setUsername(userName || "Teacher");
    }
  }, [navigate]);

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2 className="text-center mb-4">
          Welcome {username} ({role})
        </h2>

        <div className="row justify-content-center">
          {/* View Timetable */}
          <div className="col-md-5 card shadow mt-5">
            <div className="p-3">
              <h5>My Timetable</h5>
              <p>
                View your assigned timetable, including
                subjects, periods, and classes.
              </p>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/teacher-timetable")}
              >
                View Timetable
              </button>
            </div>
          </div>

          <div className="col-md-2"></div>

          {/* View Subjects */}
          <div className="col-md-5 card shadow mt-5">
            <div className="p-3">
              <h5>My Subjects</h5>
              <p>
                View the subjects you are assigned
                to teach (theory / lab).
              </p>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/teacher-subjects")}
              >
                View Subjects
              </button>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
};

export default TeacherHomePage;
