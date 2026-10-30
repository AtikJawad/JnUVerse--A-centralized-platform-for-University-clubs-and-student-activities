import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
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
 * Derives accurate status for operator management view.
 */
function getEventLifecycle(event) {
  if (!event) return { key: "unknown", label: "Unknown", badge: "neutral" };

  if (event.status === "cancelled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      badge: "error",
      icon: "cancel",
      description: "Permanently cancelled",
    };
  }

  if (event.status === "draft") {
    return {
      key: "draft",
      label: "Draft",
      badge: "warning",
      icon: "edit_document",
      description: "Private draft",
    };
  }

  const now = new Date();
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;

  if (event.status === "published" && (Boolean(event.is_completed) || (endsAt && endsAt <= now))) {
    return {
      key: "completed",
      label: "Completed",
      badge: "neutral",
      icon: "event_available",
      description: "Event has concluded",
    };
  }

  if (event.status === "published") {
    return {
      key: "published",
      label: "Published",
      badge: "success",
      icon: "sensors",
      description: "Live on campus",
    };
  }

  return { key: "unknown", label: event.status, badge: "neutral" };
}

/**
 * OperatorEvents Component — Week 4, Stage 6
 * Centralized event management workspace for Club Operators.
 */
export default function OperatorEvents() {
  const { user } = useAuth();

  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters & Search
  const [activeTab, setActiveTab] = useState("all"); // "all" | "draft" | "published" | "cancelled" | "completed"
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Action Modals State
  const [eventToPublish, setEventToPublish] = useState(null);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Fetch operator's events from backend
  const fetchOperatorEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let accumulated = [];
      let pageNum = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await eventsAPI.getAll({
          mine: "true",
          page: pageNum,
          page_size: 50,
        });

        const data = res.data;
        const results = Array.isArray(data) ? data : data.results || [];
        accumulated = accumulated.concat(results);

        const totalCount = data.count ?? accumulated.length;
        if (!data.next || accumulated.length >= totalCount || results.length === 0) {
          hasMore = false;
        } else {
          pageNum += 1;
        }
      }

      // Deduplicate by ID
      const seen = new Set();
      const uniqueEvents = accumulated.filter((e) => {
        if (!e || !e.id || seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      setAllEvents(uniqueEvents);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Only authorized club operators can access the event management workspace.");
      } else {
        setError(extractErrorMessage(err, "Failed to load club events."));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperatorEvents();
  }, [fetchOperatorEvents]);

  // Handle Publish Event
  const handlePublishConfirm = async () => {
    if (!eventToPublish) return;
    setActionLoading(true);
    setModalError("");

    try {
      await eventsAPI.publish(eventToPublish.id);
      setActionSuccess(`"${eventToPublish.title}" has been published and is now live for student registrations.`);
      setEventToPublish(null);
      await fetchOperatorEvents();
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.starts_at) {
        setModalError(
          Array.isArray(err.response.data.starts_at)
            ? err.response.data.starts_at.join(" ")
            : String(err.response.data.starts_at)
        );
      } else if (err.response?.status === 409) {
        setModalError(err.response.data?.detail || "Only draft events can be published.");
      } else {
        setModalError(extractErrorMessage(err, "Failed to publish event."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Event
  const handleCancelConfirm = async () => {
    if (!eventToCancel) return;
    setActionLoading(true);
    setModalError("");

    try {
      await eventsAPI.cancel(eventToCancel.id);
      setActionSuccess(`"${eventToCancel.title}" has been cancelled. Existing registrations remain recorded on the roster.`);
      setEventToCancel(null);
      await fetchOperatorEvents();
    } catch (err) {
      if (err.response?.status === 409) {
        setModalError(err.response.data?.detail || "Only published events that have not ended can be cancelled.");
      } else {
        setModalError(extractErrorMessage(err, "Failed to cancel event."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    const total = allEvents.length;
    let published = 0;
    let draft = 0;
    let cancelled = 0;
    let completed = 0;
    let totalAttendees = 0;

    const now = new Date();

    allEvents.forEach((e) => {
      totalAttendees += e.registered_count || 0;
      const endsAt = e.ends_at ? new Date(e.ends_at) : null;
      const isCompleted =
        e.status === "published" &&
        (Boolean(e.is_completed) || (endsAt && endsAt <= now));

      if (e.status === "cancelled") {
        cancelled += 1;
      } else if (e.status === "draft") {
        draft += 1;
      } else if (isCompleted) {
        completed += 1;
      } else if (e.status === "published") {
        published += 1;
      }
    });

    return {
      total,
      published,
      draft,
      cancelled,
      completed,
      totalAttendees,
    };
  }, [allEvents]);

  // Tab Filtering
  const filteredEvents = useMemo(() => {
    const now = new Date();

    return allEvents.filter((event) => {
      const endsAt = event.ends_at ? new Date(event.ends_at) : null;
      const isCompleted =
        event.status === "published" &&
        (Boolean(event.is_completed) || (endsAt && endsAt <= now));

      // 1. Status Tab filter
      if (activeTab === "draft") {
        if (event.status !== "draft") return false;
      } else if (activeTab === "published") {
        if (event.status !== "published" || isCompleted) {
          return false;
        }
      } else if (activeTab === "cancelled") {
        if (event.status !== "cancelled") return false;
      } else if (activeTab === "completed") {
        if (!isCompleted) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = event.title?.toLowerCase().includes(q);
        const matchVenue = event.venue?.toLowerCase().includes(q);
        const matchDesc = event.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchDesc) return false;
      }

      return true;
    });
  }, [allEvents, activeTab, searchQuery]);

  // Local Pagination on filtered events
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  const clubName = user?.name || "Your Club";

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
      <Navbar />

      <main className="flex-1 w-full pt-20 pb-16">
        {/* Subtle ambient gradient aura */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[920px] h-96 bg-gradient-to-b from-surface-lavender/60 via-secondary-fixed/20 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header & Breadcrumb Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">event_seat</span>
                  Club Operator Workspace
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
                  Manage Events
                </h1>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
                  Monitor event registration capacity, publish new drafts, cancel sessions, and
                  inspect student attendee rosters for {clubName}.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={fetchOperatorEvents}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Reload event data from server"
                >
                  <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                  <span>Refresh</span>
                </button>

                <Link
                  to="/operator/events/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-resting hover:shadow-primary-glow transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Create New Event</span>
                </Link>
              </div>
            </div>

            {/* Success Notification */}
            {actionSuccess && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-950 text-xs sm:text-sm"
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

            {/* Error Notification */}
            {error && (
              <div className="space-y-3">
                <ErrorAlert
                  title="Management Notice"
                  message={error}
                  onDismiss={() => setError("")}
                />
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={fetchOperatorEvents}
                    disabled={loading}
                    className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-primary transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Retry Request</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4-Card Summary Metrics Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs space-y-1">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Events</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-on-surface">{metrics.total}</p>
                <p className="text-[11px] text-text-muted">All active, draft &amp; past events</p>
              </div>

              <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs space-y-1">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Live Published</span>
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">sensors</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{metrics.published}</p>
                <p className="text-[11px] text-text-muted">Open for campus attendance</p>
              </div>

              <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs space-y-1">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Drafts</span>
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">edit_document</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{metrics.draft}</p>
                <p className="text-[11px] text-text-muted">Pending campus publication</p>
              </div>

              <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs space-y-1">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Attendees</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-primary">{metrics.totalAttendees}</p>
                <p className="text-[11px] text-text-muted">Student RSVPs across all events</p>
              </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Status Tab Pills */}
              <div
                role="tablist"
                className="flex items-center gap-1.5 p-1 bg-surface-lavender/60 rounded-full border border-border-subtle overflow-x-auto max-w-full"
              >
                {[
                  { key: "all", label: "All Events", count: metrics.total },
                  { key: "published", label: "Published", count: metrics.published },
                  { key: "draft", label: "Drafts", count: metrics.draft },
                  { key: "completed", label: "Completed", count: metrics.completed },
                  { key: "cancelled", label: "Cancelled", count: metrics.cancelled },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === tab.key
                        ? "bg-primary text-white shadow-xs"
                        : "text-text-muted hover:text-on-surface hover:bg-surface-white/60"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeTab === tab.key
                          ? "bg-white/20 text-white"
                          : "bg-surface-lavender text-text-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Title / Venue Search */}
              <div className="relative min-w-[260px] sm:w-72">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter by title or venue..."
                  className="w-full h-10 pl-10 pr-8 rounded-full bg-surface-white text-xs text-on-surface border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-on-surface p-0.5"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Events Management List / Table */}
            {loading ? (
              <div className="py-20 flex justify-center">
                <LoadingState message="Loading your club events..." />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="bg-surface-white rounded-3xl p-12 text-center border border-border-subtle shadow-xs space-y-4">
                <div className="w-14 h-14 rounded-full bg-surface-lavender text-primary flex items-center justify-center mx-auto shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">event_busy</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-on-surface">No Events Found</h3>
                  <p className="text-xs text-text-muted max-w-md mx-auto">
                    {searchQuery
                      ? `No events match "${searchQuery}" in this view. Try adjusting your search or tab filter.`
                      : activeTab !== "all"
                      ? `You currently have no ${activeTab} events.`
                      : "Your club has not created any campus events yet."}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  {searchQuery || activeTab !== "all" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveTab("all");
                        setCurrentPage(1);
                      }}
                      className="px-5 py-2 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-on-surface transition-colors"
                    >
                      Reset Filters
                    </button>
                  ) : null}
                  <Link
                    to="/operator/events/new"
                    className="px-6 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    Create Your First Event
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface-white rounded-3xl border border-border-subtle shadow-xs overflow-hidden">
                  <div className="divide-y divide-border-subtle/80">
                    {paginatedEvents.map((event) => {
                      const lifecycle = getEventLifecycle(event);
                      const isDraft = event.status === "draft";
                      const isPublished = event.status === "published";
                      const isCancelled = event.status === "cancelled";
                      const isCompleted =
                        event.status === "published" &&
                        (Boolean(event.is_completed) ||
                          (event.ends_at && new Date(event.ends_at) <= new Date()));
                      const isEditable = !isCancelled && !isCompleted;
                      const canPublish = isDraft;
                      const canCancel = isPublished && !isCompleted;

                      const startInPast =
                        event.starts_at && new Date(event.starts_at) <= new Date();

                      return (
                        <div
                          key={event.id}
                          className="p-5 sm:p-6 hover:bg-surface-lavender/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                        >
                          {/* Event Metadata */}
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <Badge variant={lifecycle.badge} size="sm">
                                <span className="material-symbols-outlined text-[13px]">
                                  {lifecycle.icon}
                                </span>
                                <span>{lifecycle.label}</span>
                              </Badge>

                              <span className="text-[11px] text-text-muted font-medium">
                                •
                              </span>

                              <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-primary">
                                  schedule
                                </span>
                                <span>{formatDhakaSchedule(event.starts_at, event.ends_at)}</span>
                              </span>
                            </div>

                            <Link
                              to={`/events/${event.id}`}
                              className="text-base sm:text-lg font-bold text-on-surface hover:text-primary transition-colors block leading-tight truncate"
                              title={event.title}
                            >
                              {event.title}
                            </Link>

                            <div className="flex items-center flex-wrap gap-4 text-xs text-text-muted">
                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  location_on
                                </span>
                                <span>{event.venue || "No venue assigned"}</span>
                              </span>

                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  groups
                                </span>
                                <span>
                                  {event.capacity !== null
                                    ? `${event.registered_count || 0} / ${event.capacity} registered (${
                                        event.remaining_capacity ?? 0
                                      } left)`
                                    : `${event.registered_count || 0} registered (Unlimited Capacity)`}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Action Button Ribbon */}
                          <div className="flex items-center flex-wrap gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle/60">
                            {/* 1. Public Details View */}
                            <Link
                              to={`/events/${event.id}`}
                              className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors flex items-center gap-1"
                              title="View public event page"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                visibility
                              </span>
                              <span>View</span>
                            </Link>

                            {/* 2. Edit Action */}
                            {isEditable ? (
                              <Link
                                to={`/operator/events/${event.id}/edit`}
                                className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-primary transition-colors flex items-center gap-1"
                                title="Edit event logistics and capacity"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  edit
                                </span>
                                <span>Edit</span>
                              </Link>
                            ) : (
                              <span
                                className="px-3 py-1.5 rounded-full bg-surface-container-low text-text-muted/60 text-[11px] font-medium cursor-not-allowed select-none"
                                title="Cancelled or completed events cannot be edited"
                              >
                                Locked
                              </span>
                            )}

                            {/* 3. Attendee Roster Action */}
                            <Link
                              to={`/operator/events/${event.id}/attendees`}
                              className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-on-surface transition-colors flex items-center gap-1.5"
                              title="Inspect registered attendees"
                            >
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                group
                              </span>
                              <span>Attendees</span>
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-lavender text-primary">
                                {event.registered_count || 0}
                              </span>
                            </Link>

                            {/* 4. Publish Action (Drafts Only) */}
                            {canPublish && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEventToPublish(event);
                                  setModalError("");
                                }}
                                className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  rocket_launch
                                </span>
                                <span>Publish</span>
                              </button>
                            )}

                            {/* 5. Cancel Action (Published Only) */}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEventToCancel(event);
                                  setModalError("");
                                }}
                                className="px-3.5 py-1.5 rounded-full border border-error/30 hover:bg-error-container/40 text-error text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Cancel this event permanently"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  cancel
                                </span>
                                <span>Cancel</span>
                              </button>
                            )}

                            {/* Start Time Past Warning Notice for Drafts */}
                            {isDraft && startInPast && (
                              <span
                                className="text-[11px] text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                                title="Start time is in the past; edit the start time before publishing."
                              >
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                <span>Time passed</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Local Pagination Bar */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-text-muted px-2 pt-2">
                    <span>
                      Showing {(currentPage - 1) * pageSize + 1} –{" "}
                      {Math.min(currentPage * pageSize, filteredEvents.length)} of{" "}
                      {filteredEvents.length} events
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="font-semibold text-on-surface px-1">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: Publish Event Confirmation Modal                    */}
      {/* ============================================================ */}
      {eventToPublish && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!actionLoading) setEventToPublish(null);
          }}
        >
          <div
            className="w-full max-w-md bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xl border border-border-subtle space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[26px]">rocket_launch</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-on-surface">Publish Event to Campus?</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Publishing <strong className="text-on-surface">"{eventToPublish.title}"</strong> will
                make it immediately visible to all students across the university. Students will be
                able to view logistics and register for seats.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                Scheduled Start &amp; Venue
              </span>
              <p className="font-semibold text-on-surface">
                {formatDhakaSchedule(eventToPublish.starts_at, eventToPublish.ends_at)}
              </p>
              <p className="text-text-muted">{eventToPublish.venue}</p>
            </div>

            {eventToPublish.starts_at && new Date(eventToPublish.starts_at) <= new Date() && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">
                  warning
                </span>
                <span>
                  The scheduled start time is in the past. The backend will refuse publishing until
                  you update the start time via <strong>Edit Event</strong>.
                </span>
              </div>
            )}

            {modalError && (
              <ErrorAlert
                title="Publishing Refused"
                message={modalError}
                onDismiss={() => setModalError("")}
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setEventToPublish(null)}
                className="px-5 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePublishConfirm}
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                {actionLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>Confirm &amp; Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: Cancel Event Confirmation Modal (Permanent)         */}
      {/* ============================================================ */}
      {eventToCancel && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!actionLoading) setEventToCancel(null);
          }}
        >
          <div
            className="w-full max-w-md bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xl border border-border-subtle space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-error-container/60 text-error flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[26px]">cancel</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-on-surface">Permanently Cancel Event?</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Cancelling <strong className="text-on-surface">"{eventToCancel.title}"</strong> is
                <strong> permanent and irreversible</strong>. The event cannot be re-published or edited.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-error-container/20 border border-error/20 text-xs text-on-error-container space-y-1">
              <span className="font-bold block">Important Notice:</span>
              <ul className="list-disc list-inside space-y-1 text-text-muted leading-relaxed">
                <li>Students will see this event with a prominent "Event Cancelled" banner.</li>
                <li>New RSVP registrations will be permanently disabled.</li>
                <li>
                  Existing registrations (<strong>{eventToCancel.registered_count || 0} students</strong>)
                  will remain recorded on your attendee roster.
                </li>
              </ul>
            </div>

            {modalError && (
              <ErrorAlert
                title="Cancellation Refused"
                message={modalError}
                onDismiss={() => setModalError("")}
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setEventToCancel(null)}
                className="px-5 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Keep Event Active
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelConfirm}
                className="px-6 py-2.5 rounded-full bg-error hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                {actionLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>Yes, Cancel Event</span>
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
            <p>Club Operator Event Management</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
