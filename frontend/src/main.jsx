import { createRoot } from "react-dom/client";
import {BrowserRouter , Routes , Route} from "react-router-dom";
import "./index.css";
import HomePage from "./landing_page/home/HomePage";
import Signup from "./landing_page/signup/Signup";
import Login from "./landing_page/login/Login";
import AdminHome from "./landing_page/adminHome/AdminHome";
import AddSubject from "./landing_page/subject/AddSubject";
import ViewSubjects from "./landing_page/subject/ViewSubjects";
import AddTeacher from "./landing_page/teacher/AddTeacher";
import ViewTeachers from "./landing_page/teacher/ViewTeachers";
import AddClass from "./landing_page/class/AddClass";
import ViewClasses from "./landing_page/class/ViewClasses";
import GenerateTimetable from "./landing_page/timetable/GenerateTimetable";
import ViewTimetables from "./landing_page/timetable/ViewTimetables";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/signup" element={<Signup/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/admin-home" element={<AdminHome/>} />
      <Route path="/add-subject" element={<AddSubject/>} />
      <Route path="/view-subject" element={<ViewSubjects/>} />
      <Route path="/add-teacher" element={<AddTeacher/>} />
      <Route path="/view-teacher" element={<ViewTeachers/>} />
      <Route path="/add-class" element={<AddClass/>} />
      <Route path="/view-class" element={<ViewClasses/>} />
      <Route path="/generate-timetable" element={<GenerateTimetable/>} />
      <Route path="/view-timetable" element={<ViewTimetables/>}/>
    </Routes>
  </BrowserRouter>
);
