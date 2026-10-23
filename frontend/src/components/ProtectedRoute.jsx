import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your account role (<span className="font-semibold text-slate-800">{user.role}</span>) does not have permission to view this page.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
