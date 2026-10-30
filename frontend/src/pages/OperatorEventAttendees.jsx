import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { eventsAPI, extractErrorMessage } from "../services/api";
import LoadingState from "../components/LoadingState";
import ErrorAlert from "../components/ErrorAlert";
import Badge from "../components/Badge";

/**
 * Format timestamps strictly in Asia/Dhaka (+06:00 BST).
 */
function formatDhakaDate(isoString, options = {}) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const defaultOptions = {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(date);
}

function formatDhakaTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDhakaSchedule(startsAt, endsAt) {
  if (!startsAt) return "Schedule to be announced";
  const startDate = formatDhakaDate(startsAt);
  const startTime = formatDhakaTime(startsAt);
  if (!endsAt) return `${startDate} • ${startTime} BST`;

  const endDate = formatDhakaDate(endsAt);
  const endTime = formatDhakaTime(endsAt);

  if (startDate === endDate) {
    return `${startDate} • ${startTime} – ${endTime} BST`;
  }
  return `${startDate}, ${startTime} – ${endDate}, ${endTime} BST`;
}

/**
 * Generates consistent initials from full student name.
 */
function getInitials(name) {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * OperatorEventAttendees Component — Week 4, Stage 6
 * Operator-only attendee roster with pagination, privacy compliance, and event context.
 */
export default function OperatorEventAttendees() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);

  // Fetch Event Context
  const fetchEventDetails = useCallback(async () => {
    try {
      const res = await eventsAPI.getById(id);
      setEvent(res.data);
      return res.data;
    } catch (err) {
      if (err.response?.status === 403) {
        setIsForbidden(true);
        setError("Access Denied: Only the organizing club's operator can view this attendee roster.");
      } else if (err.response?.status === 404) {
        setError("Event not found or you do not have permission to view it.");
      } else {
        setError(extractErrorMessage(err, "Failed to load event details."));
      }
      return null;
    }
  }, [id]);

  // Fetch Registrations Roster with Pagination
  const fetchRegistrations = useCallback(
    async (pageToLoad = 1, isInitial = false) => {
      if (isInitial) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }
      setError("");

      try {
        const res = await eventsAPI.getRegistrations(id, {
          page: pageToLoad,
          page_size: pageSize,
        });

        const data = res.data;
        if (Array.isArray(data)) {
          setAttendees(data);
          setTotalCount(data.length);
        } else {
          setAttendees(data.results || []);
          setTotalCount(data.count || 0);
        }
        setCurrentPage(pageToLoad);
      } catch (err) {
        if (err.response?.status === 403) {
          setIsForbidden(true);
          setError("Access Denied: Only the organizing club's operator can view this attendee roster.");
        } else if (err.response?.status === 404) {
          setError("Event not found or no roster is available.");
        } else {
          setError(extractErrorMessage(err, "Failed to load attendee roster."));
        }
      } finally {
        setLoading(false);
        setPageLoading(false);
      }
    },
    [id, pageSize]
  );

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (isMounted) {
        await fetchEventDetails();
        await fetchRegistrations(1, true);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [fetchEventDetails, fetchRegistrations]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || pageLoading) return;
    fetchRegistrations(newPage, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Derive status badge
  const getEventStatusBadge = () => {
    if (!event) return null;
    if (event.status === "cancelled") {
      return (
        <Badge variant="error" dot>
          Cancelled
        </Badge>
      );
    }
    if (event.status === "draft") {
      return (
        <Badge variant="warning" dot>
          Draft
        </Badge>
      );
    }
    const now = new Date();
    const endsAt = event.ends_at ? new Date(event.ends_at) : null;
    if (event.status === "published" && (Boolean(event.is_completed) || (endsAt && endsAt <= now))) {
      return (
        <Badge variant="neutral" dot>
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="success" dot>
        Published
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-surface-lavender/30 text-on-surface flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/operator/events"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-hover transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-0.5">
              arrow_back
            </span>
            <span>Back to Manage Events</span>
          </Link>

          {event && (
            <Link
              to={`/events/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-white border border-border-subtle hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors shadow-xs"
            >
              <span>Public Event Page</span>
              <span className="material-symbols-outlined text-[14px] text-text-muted">
                open_in_new
              </span>
            </Link>
          )}
        </div>

        {/* Access Denied Feedback */}
        {isForbidden && (
          <div className="max-w-xl mx-auto my-12 bg-surface-white rounded-3xl p-8 border border-border-subtle shadow-md text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-error-container/60 text-error flex items-center justify-center mx-auto shadow-xs">
              <span className="material-symbols-outlined text-[32px]">shield_lock</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface">Unauthorized Access</h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              You do not have operator authorization for this event. Attendee rosters are strictly
              restricted to the executive operators of the hosting club.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate("/operator/events")}
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs"
              >
                Return to My Events
              </button>
            </div>
          </div>
        )}

        {/* General Error State */}
        {!isForbidden && error && !loading && (
          <div className="mb-8">
            <ErrorAlert
              title="Roster Synchronization Error"
              message={error}
              onDismiss={() => setError("")}
            />
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  fetchEventDetails();
                  fetchRegistrations(currentPage, true);
                }}
                className="px-5 py-2 rounded-full bg-surface-white border border-border-subtle hover:bg-surface-lavender text-primary text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Retry Roster Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20">
            <LoadingState message="Retrieving registered attendee roster..." />
          </div>
        )}

        {/* Main Workspace */}
        {!loading && !isForbidden && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-surface-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getEventStatusBadge()}
                    <span className="text-xs font-semibold text-text-muted">
                      Organized by{" "}
                      <strong className="text-on-surface">
                        {event?.club?.name || user?.name || "Your Club"}
                      </strong>
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                    {event?.title || "Event Attendee Roster"}
                  </h1>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        calendar_today
                      </span>
                      <span>{formatDhakaSchedule(event?.starts_at, event?.ends_at)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        location_on
                      </span>
                      <span>{event?.venue || "Venue not set"}</span>
                    </span>
                  </div>
                </div>

                {/* Metric Summary Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="p-4 rounded-2xl bg-surface-lavender/50 border border-border-subtle/60 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Confirmed RSVPs
                    </span>
                    <span className="text-2xl font-black text-primary block mt-0.5">
                      {totalCount}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-lavender/50 border border-border-subtle/60 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Venue Capacity
                    </span>
                    <span className="text-lg font-bold text-on-surface block mt-1">
                      {event?.capacity ? `${event.capacity} seats` : "Unlimited"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-lavender/50 border border-border-subtle/60 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Remaining Seats
                    </span>
                    <span className="text-lg font-bold text-on-surface block mt-1">
                      {event?.capacity !== null && event?.capacity !== undefined
                        ? Math.max(0, event.capacity - totalCount)
                        : "Open"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Privacy Banner */}
              <div className="mt-6 pt-5 border-t border-border-subtle/60 flex items-start sm:items-center gap-3 p-3.5 rounded-2xl bg-surface-container-low/70 border border-border-subtle text-xs text-text-muted">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5 sm:mt-0">
                  privacy_tip
                </span>
                <span className="leading-relaxed">
                  <strong>Student Privacy Notice:</strong> Student email addresses and contact details are not displayed in this roster.
                </span>
              </div>
            </div>

            {/* Attendee Roster Section */}
            <div className="bg-surface-white rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-surface-lavender text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-on-surface">Registered Attendees</h2>
                    <p className="text-[11px] text-text-muted">
                      Showing registered student records for this event.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-text-muted font-medium">
                  Total Registered: <strong className="text-on-surface">{totalCount} students</strong>
                </div>
              </div>

              {/* Page Loading Overlay */}
              <div className="relative">
                {pageLoading && (
                  <div className="absolute inset-0 bg-surface-white/70 backdrop-blur-xs z-20 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-white shadow-md border border-border-subtle text-xs font-semibold text-primary">
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span>Loading page {currentPage}...</span>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {attendees.length === 0 ? (
                  <div className="py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-[32px]">group_off</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface mb-1">
                      No Registered Attendees Yet
                    </h3>
                    <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                      {event?.status === "draft"
                        ? "This event is currently in Draft mode. Publish the event to open RSVP registrations for students."
                        : event?.status === "cancelled"
                        ? "This event was cancelled. No new student RSVPs are accepted."
                        : "No students have RSVP'd for this event yet. Once students register, their registration records will appear here."}
                    </p>

                    {event && (
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <Link
                          to={`/events/${event.id}`}
                          className="px-5 py-2.5 rounded-full bg-surface-lavender hover:bg-surface-lavender/80 text-primary text-xs font-bold transition-colors"
                        >
                          View Public Page
                        </Link>
                        {event.status === "draft" && (
                          <Link
                            to="/operator/events"
                            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors"
                          >
                            Go to Manage Events
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-lavender/40 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                            <th className="py-3 px-6 w-12 text-center">#</th>
                            <th className="py-3 px-6">Student Name</th>
                            <th className="py-3 px-6">Student ID</th>
                            <th className="py-3 px-6">Department</th>
                            <th className="py-3 px-6 text-center">Batch</th>
                            <th className="py-3 px-6">Registered On</th>
                            <th className="py-3 px-6 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/70 text-xs">
                          {attendees.map((attendee, index) => {
                            const rowNumber = (currentPage - 1) * pageSize + index + 1;
                            const initials = getInitials(attendee.name);

                            return (
                              <tr
                                key={attendee.id || index}
                                className="hover:bg-surface-lavender/20 transition-colors group"
                              >
                                <td className="py-3.5 px-6 text-center text-text-muted font-mono text-[11px]">
                                  {rowNumber}
                                </td>

                                <td className="py-3.5 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                      {initials}
                                    </div>
                                    <span className="font-bold text-on-surface group-hover:text-primary transition-colors">
                                      {attendee.name || "JnU Student"}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-6">
                                  <span className="inline-block px-2.5 py-1 rounded-md bg-surface-lavender text-on-surface font-mono text-[11px] font-semibold border border-border-subtle/60">
                                    {attendee.student_id || "—"}
                                  </span>
                                </td>

                                <td className="py-3.5 px-6 text-on-surface font-medium">
                                  {attendee.department || "—"}
                                </td>

                                <td className="py-3.5 px-6 text-center">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-surface-container-low text-text-muted text-[11px] font-bold">
                                    {attendee.batch ? `Batch ${attendee.batch}` : "—"}
                                  </span>
                                </td>

                                <td className="py-3.5 px-6 text-text-muted">
                                  <div className="flex flex-col">
                                    <span className="text-on-surface font-medium">
                                      {formatDhakaDate(attendee.registered_at)}
                                    </span>
                                    <span className="text-[11px] text-text-muted">
                                      {formatDhakaTime(attendee.registered_at)} BST
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-6 text-right">
                                  <Badge variant="success" size="sm" dot>
                                    Registered
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List (< md) */}
                    <div className="md:hidden divide-y divide-border-subtle/80">
                      {attendees.map((attendee, index) => {
                        const rowNumber = (currentPage - 1) * pageSize + index + 1;
                        const initials = getInitials(attendee.name);

                        return (
                          <div key={attendee.id || index} className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-[11px] font-mono text-text-muted w-5">
                                  #{rowNumber}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-on-surface">
                                    {attendee.name || "JnU Student"}
                                  </p>
                                  <p className="text-[11px] font-mono text-text-muted">
                                    {attendee.student_id}
                                  </p>
                                </div>
                              </div>

                              <Badge variant="success" size="sm" dot>
                                Registered
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface-lavender/30 p-2.5 rounded-xl border border-border-subtle/50">
                              <div>
                                <span className="text-text-muted block text-[10px] uppercase font-bold">
                                  Department
                                </span>
                                <span className="font-semibold text-on-surface">
                                  {attendee.department || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-text-muted block text-[10px] uppercase font-bold">
                                  Batch
                                </span>
                                <span className="font-semibold text-on-surface">
                                  {attendee.batch ? `Batch ${attendee.batch}` : "—"}
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">
                                schedule
                              </span>
                              <span>
                                Registered: {formatDhakaDate(attendee.registered_at)} at{" "}
                                {formatDhakaTime(attendee.registered_at)} BST
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-surface-lavender/20 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-text-muted">
                    Showing{" "}
                    <strong className="text-on-surface">
                      {(currentPage - 1) * pageSize + 1}
                    </strong>{" "}
                    to{" "}
                    <strong className="text-on-surface">
                      {Math.min(currentPage * pageSize, totalCount)}
                    </strong>{" "}
                    of <strong className="text-on-surface">{totalCount}</strong> attendees
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1 || pageLoading}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        // Display at most 5 page buttons around current page
                        if (
                          totalPages > 6 &&
                          Math.abs(pageNum - currentPage) > 2 &&
                          pageNum !== 1 &&
                          pageNum !== totalPages
                        ) {
                          if (
                            (pageNum === 2 && currentPage > 4) ||
                            (pageNum === totalPages - 1 && currentPage < totalPages - 3)
                          ) {
                            return (
                              <span
                                key={`ellipsis-${pageNum}`}
                                className="px-2 text-xs text-text-muted"
                              >
                                …
                              </span>
                            );
                          }
                          return null;
                        }

                        const isCurrent = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            disabled={pageLoading}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                              isCurrent
                                ? "bg-primary text-white shadow-xs"
                                : "bg-surface-white hover:bg-surface-lavender text-on-surface border border-border-subtle"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages || pageLoading}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <span>Next</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-border-subtle mt-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
            <p>© 2026 Jagannath University (JnUVerse). All rights reserved.</p>
            <p>Student Activity &amp; Attendee Management</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
