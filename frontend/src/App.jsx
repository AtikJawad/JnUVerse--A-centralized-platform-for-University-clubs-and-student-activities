import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterClub from "./pages/RegisterClub";
import Dashboard from "./pages/Dashboard";
import ExploreClubs from "./pages/ExploreClubs";
import ClubDetail from "./pages/ClubDetail";
import MyClubs from "./pages/MyClubs";
import OperatorMembers from "./pages/OperatorMembers";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/club" element={<RegisterClub />} />
          <Route path="/register-club" element={<Navigate to="/register/club" replace />} />
          <Route path="/register/operator" element={<Navigate to="/register/club" replace />} />

          {/* Public & Discovery Routes */}
          <Route path="/clubs" element={<ExploreClubs />} />
          <Route path="/explore" element={<Navigate to="/clubs" replace />} />
          <Route path="/explore-clubs" element={<Navigate to="/clubs" replace />} />
          <Route path="/clubs/:slug" element={<ClubDetail />} />

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

          {/* Protected General Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
