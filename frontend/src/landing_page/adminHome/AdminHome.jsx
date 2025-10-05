import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";

const AdminHome = () => {
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userRole = localStorage.getItem("role");
    const userName = localStorage.getItem("username");

    // redirect if not logged in or not admin
    if (!userRole || userRole !== "admin") {
      navigate("/login");
    } else {
      setRole(userRole);
      setUsername(userName || "User");
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
          {/* Add Subject */}
          <div className="col-md-5 card shadow mt-5">
            <div className="p-3 ">
              <h5>Add Subject</h5>
              <p>
                Here you can add the subject for the
                <br />
                timetable generator app.The Subject <br /> contain Subject Name,
                Subject Code, <br />
                and How many hours it will taught in week.
              </p>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/add-subject")}
              >
                Add Subject
              </button>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/view-subject")}
              >
                View Subject
              </button>
            </div>
          </div>
          <div className="col-md-2"></div>

          {/* Add Teacher */}
          <div className="col-md-5 card shadow mt-5">
            <div className="p-3 ">
              <h5>Add Teacher</h5>
              <p>
                Here you can add the teacher for the
                <br />
                timetable generator app.The teacher <br /> contain Teacher Name,
                Teacher Subject, <br />
                and How max consecutive hours they can teach.
              </p>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/add-teacher")}
              >
                Add teacher
              </button>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/view-teacher")}
              >
                View teacher
              </button>
            </div>
          </div>
        </div>

        <div className="row justify-content-center">
          {/* Add Class */}
          <div className="col-md-5 card shadow mt-5">
            <div className="p-3 ">
              <h5>Add Class</h5>
              <p>
                Here you can add the Class for the
                <br />
                timetable generator app.The Class <br /> contain Class Name,
                and Which <br />subject will be taught in the class.
              </p>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/add-class")}
              >
                Add Class
              </button>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/view-class")}
              >
                View Class
              </button>
            </div>
          </div>

          <div className="col-md-2"></div>

          {/* Generate Timetable */}
          <div className="col-md-5 card shadow mt-5">
            <div className="p-3 ">
              <h5>Generate Timetable</h5>
              <p>
                Here you can generate the timetable for <br /> the class. 
                Its uses the subject , teacher and <br /> class data to generate the
                Timetable. Here <br /> you can view or generate timetable.
              </p>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/generate-timetable")}
              >
                Generate Tiemtable
              </button>
              <button
                className="btn btn-primary m-2"
                onClick={() => navigate("/view-timetable")}
              >
                View Timetable
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminHome;
