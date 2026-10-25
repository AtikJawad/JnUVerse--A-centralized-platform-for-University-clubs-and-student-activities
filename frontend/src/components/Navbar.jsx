import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Navbar Component — JnUVerse Stitch Reference Design
 *
 * Implements the 3-section layout from the Stitch design authority:
 * - Left: JnUVerse hub squircle mark, wordmark, and rounded "STUDENT PORTAL" badge
 * - Center: Centered rounded lavender container with Overview, Explore Clubs, My Clubs, Events
 * - Right: Notification bell with indicator, user details stack (Name + Batch/Department),
 *          circular profile icon, and logout button.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef(null);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) => {
    if (path === "/" || path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const getPortalLabel = () => {
    if (!isAuthenticated) return "Student Portal";
    return user?.role === "club_operator" ? "Operator Portal" : "Student Portal";
  };

  const getUserDisplayName = () => {
    if (!user) return "JnU Student";
    return user.name || user.email?.split("@")[0] || "JnU Student";
  };

  const getDepartmentShortForm = (dept) => {
    if (!dept) return "";
    // If the department string contains an abbreviation in parentheses like "Computer Science and Engineering (CSE)"
    const match = dept.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Mapping of standard department names to recognized short forms
    const deptMap = {
      "computer science and engineering": "CSE",
      "computer science": "CSE",
      "accounting and information systems": "AIS",
      "accounting": "AIS",
      "mass communication and journalism": "MCJ",
      "public administration": "PAD",
      "film and television": "FTV",
      "biochemistry and molecular biology": "BMB",
      "genetic engineering and biotechnology": "GEB",
      "land management & law": "LML",
      "land management and law": "LML",
      "islamic history and culture": "IHC",
      "islamic studies": "IS",
      "institute of education and research": "IER",
      "institute of modern languages": "IML",
      "management studies": "MGT",
      "political science": "POS",
      "social work": "SW",
      "geography & environment": "GEO",
      "geography and environment": "GEO",
      "mathematics": "Math",
      "statistics": "STAT",
      "physics": "Physics",
      "chemistry": "Chemistry",
      "economics": "Economics",
      "finance": "Finance",
      "marketing": "Marketing",
      "pharmacy": "Pharmacy",
      "microbiology": "Microbiology",
      "psychology": "Psychology",
      "sociology": "Sociology",
      "anthropology": "Anthropology",
      "botany": "Botany",
      "zoology": "Zoology",
      "english": "English",
      "bangla": "Bangla",
      "history": "History",
      "philosophy": "Philosophy",
      "music": "Music",
      "drama": "Drama",
      "law": "Law",
      "fine arts": "Fine Arts",
    };
    const normalized = dept.toLowerCase().trim();
    return deptMap[normalized] || dept;
  };

  const getUserSecondaryText = () => {
    if (!user) return "Batch 18 CSE";
    if (user.role === "club_operator") {
      return "Club Executive";
    }
    const deptShort = getDepartmentShortForm(user.department);
    if (user.batch && deptShort) {
      return `Batch ${user.batch} ${deptShort}`;
    }
    if (user.batch) {
      return `Batch ${user.batch}`;
    }
    if (deptShort) {
      return deptShort;
    }
    return "Verified Student";
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(43,52,185,0.04)] border-b border-surface-lavender">
      <div className="h-20 max-w-[1360px] mx-auto px-5 md:px-10 lg:px-16 flex lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between">
        
        {/* ============================================================ */}
        {/* LEFT SECTION: Brand Mark & Student Portal Badge              */}
        {/* ============================================================ */}
        <div className="flex items-center gap-3.5 justify-self-start">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-surface-lavender flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <span className="text-xl tracking-tight text-on-surface font-extrabold select-none">
              JnU<span className="text-primary">Verse</span>
            </span>
          </Link>

          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold tracking-wide uppercase select-none">
            {getPortalLabel()}
          </span>
        </div>

        {/* ============================================================ */}
        {/* CENTER SECTION: Perfectly Centered Pill Navigation          */}
        {/* ============================================================ */}
        <nav
          className="hidden lg:flex items-center p-2 rounded-full bg-surface-lavender justify-self-center shadow-xs gap-1 sm:gap-1.5"
          aria-label="Main Navigation"
        >
          <Link
            to="/"
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive("/")
                ? "bg-primary text-white font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Overview
          </Link>
          <Link
            to="/clubs"
            className={`px-4 sm:px-4.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive("/clubs")
                ? "bg-primary text-white font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Explore Clubs
          </Link>
          {user?.role === "club_operator" ? (
            <Link
              to="/operator/members"
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive("/operator/members")
                  ? "bg-primary text-white font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Manage Members
            </Link>
          ) : (
            <Link
              to="/my-clubs"
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive("/my-clubs")
                  ? "bg-primary text-white font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              My Clubs
            </Link>
          )}
          <Link
            to="/events"
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive("/events")
                ? "bg-primary text-white font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Events
          </Link>
        </nav>

        {/* ============================================================ */}
        {/* RIGHT SECTION: Notifications, User Profile & Logout Controls  */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 sm:gap-3 justify-self-end">
          {isAuthenticated ? (
            <>
              {/* Notification Bell with Indicator Dot */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-lavender hover:text-on-surface transition-colors relative"
                >
                  <span className="material-symbols-outlined text-[22px]">notifications</span>
                  {/* Subtle Unread Indicator Dot */}
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                </button>

                {/* Notifications Dropdown Popover */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface-white border border-border-subtle shadow-xl p-4 z-50 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                      <span className="text-xs font-bold text-on-surface">Notifications</span>
                      <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-surface-lavender">
                        Campus Feed
                      </span>
                    </div>
                    <div className="py-3 flex flex-col gap-1.5 text-center">
                      <div className="w-8 h-8 rounded-full bg-surface-lavender text-primary flex items-center justify-center mx-auto mb-1">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      </div>
                      <p className="text-xs font-semibold text-on-surface">You're all caught up!</p>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        Official guild notices, membership updates, and event reminders will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* User Details Stack & Profile Icon */}
              <div className="hidden md:flex items-center gap-2.5 pl-1">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-on-surface leading-tight truncate max-w-[170px]">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-[11px] text-text-muted leading-tight truncate max-w-[170px] mt-0.5 font-medium">
                    {getUserSecondaryText()}
                  </span>
                </div>
                <div
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-xs"
                  title={getUserDisplayName()}
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                aria-label="Sign Out"
                title="Sign Out"
                className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:bg-error-container hover:text-on-error-container transition-colors ml-1"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-on-surface hover:bg-surface-lavender text-xs font-semibold transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
              >
                Join JnUVerse
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden w-9 h-9 rounded-full bg-surface-lavender flex items-center justify-center text-on-surface hover:text-primary transition-colors ml-1"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE DRAWER MENU (< lg screens)                            */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface-white border-b border-surface-lavender px-4 py-4 space-y-2 shadow-lg animate-fadeIn">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              isActive("/")
                ? "bg-primary text-white"
                : "text-on-surface hover:bg-surface-lavender"
            }`}
          >
            Overview
          </Link>
          <Link
            to="/clubs"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              isActive("/clubs")
                ? "bg-primary text-white"
                : "text-on-surface hover:bg-surface-lavender"
            }`}
          >
            Explore Clubs
          </Link>
          {user?.role === "club_operator" ? (
            <Link
              to="/operator/members"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive("/operator/members")
                  ? "bg-primary text-white"
                  : "text-on-surface hover:bg-surface-lavender"
              }`}
            >
              Manage Members
            </Link>
          ) : (
            <Link
              to="/my-clubs"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive("/my-clubs")
                  ? "bg-primary text-white"
                  : "text-on-surface hover:bg-surface-lavender"
              }`}
            >
              My Clubs
            </Link>
          )}
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              isActive("/events")
                ? "bg-primary text-white"
                : "text-on-surface hover:bg-surface-lavender"
            }`}
          >
            Events
          </Link>

          {isAuthenticated && (
            <div className="pt-3 border-t border-surface-lavender flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">{getUserDisplayName()}</span>
                <span className="text-[11px] text-text-muted">{getUserSecondaryText()}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="px-3 py-1.5 rounded-full bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
