import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ServerStatusNotice from "./components/ServerStatusNotice";
import LoadingState from "./components/LoadingState";
// Week 9 Stage 3: route-level code splitting — each page loads on first visit
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const OperatorLogin = lazy(() => import("./pages/OperatorLogin"));
const Register = lazy(() => import("./pages/Register"));
const RegisterClub = lazy(() => import("./pages/RegisterClub"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExploreClubs = lazy(() => import("./pages/ExploreClubs"));
const ClubDetail = lazy(() => import("./pages/ClubDetail"));
const MyClubs = lazy(() => import("./pages/MyClubs"));
const OperatorMembers = lazy(() => import("./pages/OperatorMembers"));
const ExploreEvents = lazy(() => import("./pages/ExploreEvents"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const OperatorEventForm = lazy(() => import("./pages/OperatorEventForm"));
const OperatorEvents = lazy(() => import("./pages/OperatorEvents"));
const OperatorEventAttendees = lazy(() => import("./pages/OperatorEventAttendees"));
const OperatorNotices = lazy(() => import("./pages/OperatorNotices"));
const OperatorCollaborations = lazy(() => import("./pages/OperatorCollaborations"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const OperatorDashboard = lazy(() => import("./pages/OperatorDashboard"));
const MyReports = lazy(() => import("./pages/MyReports"));
const OperatorAnalytics = lazy(() => import("./pages/OperatorAnalytics"));
const OperatorEventAnalytics = lazy(() => import("./pages/OperatorEventAnalytics"));
const MyActivity = lazy(() => import("./pages/MyActivity"));

// "/" and "/dashboard": club operators get the Club Operator Dashboard, students the Student Dashboard
function RoleDashboard() {
  const { user } = useAuth();
  return user?.role === "club_operator" ? <OperatorDashboard /> : <Dashboard />;
}

// Week 9: a page crash shows a recoverable fallback; navigating elsewhere clears it
function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ServerStatusNotice />
        <RouteErrorBoundary>
        <Suspense fallback={<LoadingState message="Loading page..." fullScreen />}>
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

          {/* Unknown URLs: Not Found page (Week 9; previously a silent redirect to /clubs) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
