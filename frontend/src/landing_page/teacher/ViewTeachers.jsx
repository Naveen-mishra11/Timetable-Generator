import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Footer from "../Footer";

const serverUrl = import.meta.env.VITE_SERVER_URL;

const ViewTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/teachers`);
      setTeachers(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setLoading(false);
    }
  };

  const deleteTeacher = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) return;
    try {
      await axios.delete(`${serverUrl}/api/teachers/${id}`);
      setTeachers((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error("Error deleting teacher:", err);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2 className="mb-4 text-center">Teachers List</h2>

        {loading ? (
          <p className="text-center">Loading...</p>
        ) : teachers.length === 0 ? (
          <p className="text-center">No teachers found.</p>
        ) : (
          <div className="table-responsive shadow rounded">
            <table className="table table-bordered table-striped align-middle">
              <thead className="table-primary">
                <tr>
                  <th>Name</th>
                  <th>Subjects</th>
                  <th>Teaching Type</th>
                  <th>Max Consecutive</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher._id}>
                    <td>{teacher.user?.username || "N/A"}</td>

                    {/* Show all subjects */}
                    <td>
                      {teacher.subjects && teacher.subjects.length > 0
                        ? teacher.subjects
                            .map((s) => s?.name || "N/A")
                            .join(", ")
                        : "N/A"}
                    </td>

                    {/* Show teaching type */}
                    <td>
                      {teacher.teachingType && teacher.teachingType.length > 0
                        ? teacher.teachingType
                            .map(
                              (t) =>
                                t.charAt(0).toUpperCase() + t.slice(1) // capitalize
                            )
                            .join(", ")
                        : "N/A"}
                    </td>

                    <td>{teacher.maxConsecutive}</td>

                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteTeacher(teacher._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ViewTeachers;
