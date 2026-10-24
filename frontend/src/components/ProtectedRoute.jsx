import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./LoadingState";

/**
 * ProtectedRoute: Restricts access to authenticated users and optionally checks roles.
 *
 * @param {Array<string>} [allowedRoles] - Optional list of allowed roles (e.g. ['student', 'club_operator'])
 * @param {React.ReactNode} [children] - Child components to render if authorized
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Checking authentication..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-white rounded-2xl shadow-resting border border-border-subtle p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error-container/60 text-error flex items-center justify-center font-bold text-xl">
            <span className="material-symbols-outlined text-[24px]">block</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2">Access Restricted</h2>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            Your account role (<span className="font-semibold text-on-surface">{user.role}</span>) does not have permission to view this page.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-full shadow-resting transition-all duration-200"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
