import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth components
import RequireAuth from "./components/auth/RequireAuth";
import RequireRole from "./components/auth/RequireRole";

// Firebase notifications
import { useFirebaseNotifications } from "./hooks/useFirebaseNotifications";


// Layouts
import AdminLayout from "./layouts/AdminLayout";
import StaffLayout from "./layouts/StaffLayout";
import HeadDepartmentLayout from "./layouts/HeadDepartmentLayout";
import LecturerLayout from "./layouts/LecturerLayout";
import StudentLayout from "./layouts/StudentLayout";

// Pages
import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

// Admin Pages
import AdminAccountsPage from "./pages/admin/accounts/AccountsPage";

// Staff Pages
import StaffAccountsPage from "./pages/staff/accounts/AccountsPage";
import StaffClassesPage from "./pages/staff/courses/ClassesPage";
import StaffSubjectsPage from "./pages/staff/courses/SubjectsPage";
import StaffSyllabusPage from "./pages/staff/courses/SyllabusPage";
import StaffEnrollmentPage from "./pages/staff/courses/EnrollmentPage";

// HeadDepartment Pages - CourseService
import HeadDepartmentClassesPage from "./pages/head-department/classes/ClassesPage";
import HeadDepartmentSubjectsPage from "./pages/head-department/subjects/SubjectsPage";
// HeadDepartment Pages - ProjectService
import DeptHeadDashboard from "./pages/head-department/projects/DeptHeadDashboard";
import ProjectApproval from "./pages/head-department/projects/ProjectApproval";

// Lecturer Pages - CourseService
import LecturerClassesPage from "./pages/lecturer/classes/ClassesPage";
import LecturerGroupsPage from "./pages/lecturer/groups/GroupsPage";
// Lecturer Pages - ProjectService
import LecturerProjectList from "./pages/lecturer/projects/ProjectList";
import LecturerCreateProject from "./pages/lecturer/projects/CreateProject";
import LecturerGradeProject from "./pages/lecturer/projects/GradeProject";
import LecturerGroupManagement from "./pages/lecturer/projects/GroupManagement";
import LecturerProgress from "./pages/lecturer/projects/LecturerProgress";
// Lecturer Pages - CommunicationService
import LecturerCommunicationPage from "./pages/lecturer/communication/LecturerCommunicationPage";

// Student Pages - CourseService
import StudentClassesPage from "./pages/student/classes/ClassesPage";
import ClassDetailPage from "./pages/student/classes/ClassDetailPage";
// Student Pages - ProjectService
import StudentProjectDashboard from "./pages/student/projects/StudentDashboard";
import StudentWorkspace from "./pages/student/projects/Workspace";
// Student Pages - CommunicationService
import StudentCommunicationPage from "./pages/student/communication/StudentCommunicationPage";

// Meeting Page
import MeetingRoomPage from "./pages/meeting/MeetingRoomPage";

function App() {
  // Initialize Firebase push notifications
  useFirebaseNotifications();

  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/meeting/:meetingId" element={<MeetingRoomPage />} />

        {/* Protected routes */}
        <Route element={<RequireAuth />}>
          {/* Admin routes */}
          <Route element={<RequireRole allowedRoles={["Admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={<Navigate to="/admin/accounts" replace />}
              />
              <Route path="accounts" element={<AdminAccountsPage />} />
            </Route>
          </Route>

          {/* Staff routes */}
          <Route element={<RequireRole allowedRoles={["Staff"]} />}>
            <Route path="/staff" element={<StaffLayout />}>
              <Route
                index
                element={<Navigate to="/staff/accounts" replace />}
              />

              {/* Account Management (AccountService) */}
              <Route path="accounts" element={<StaffAccountsPage />} />

              {/* Course Management (CourseService) */}
              <Route path="subjects" element={<StaffSubjectsPage />} />
              <Route path="syllabus" element={<StaffSyllabusPage />} />
              <Route path="classes" element={<StaffClassesPage />} />
              <Route path="enrollment" element={<StaffEnrollmentPage />} />
            </Route>
          </Route>

          {/* HeadDepartment routes */}
          <Route element={<RequireRole allowedRoles={["HeadDepartment"]} />}>
            <Route path="/head-department" element={<HeadDepartmentLayout />}>
              <Route
                index
                element={<Navigate to="/head-department/classes" replace />}
              />

              {/* Course Management (CourseService) */}
              <Route path="classes" element={<HeadDepartmentClassesPage />} />
              <Route path="subjects" element={<HeadDepartmentSubjectsPage />} />

              {/* Project Management (ProjectService) */}
              <Route path="projects" element={<DeptHeadDashboard />} />
              <Route path="projects/approval" element={<ProjectApproval />} />
            </Route>
          </Route>

          {/* Lecturer routes */}
          <Route element={<RequireRole allowedRoles={["Lecturer"]} />}>
            <Route path="/lecturer" element={<LecturerLayout />}>
              <Route
                index
                element={<Navigate to="/lecturer/classes" replace />}
              />

              {/* Course Management (CourseService) */}
              <Route path="classes" element={<LecturerClassesPage />} />
              <Route path="groups" element={<LecturerGroupsPage />} />

              {/* Project Management (ProjectService) */}
              <Route path="projects" element={<LecturerProjectList />} />
              <Route
                path="projects/create"
                element={<LecturerCreateProject />}
              />
              <Route path="projects/grade" element={<LecturerGradeProject />} />
              <Route
                path="projects/grade/:projectId"
                element={<LecturerGradeProject />}
              />
              <Route
                path="projects/groups"
                element={<LecturerGroupManagement />}
              />
              <Route path="projects/progress" element={<LecturerProgress />} />
              <Route path="projects/progress/:projectId" element={<LecturerProgress />} />

              {/* Communication (CommunicationService) */}
              <Route path="communication" element={<LecturerCommunicationPage />} />
            </Route>
          </Route>

          {/* Student routes */}
          <Route element={<RequireRole allowedRoles={["Student"]} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route
                index
                element={<Navigate to="/student/classes" replace />}
              />

              {/* Course Management (CourseService) */}
              <Route path="classes" element={<StudentClassesPage />} />
              <Route path="classes/:classId" element={<ClassDetailPage />} />

              {/* Project Management (ProjectService) */}
              <Route path="projects" element={<StudentProjectDashboard />} />
              {/* Kanban and Milestones should only be accessed from Workspace */}
              <Route path="projects/kanban" element={<Navigate to="/student/projects" replace />} />
              <Route
                path="projects/milestones"
                element={<Navigate to="/student/projects" replace />}
              />
              <Route
                path="projects/workspace/:projectId"
                element={<StudentWorkspace />}
              />

              {/* Communication (CommunicationService) */}
              <Route path="communication" element={<StudentCommunicationPage />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
