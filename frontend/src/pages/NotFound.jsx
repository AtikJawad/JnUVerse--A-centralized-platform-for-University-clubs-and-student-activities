import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

/**
 * NotFound — Week 9 Stage 2
 * Unknown URLs show this page (Stitch empty-state style) instead of silently redirecting.
 */
export default function NotFound() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col">
      <Navbar />
      <main className="w-full pt-20 flex-1 flex items-center justify-center px-5">
        <div className="max-w-md w-full flex flex-col items-center text-center p-10 sm:p-12 bg-surface-white rounded-3xl shadow-[0_4px_24px_rgba(43,52,185,0.04)] my-12">
          <div className="w-20 h-20 rounded-full bg-surface-lavender flex items-center justify-center text-primary-container mb-4 shadow-sm">
            <span className="material-symbols-outlined text-[40px]">travel_explore</span>
          </div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Error 404</span>
          <h1 className="text-xl font-bold text-on-surface mb-2">This page does not exist.</h1>
          <p className="text-[15px] leading-6 text-text-muted mb-1">
            We could not find <code className="px-1.5 py-0.5 rounded bg-canvas-base text-[13px] break-all">{location.pathname}</code>.
          </p>
          <p className="text-[15px] leading-6 text-text-muted mb-6">It may have moved, or the link may be mistyped.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/clubs"
              className="px-5 py-2.5 rounded-full bg-surface-lavender text-primary text-xs font-bold hover:bg-surface-variant transition-colors"
            >
              Explore clubs
            </Link>
            <Link
              to={isAuthenticated ? "/" : "/login"}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:bg-primary-hover transition-colors"
            >
              {isAuthenticated ? "Go to dashboard" : "Log in"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
