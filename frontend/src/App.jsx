import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import OperatorLogin from "./pages/OperatorLogin";
import Register from "./pages/Register";
import RegisterClub from "./pages/RegisterClub";
import Dashboard from "./pages/Dashboard";
import ExploreClubs from "./pages/ExploreClubs";
import ClubDetail from "./pages/ClubDetail";
import MyClubs from "./pages/MyClubs";
import OperatorMembers from "./pages/OperatorMembers";
import ExploreEvents from "./pages/ExploreEvents";
import EventDetail from "./pages/EventDetail";
import OperatorEventForm from "./pages/OperatorEventForm";
import OperatorEvents from "./pages/OperatorEvents";
import OperatorEventAttendees from "./pages/OperatorEventAttendees";
import OperatorNotices from "./pages/OperatorNotices";
import OperatorCollaborations from "./pages/OperatorCollaborations";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import OperatorDashboard from "./pages/OperatorDashboard";
import MyReports from "./pages/MyReports";
import OperatorAnalytics from "./pages/OperatorAnalytics";
import OperatorEventAnalytics from "./pages/OperatorEventAnalytics";
import MyActivity from "./pages/MyActivity";

// "/" and "/dashboard": club operators get the Club Operator Dashboard, students the Student Dashboard
function RoleDashboard() {
  const { user } = useAuth();
  return user?.role === "club_operator" ? <OperatorDashboard /> : <Dashboard />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/operator/login" element={<OperatorLogin />} />
          <Route path="/operator-login" element={<Navigate to="/operator/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/club" element={<RegisterClub />} />
          <Route path="/register-club" element={<Navigate to="/register/club" replace />} />
          <Route path="/register/operator" element={<Navigate to="/register/club" replace />} />

          {/* Public & Discovery Routes */}
          <Route path="/clubs" element={<ExploreClubs />} />
          <Route path="/explore" element={<Navigate to="/clubs" replace />} />
          <Route path="/explore-clubs" element={<Navigate to="/clubs" replace />} />
          <Route path="/clubs/:slug" element={<ClubDetail />} />
          <Route path="/events" element={<ExploreEvents />} />
          <Route path="/events/:id" element={<EventDetail />} />

          {/* Notifications Inbox Route */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={["student", "club_operator"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Student Profile & Interests Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Student Activity (Week 8: report 4) */}
          <Route
            path="/my-activity"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <MyActivity />
              </ProtectedRoute>
            }
          />

          {/* My Reports (students and club operators) */}
          <Route
            path="/my-reports"
            element={
              <ProtectedRoute allowedRoles={["student", "club_operator"]}>
                <MyReports />
              </ProtectedRoute>
            }
          />

          {/* Student Membership Routes */}
          <Route
            path="/my-clubs"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <MyClubs />
              </ProtectedRoute>
            }
          />

          {/* Club Operator Member Management Routes */}
          <Route
            path="/operator/members"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorMembers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:slug/members"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorMembers />
              </ProtectedRoute>
            }
          />

          {/* Club Operator Event Management Routes */}
          <Route
            path="/operator/events"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/events/new"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorEventForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/events/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorEventForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/events/:id/attendees"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorEventAttendees />
              </ProtectedRoute>
            }
          />

          {/* Club Operator Analytics (Week 8: reports 3 and 5) */}
          <Route
            path="/operator/analytics"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorAnalytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/operator/events/:id/analytics"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorEventAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Club Operator Notice Management Route */}
          <Route
            path="/operator/notices"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorNotices />
              </ProtectedRoute>
            }
          />

          {/* Club Operator Collaboration Management Route */}
          <Route
            path="/operator/collaborations"
            element={
              <ProtectedRoute allowedRoles={["club_operator"]}>
                <OperatorCollaborations />
              </ProtectedRoute>
            }
          />
          <Route path="/operator-collaborations" element={<Navigate to="/operator/collaborations" replace />} />

          {/* Protected General Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to clubs or dashboard */}
          <Route path="*" element={<Navigate to="/clubs" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
