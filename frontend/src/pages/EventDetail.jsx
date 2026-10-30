import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { eventsAPI, extractErrorMessage } from "../services/api";
import LoadingState from "../components/LoadingState";
import ErrorAlert from "../components/ErrorAlert";

/**
 * Date and Time Formatting Helpers using strict Asia/Dhaka Timezone.
 * Guarantees correct local university time representation on all devices without manual offsets.
 */
function formatDhakaDate(isoString, options = {}) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const defaultOptions = {
    timeZone: "Asia/Dhaka",
    weekday: "long",
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
  if (!startsAt) return "";
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
 * Computes event lifecycle status badge accurately from server status and schedule.
 */
function getEventStatus(event) {
  if (!event) return null;

  if (event.status === "cancelled") {
    return {
      label: "Cancelled",
      color: "text-error bg-error-container/40 border border-error/20",
      icon: "cancel",
      pulse: false,
    };
  }

  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);

  if (event.is_completed || endsAt <= now) {
    return {
      label: "Ended",
      color: "text-text-muted bg-surface-lavender border border-border-subtle",
      icon: "event_busy",
      pulse: false,
    };
  }

  if (startsAt <= now && now < endsAt) {
    return {
      label: "Ongoing",
      color: "text-emerald-800 bg-emerald-50 border border-emerald-200",
      icon: "sensors",
      pulse: true,
    };
  }

  if (event.remaining_capacity === 0) {
    return {
      label: "Full",
      color: "text-amber-800 bg-amber-50 border border-amber-200",
      icon: "group_off",
      pulse: false,
    };
  }

  if (event.status === "draft") {
    return {
      label: "Draft",
      color: "text-amber-900 bg-amber-100/70 border border-amber-300",
      icon: "edit_note",
      pulse: false,
    };
  }

  return {
    label: "Upcoming",
    color: "text-primary bg-surface-lavender/90 border border-primary/20",
    icon: "event",
    pulse: false,
  };
}

/**
 * Helper to determine contextual club icon for visual branding.
 */
function getClubIcon(club) {
  if (!club) return "groups";
  const text = `${club.name || ""}`.toLowerCase();
  if (text.includes("it") || text.includes("computer") || text.includes("tech") || text.includes("code")) {
    return "terminal";
  }
  if (text.includes("debate") || text.includes("speech") || text.includes("forum")) {
    return "forum";
  }
  if (text.includes("photo") || text.includes("camera")) {
    return "photo_camera";
  }
  if (text.includes("drama") || text.includes("culture") || text.includes("music")) {
    return "theater_comedy";
  }
  if (text.includes("sport") || text.includes("athletic")) {
    return "sports_soccer";
  }
  if (text.includes("research") || text.includes("science")) {
    return "science";
  }
  return "groups";
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Fetch event details
  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await eventsAPI.getById(id);
      setEvent(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("The requested campus event could not be found or is not visible.");
      } else {
        setError(extractErrorMessage(err, "Failed to load event details. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Handle Student RSVP Registration
  const handleRegister = async () => {
    setActionError("");
    setActionSuccess("");

    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (user?.role !== "student") {
      setActionError("Only verified university students can register for campus events.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await eventsAPI.register(id);
      // Backend returns updated Event object (201 Created or 200 OK)
      setEvent(res.data);
      setActionSuccess("You are successfully registered for this event! Your seat is reserved.");
      setShowRegisterModal(false);
    } catch (err) {
      if (err.response?.status === 409) {
        // Backend returns exact conflict detail, e.g. "This event is full." or "Registration is closed..."
        setActionError(err.response.data?.detail || "Registration conflict occurred.");
      } else if (err.response?.status === 401) {
        navigate("/login", { state: { from: location.pathname } });
      } else if (err.response?.status === 403) {
        setActionError("You do not have permission to register for this event.");
      } else {
        setActionError(extractErrorMessage(err, "Failed to submit event registration."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Student RSVP Cancellation
  const handleCancelRegistration = async () => {
    setActionError("");
    setActionSuccess("");

    setActionLoading(true);
    try {
      // Backend returns 204 No Content
      await eventsAPI.unregister(id);
      // Refresh event details to update registration count and capacity
      const freshRes = await eventsAPI.getById(id);
      setEvent(freshRes.data);
      setActionSuccess("Your event registration has been cancelled. Your reserved seat has been released.");
      setShowCancelModal(false);
    } catch (err) {
      if (err.response?.status === 409) {
        // Backend conflict: "Registration cannot be cancelled after the event has started."
        setActionError(
          err.response.data?.detail ||
            "Registration cannot be cancelled after the event has started."
        );
      } else {
        setActionError(extractErrorMessage(err, "Failed to cancel event registration."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-20">
          <LoadingState message="Loading event details..." />
        </main>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
        <Navbar />
        <main className="flex-1 w-full pt-20">
          <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-error-container/40 flex items-center justify-center text-error mx-auto shadow-xs">
              <span className="material-symbols-outlined text-[32px]">event_busy</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-on-surface">Event Unavailable</h1>
              <p className="text-sm text-text-muted leading-relaxed">
                {error || "This campus event could not be found or has been removed."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Events</span>
              </Link>
              <button
                type="button"
                onClick={fetchEvent}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Retry</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const status = getEventStatus(event);
  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);

  const isCancelled = event.status === "cancelled";
  const isEnded = event.is_completed || endsAt <= now;
  const isStarted = startsAt <= now;
  const isFull = event.remaining_capacity === 0;
  const isRegistered = event.is_registered === true;
  const canCancel = isRegistered && !isStarted;

  // Capacity calculations
  const hasCapacityLimit = event.capacity !== null && event.capacity !== undefined;
  const registeredCount = event.registered_count || 0;
  const capacityTotal = event.capacity || 0;
  const remainingSeats = event.remaining_capacity ?? null;
  const capacityPercent = hasCapacityLimit && capacityTotal > 0
    ? Math.min(Math.round((registeredCount / capacityTotal) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
      <Navbar />

      <main className="flex-1 w-full pt-20">
        {/* Subtle Atmospheric Top Ambient Glow */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[920px] h-96 bg-gradient-to-b from-surface-lavender/70 via-secondary-fixed/30 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
            {/* Top Navigation & Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center justify-between flex-wrap gap-4">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors group"
              >
                <span className="w-8 h-8 rounded-full bg-surface-white border border-border-subtle flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-white transition-colors shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </span>
                <span>Back to Events Discovery</span>
              </Link>

              <div className="inline-flex items-center gap-2 text-xs text-text-muted">
                <Link to="/events" className="hover:text-primary transition-colors">
                  Events
                </Link>
                <span>/</span>
                <span className="text-on-surface font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {event.title}
                </span>
              </div>
            </nav>

            {/* Top Feedback Banner */}
            {actionSuccess && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-3 text-emerald-900 text-xs sm:text-sm animate-in fade-in duration-200 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                    check_circle
                  </span>
                  <span className="font-semibold">{actionSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionSuccess("")}
                  className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded transition"
                  aria-label="Dismiss message"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            {actionError && (
              <ErrorAlert
                title="Registration Refusal / Notice"
                message={actionError}
                onDismiss={() => setActionError("")}
              />
            )}

            {/* Asymmetrical 12-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* ============================================================ */}
              {/* LEFT COLUMN: Event Content & Society Spotlight (7 cols on lg) */}
              {/* ============================================================ */}
              <div className="lg:col-span-7 space-y-8">
                {/* Header Information Plate */}
                <section className="space-y-4">
                  {/* Organizing Society Ribbon & Status Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Link
                      to={`/clubs/${event.club?.slug}`}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-primary transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-xl bg-surface-lavender flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-xs">
                        <span className="material-symbols-outlined text-[16px]">
                          {getClubIcon(event.club)}
                        </span>
                      </div>
                      <span className="font-bold text-on-surface group-hover:text-primary transition-colors">
                        {event.club?.name}
                      </span>
                      <span
                        className="material-symbols-outlined text-[16px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                    </Link>

                    {status && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${status.color}`}
                      >
                        {status.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                        )}
                        <span className="material-symbols-outlined text-[14px]">
                          {status.icon}
                        </span>
                        <span>{status.label}</span>
                      </span>
                    )}
                  </div>

                  {/* Event Headline */}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
                    {event.title}
                  </h1>

                  {/* Summary Bar */}
                  <div className="flex items-center flex-wrap gap-4 pt-1 text-xs text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        schedule
                      </span>
                      <span className="font-semibold text-on-surface">
                        {formatDhakaDate(event.starts_at)}
                      </span>
                    </div>

                    <span>•</span>

                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        location_on
                      </span>
                      <span className="font-semibold text-on-surface">{event.venue}</span>
                    </div>

                    <span>•</span>

                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        confirmation_number
                      </span>
                      <span className="font-semibold text-on-surface">
                        {hasCapacityLimit
                          ? `${remainingSeats ?? 0} seats left (${registeredCount} registered)`
                          : "Unlimited Capacity"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Branded Visual Backdrop Plate */}
                <section aria-label="Campus Event Graphic Banner">
                  <div className="relative w-full min-h-[220px] sm:min-h-[260px] rounded-3xl overflow-hidden shadow-inner bg-gradient-to-br from-primary via-primary-container to-secondary p-6 sm:p-8 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-xs">
                        <span className="material-symbols-outlined text-[26px]">
                          {getClubIcon(event.club)}
                        </span>
                      </div>
                      <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                        Campus Activity
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-white/80 text-[11px] uppercase tracking-wider font-semibold block">
                        Organized by
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                        {event.club?.name}
                      </h2>
                      <p className="text-xs text-white/90 flex items-center gap-1 pt-0.5">
                        <span className="material-symbols-outlined text-[15px]">
                          location_on
                        </span>
                        <span>{event.venue}</span>
                      </p>
                    </div>
                  </div>
                </section>

                {/* About This Event Description */}
                <section className="bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xs border border-border-subtle space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                    <span>About this Event</span>
                  </div>

                  <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {event.description ? (
                      event.description
                    ) : (
                      <p className="text-text-muted italic">
                        No additional event description was provided by the organizing club.
                      </p>
                    )}
                  </div>

                  {/* Campus Participation Guidance */}
                  <div className="pt-4 border-t border-border-subtle/60 flex items-start gap-3 text-xs text-text-muted">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                      info
                    </span>
                    <p className="leading-normal">
                      Students are encouraged to arrive 15 minutes prior to start time. Admission
                      requires registration verification and a valid Jagannath University student ID.
                    </p>
                  </div>
                </section>

                {/* Host Club Spotlight Card */}
                <section className="bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xs border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-surface-lavender flex items-center justify-center text-primary shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[28px]">
                        {getClubIcon(event.club)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted block">
                        Organizing Student Guild
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-on-surface">
                        {event.club?.name}
                      </h3>
                      <p className="text-xs text-text-muted">
                        Official Jagannath University chartered club
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/clubs/${event.club?.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-primary text-xs font-bold transition-all shadow-xs"
                  >
                    <span>View Club Profile</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                  </Link>
                </section>
              </div>

              {/* ============================================================ */}
              {/* RIGHT COLUMN: Event Logistics & Student RSVP (5 cols on lg)   */}
              {/* ============================================================ */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
                {/* Main Logistics & RSVP Card */}
                <div className="bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xs border border-border-subtle space-y-6">
                  <div className="space-y-1 pb-4 border-b border-border-subtle/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Student RSVP &amp; Logistics
                    </span>
                    <h3 className="text-xl font-extrabold text-on-surface tracking-tight">
                      Event Schedule &amp; Access
                    </h3>
                  </div>

                  {/* Logistics List */}
                  <div className="space-y-4 text-xs">
                    {/* Date */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container-low">
                      <div className="w-8 h-8 rounded-xl bg-surface-white flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">
                          calendar_today
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Date
                        </span>
                        <span className="font-bold text-on-surface text-xs leading-snug">
                          {formatDhakaDate(event.starts_at)}
                        </span>
                      </div>
                    </div>

                    {/* Schedule / Time */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container-low">
                      <div className="w-8 h-8 rounded-xl bg-surface-white flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">
                          schedule
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Schedule (Dhaka BST)
                        </span>
                        <span className="font-bold text-on-surface text-xs leading-snug">
                          {formatDhakaTime(event.starts_at)} – {formatDhakaTime(event.ends_at)}
                        </span>
                      </div>
                    </div>

                    {/* Venue */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container-low">
                      <div className="w-8 h-8 rounded-xl bg-surface-white flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">
                          location_on
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Venue Location
                        </span>
                        <span className="font-bold text-on-surface text-xs leading-snug">
                          {event.venue}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Information */}
                    <div className="p-3.5 rounded-2xl bg-surface-container-low space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Registration Capacity
                        </span>
                        <span className="font-bold text-on-surface">
                          {hasCapacityLimit
                            ? `${remainingSeats ?? 0} seats left`
                            : "Unlimited Capacity"}
                        </span>
                      </div>

                      {hasCapacityLimit && (
                        <>
                          <div className="w-full h-2 rounded-full bg-surface-lavender overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull ? "bg-amber-600" : "bg-primary"
                              }`}
                              style={{ width: `${capacityPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
                            <span>{registeredCount} registered</span>
                            <span>{capacityTotal} total capacity</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ============================================================ */}
                  {/* RSVP ACTION BUTTON & STATE HANDLERS                          */}
                  {/* ============================================================ */}
                  <div className="pt-2 space-y-4">
                    {/* State 1: Anonymous Visitor */}
                    {!isAuthenticated && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-surface-lavender/70 border border-border-subtle flex items-start gap-3 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                            lock
                          </span>
                          <p className="leading-relaxed">
                            Sign in with your Jagannath University student account to reserve your
                            seat for this campus event.
                          </p>
                        </div>

                        <Link
                          to="/login"
                          state={{ from: location.pathname }}
                          className="w-full py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">login</span>
                          <span>Log in to register</span>
                        </Link>

                        <p className="text-center text-[11px] text-text-muted">
                          Need an account?{" "}
                          <Link to="/register" className="text-primary font-bold hover:underline">
                            Register as a Student
                          </Link>
                        </p>
                      </div>
                    )}

                    {/* State 2: Club Operator Account */}
                    {isAuthenticated && user?.role === "club_operator" && (
                      <div className="p-4 rounded-2xl bg-surface-lavender border border-border-subtle space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-primary">
                          <span className="material-symbols-outlined text-[18px]">badge</span>
                          <span>Club Operator Mode</span>
                        </div>
                        <p className="text-text-muted leading-relaxed">
                          You are logged in as a Club Operator. Student event registrations are
                          reserved for student accounts. Operator event editing will be available
                          in Stage 5.
                        </p>
                      </div>
                    )}

                    {/* State 3: Authenticated Student */}
                    {isAuthenticated && user?.role === "student" && (
                      <div className="space-y-4">
                        {/* Substate A: Student is Already Registered */}
                        {isRegistered && (
                          <div className="space-y-3">
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-950 text-xs">
                              <span className="material-symbols-outlined text-emerald-600 text-[22px] shrink-0">
                                check_circle
                              </span>
                              <div className="space-y-0.5">
                                <span className="font-bold block text-sm">
                                  Registration Confirmed
                                </span>
                                <p className="text-emerald-800 leading-relaxed">
                                  Your seat is reserved for this event. Present your student ID
                                  card at the venue entrance.
                                </p>
                              </div>
                            </div>

                            {/* Cancel RSVP Control */}
                            {canCancel ? (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setShowCancelModal(true)}
                                className="w-full py-2.5 rounded-full border border-error/30 hover:bg-error-container/30 text-error text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  cancel
                                </span>
                                <span>Cancel Registration</span>
                              </button>
                            ) : (
                              <p className="text-[11px] text-text-muted text-center pt-1">
                                Registration cannot be cancelled after the event has started.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Substate B: Not registered, Event is Cancelled */}
                        {!isRegistered && isCancelled && (
                          <div className="space-y-2">
                            <div className="p-3.5 rounded-2xl bg-error-container/30 border border-error/20 flex items-center gap-2.5 text-xs text-error font-medium">
                              <span className="material-symbols-outlined text-[18px]">block</span>
                              <span>This event has been cancelled by the host club.</span>
                            </div>
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 rounded-full bg-surface-lavender text-text-muted text-xs font-bold cursor-not-allowed"
                            >
                              Event Cancelled
                            </button>
                          </div>
                        )}

                        {/* Substate C: Not registered, Event has Ended */}
                        {!isRegistered && !isCancelled && isEnded && (
                          <div className="space-y-2">
                            <div className="p-3.5 rounded-2xl bg-surface-lavender border border-border-subtle flex items-center gap-2.5 text-xs text-text-muted font-medium">
                              <span className="material-symbols-outlined text-[18px]">
                                event_busy
                              </span>
                              <span>This campus event has already concluded.</span>
                            </div>
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 rounded-full bg-surface-lavender text-text-muted text-xs font-bold cursor-not-allowed"
                            >
                              Event Ended
                            </button>
                          </div>
                        )}

                        {/* Substate D: Not registered, Event has Started */}
                        {!isRegistered && !isCancelled && !isEnded && isStarted && (
                          <div className="space-y-2">
                            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                              <span className="material-symbols-outlined text-[18px]">
                                running_with_errors
                              </span>
                              <span>Registration closed because the event has started.</span>
                            </div>
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 rounded-full bg-surface-lavender text-text-muted text-xs font-bold cursor-not-allowed"
                            >
                              Registration Closed
                            </button>
                          </div>
                        )}

                        {/* Substate E: Not registered, Event is Full */}
                        {!isRegistered && !isCancelled && !isEnded && !isStarted && isFull && (
                          <div className="space-y-2">
                            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                              <span className="material-symbols-outlined text-[18px]">
                                group_off
                              </span>
                              <span>All available seats are currently filled.</span>
                            </div>
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 rounded-full bg-surface-lavender text-text-muted text-xs font-bold cursor-not-allowed"
                            >
                              Event Full
                            </button>
                          </div>
                        )}

                        {/* Substate F: Open for Student RSVP */}
                        {!isRegistered && !isCancelled && !isEnded && !isStarted && !isFull && (
                          <div className="space-y-3">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => setShowRegisterModal(true)}
                              className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 hover:shadow-md"
                            >
                              {actionLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[18px]">
                                    confirmation_number
                                  </span>
                                  <span>Register for Event</span>
                                </>
                              )}
                            </button>

                            <p className="text-[11px] text-text-muted text-center font-medium">
                              Free student registration • Admission with verified ID
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* CONFIRMATION MODALS                                          */}
      {/* ============================================================ */}

      {/* 1. Register Confirmation Modal */}
      {showRegisterModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs"
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            className="w-full max-w-md bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xl border border-border-subtle space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-on-surface">Confirm Event Registration</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                You are reserving a seat for <strong className="text-on-surface">{event.title}</strong>,
                organized by <strong className="text-on-surface">{event.club?.name}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low space-y-1 text-xs">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">
                Schedule &amp; Location
              </span>
              <p className="font-semibold text-on-surface">{formatDhakaSchedule(event.starts_at, event.ends_at)}</p>
              <p className="text-text-muted">{event.venue}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowRegisterModal(false)}
                className="px-5 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRegister}
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                {actionLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>Confirm RSVP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cancel RSVP Confirmation Modal */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-md bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xl border border-border-subtle space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-error-container/40 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">cancel</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-on-surface">Cancel Your Registration?</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Are you sure you want to cancel your registration for{" "}
                <strong className="text-on-surface">{event.title}</strong>? Your seat will be
                immediately released for other students.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowCancelModal(false)}
                className="px-5 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors"
              >
                Keep Registration
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelRegistration}
                className="px-6 py-2.5 rounded-full bg-error hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                {actionLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>Yes, Cancel RSVP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-border-subtle mt-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
            <p>© 2026 Jagannath University (JnUVerse). All rights reserved.</p>
            <p>Campus Calendar &amp; Student Events</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
