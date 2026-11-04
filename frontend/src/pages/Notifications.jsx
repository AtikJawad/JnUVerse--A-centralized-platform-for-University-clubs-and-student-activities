import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { notificationsAPI, noticesAPI, extractErrorMessage } from "../services/api";

/**
 * Format ISO timestamps to exact Asia/Dhaka time representation.
 * e.g., "Nov 4, 2026 • 04:30 PM BST"
 */
function formatDhakaTimestamp(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} • ${timePart} BST`;
}

/**
 * Format ISO timestamps to relative time strings with Asia/Dhaka fallback.
 * e.g., "Just now", "5m ago", "2h ago", "3d ago", or "Nov 4, 2026"
 */
function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return "Just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDhakaTimestamp(isoString);
}

/**
 * Visual styling and iconography based on backend Notification.Type choices.
 */
function getNotificationVisuals(type) {
  switch (type) {
    case "event_published":
      return {
        icon: "event_available",
        containerClass: "bg-emerald-50 text-emerald-600",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "New Event",
      };
    case "event_cancelled":
      return {
        icon: "event_busy",
        containerClass: "bg-error-container text-on-error-container",
        badgeClass: "bg-error-container/60 text-error border-error/20",
        label: "Event Cancelled",
      };
    case "event_updated":
      return {
        icon: "edit_calendar",
        containerClass: "bg-amber-50 text-amber-600",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Event Update",
      };
    case "membership_update":
      return {
        icon: "group",
        containerClass: "bg-blue-50 text-blue-600",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Membership",
      };
    case "collaboration_update":
      return {
        icon: "handshake",
        containerClass: "bg-purple-50 text-purple-600",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
        label: "Collaboration",
      };
    case "notice":
    default:
      return {
        icon: "campaign",
        containerClass: "bg-surface-lavender text-primary",
        badgeClass: "bg-surface-lavender text-primary border-primary/20",
        label: "Notice",
      };
  }
}

/**
 * Notifications Inbox Page — Week 5 Stage 3
 *
 * Full-featured personal notification inbox implementing:
 * 1. Server-side All / Unread filtering with DRF query parameters.
 * 2. Server-side pagination with Previous/Next controls.
 * 3. One-click "Mark all as read" with immediate Navbar bell synchronization.
 * 4. Individual notification read actions (on navigation and standalone button).
 * 5. Notice club slug resolution via noticesAPI.getById(id).
 * 6. Responsive Stitch design system aesthetics with loading, error, and empty states.
 */
export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Filter & Pagination State
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "unread"
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Data State
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Status & Async State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Shared per-notification in-flight tracking (ref for synchronous concurrency locks, state for UI)
  const inFlightIdsRef = useRef(new Set());
  const [inFlightIds, setInFlightIds] = useState(new Set());

  // Concurrency & Account-Switching Protection
  const currentIdentity =
    isAuthenticated && user
      ? `${user.id ?? user.email ?? "auth"}:${user.role ?? "user"}`
      : null;

  const identityRef = useRef(currentIdentity);
  identityRef.current = currentIdentity;

  const previousIdentityRef = useRef(currentIdentity);
  const generationRef = useRef(0);

  const isRequestCurrent = useCallback((reqGen, reqIdent) => {
    return (
      reqGen === generationRef.current &&
      reqIdent !== null &&
      reqIdent === identityRef.current
    );
  }, []);

  /**
   * Fetch lightweight unread count for the "Mark all as read" button and badges.
   */
  const fetchUnreadTotal = useCallback(async () => {
    if (!isAuthenticated || !currentIdentity) return;
    const reqGen = generationRef.current;
    const reqIdent = currentIdentity;

    try {
      const res = await notificationsAPI.getUnreadCount();
      if (!isRequestCurrent(reqGen, reqIdent)) return;

      const count = res.data?.unread_count;
      if (typeof count === "number") {
        setUnreadTotal(count);
      }
    } catch {
      // Quietly ignore background counter fetch failures
    }
  }, [isAuthenticated, currentIdentity, isRequestCurrent]);

  /**
   * Fetch notifications list from backend with server-side pagination & filter.
   */
  const fetchNotifications = useCallback(
    async (targetPage, filterMode) => {
      if (!isAuthenticated || !currentIdentity) return;

      const reqGen = generationRef.current;
      const reqIdent = currentIdentity;

      setLoading(true);
      setError(null);
      setActionError(null);

      try {
        const params = {
          page: targetPage,
          page_size: pageSize,
        };

        if (filterMode === "unread") {
          params.unread = "true";
        }

        const res = await notificationsAPI.getAll(params);

        if (!isRequestCurrent(reqGen, reqIdent)) return;

        const data = res.data;
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        const count = data?.count ?? results.length;

        setNotifications(results);
        setTotalCount(count);
        setHasNext(Boolean(data?.next));
        setHasPrev(Boolean(data?.previous));
      } catch (err) {
        if (!isRequestCurrent(reqGen, reqIdent)) return;
        setError(extractErrorMessage(err, "Failed to load notifications. Please try again."));
      } finally {
        if (isRequestCurrent(reqGen, reqIdent)) {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, currentIdentity, pageSize, isRequestCurrent]
  );

  /**
   * Master effect for account-switching, initialization, and data fetching.
   */
  useEffect(() => {
    // Detect account switch, role transition, or logout
    if (previousIdentityRef.current !== currentIdentity) {
      previousIdentityRef.current = currentIdentity;
      generationRef.current += 1;

      inFlightIdsRef.current.clear();
      setInFlightIds(new Set());
      setNotifications([]);
      setTotalCount(0);
      setUnreadTotal(0);
      setPage(1);
      setActiveFilter("all");
      setError(null);
      setActionError(null);
      setStatusMessage(null);
      setMarkingAllRead(false);
    }

    if (!isAuthenticated || !currentIdentity) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    fetchUnreadTotal();
    fetchNotifications(page, activeFilter);
  }, [isAuthenticated, currentIdentity, page, activeFilter, fetchNotifications, fetchUnreadTotal]);

  /**
   * Listen to external "notifications:updated" events to keep inbox synced.
   */
  useEffect(() => {
    const handleNotificationsUpdated = () => {
      if (isAuthenticated && currentIdentity) {
        fetchUnreadTotal();
      }
    };

    window.addEventListener("notifications:updated", handleNotificationsUpdated);
    return () => window.removeEventListener("notifications:updated", handleNotificationsUpdated);
  }, [isAuthenticated, currentIdentity, fetchUnreadTotal]);

  /**
   * Filter tab toggle handler.
   */
  const handleFilterChange = (newFilter) => {
    if (newFilter === activeFilter) return;
    setActiveFilter(newFilter);
    setPage(1);
    setStatusMessage(null);
  };

  /**
   * Resolve appropriate deep navigation target for a notification.
   * Handles notice club slug lookup via noticesAPI.getById(id) and passes notice UUID in navigation state.
   */
  const resolveDestination = async (notif) => {
    if (!notif) return { pathname: "/notifications" };

    const eventId = typeof notif.event === "object" ? notif.event?.id : notif.event;

    if (["event_published", "event_cancelled", "event_updated"].includes(notif.type)) {
      return { pathname: eventId ? `/events/${eventId}` : "/events" };
    }

    if (notif.type === "membership_update") {
      return {
        pathname: user?.role === "club_operator" ? "/operator/members" : "/my-clubs",
      };
    }

    if (notif.type === "notice") {
      const noticeId = typeof notif.notice === "object" ? notif.notice?.id : notif.notice;
      if (noticeId) {
        try {
          const res = await noticesAPI.getById(noticeId);
          const slug = res.data?.club?.slug;
          if (slug) {
            return {
              pathname: `/clubs/${slug}`,
              state: { noticeId },
            };
          }
        } catch {
          // If notice detail fetch fails or user is restricted, fallback to /clubs
        }
      }
      return { pathname: "/clubs" };
    }

    if (notif.type === "collaboration_update") {
      return { pathname: "/notifications" };
    }

    return { pathname: "/notifications" };
  };

  /**
   * Standalone inline action to mark an individual notification as read without navigating.
   */
  const handleMarkSingleRead = async (e, notif) => {
    e.stopPropagation();

    // Synchronous in-flight guard prevents duplicate requests
    if (notif.is_read || inFlightIdsRef.current.has(notif.id)) return;

    const reqGen = generationRef.current;
    const reqIdent = currentIdentity;

    inFlightIdsRef.current.add(notif.id);
    setInFlightIds(new Set(inFlightIdsRef.current));
    setActionError(null);

    // Save snapshots for rollback
    const prevNotifications = notifications;
    const prevUnreadTotal = unreadTotal;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
    );
    setUnreadTotal((prev) => Math.max(0, prev - 1));

    try {
      await notificationsAPI.markRead(notif.id);

      // Verify request is still current before mutating state or emitting events
      if (!isRequestCurrent(reqGen, reqIdent)) return;

      window.dispatchEvent(new CustomEvent("notifications:updated"));

      // If viewing unread filter, refresh to remove read item cleanly
      if (activeFilter === "unread") {
        fetchNotifications(page, "unread");
      }
    } catch (err) {
      // Rollback only if still active identity
      if (!isRequestCurrent(reqGen, reqIdent)) return;
      setNotifications(prevNotifications);
      setUnreadTotal(prevUnreadTotal);
      setActionError(extractErrorMessage(err, "Failed to mark notification as read."));
    } finally {
      if (isRequestCurrent(reqGen, reqIdent)) {
        inFlightIdsRef.current.delete(notif.id);
        setInFlightIds(new Set(inFlightIdsRef.current));
      }
    }
  };

  /**
   * Card click handler: marks notification read if unread, then navigates to destination.
   */
  const handleCardClick = async (notif) => {
    // Synchronous in-flight guard prevents duplicate clicks or duplicate navigation
    if (inFlightIdsRef.current.has(notif.id)) return;

    const reqGen = generationRef.current;
    const reqIdent = currentIdentity;

    // If already read, navigate immediately
    if (notif.is_read) {
      inFlightIdsRef.current.add(notif.id);
      setInFlightIds(new Set(inFlightIdsRef.current));
      try {
        const target = await resolveDestination(notif);
        if (!isRequestCurrent(reqGen, reqIdent)) return;
        navigate(target.pathname || target, target.state ? { state: target.state } : undefined);
      } finally {
        if (isRequestCurrent(reqGen, reqIdent)) {
          inFlightIdsRef.current.delete(notif.id);
          setInFlightIds(new Set(inFlightIdsRef.current));
        }
      }
      return;
    }

    inFlightIdsRef.current.add(notif.id);
    setInFlightIds(new Set(inFlightIdsRef.current));
    setActionError(null);

    // Save snapshots for rollback
    const prevNotifications = notifications;
    const prevUnreadTotal = unreadTotal;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
    );
    setUnreadTotal((prev) => Math.max(0, prev - 1));

    try {
      await notificationsAPI.markRead(notif.id);

      // Verify request is still current before navigation
      if (!isRequestCurrent(reqGen, reqIdent)) return;

      window.dispatchEvent(new CustomEvent("notifications:updated"));
      const target = await resolveDestination(notif);

      if (!isRequestCurrent(reqGen, reqIdent)) return;
      navigate(target.pathname || target, target.state ? { state: target.state } : undefined);
    } catch (err) {
      // Rollback on failure: do not navigate
      if (!isRequestCurrent(reqGen, reqIdent)) return;
      setNotifications(prevNotifications);
      setUnreadTotal(prevUnreadTotal);
      setActionError(
        extractErrorMessage(err, "Failed to mark notification as read. Navigation halted.")
      );
    } finally {
      if (isRequestCurrent(reqGen, reqIdent)) {
        inFlightIdsRef.current.delete(notif.id);
        setInFlightIds(new Set(inFlightIdsRef.current));
      }
    }
  };

  /**
   * One-click action to mark all unread notifications as read.
   */
  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadTotal === 0) return;

    const reqGen = generationRef.current;
    const reqIdent = currentIdentity;

    setMarkingAllRead(true);
    setActionError(null);
    setStatusMessage(null);

    try {
      const res = await notificationsAPI.markAllRead();

      // Guard check: do not update if user identity or generation changed during network call
      if (!isRequestCurrent(reqGen, reqIdent)) return;

      const updatedCount = res.data?.updated ?? unreadTotal;

      // Update visible items
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadTotal(0);

      // Synchronize Navbar bell badge
      window.dispatchEvent(new CustomEvent("notifications:updated"));

      setStatusMessage(`Successfully marked ${updatedCount} notification(s) as read.`);

      // If active filter is "unread", refresh to render the empty unread state
      if (activeFilter === "unread") {
        fetchNotifications(1, "unread");
        setPage(1);
      }
    } catch (err) {
      if (!isRequestCurrent(reqGen, reqIdent)) return;
      setActionError(extractErrorMessage(err, "Failed to mark all notifications as read."));
    } finally {
      if (isRequestCurrent(reqGen, reqIdent)) {
        setMarkingAllRead(false);
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface">
      <Navbar />

      {/* Atmospheric Ambient Glow */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-80 bg-gradient-to-b from-surface-lavender/60 via-secondary-fixed/20 to-transparent blur-3xl pointer-events-none -z-10" />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 sm:pt-[120px] pb-12 sm:pb-16 space-y-6">
          {/* ============================================================ */}
          {/* 1. Header Section                                            */}
          {/* ============================================================ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/80">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-lavender text-primary text-[11px] uppercase font-bold tracking-wider mb-2">
                <span className="material-symbols-outlined text-[15px]">notifications</span>
                CAMPUS FEED
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                Notifications
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                Stay updated with what's happening across your campus community.
              </p>
            </div>

            {/* Header Action: Mark All As Read */}
            {unreadTotal > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all self-start sm:self-auto"
                aria-label="Mark all notifications as read"
              >
                {markingAllRead ? (
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    done_all
                  </span>
                )}
                <span>Mark all as read</span>
                <span className="px-1.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[10px] font-bold">
                  {unreadTotal}
                </span>
              </button>
            )}
          </div>

          {/* ============================================================ */}
          {/* 2. Status & Error Feedback Banners                           */}
          {/* ============================================================ */}
          {statusMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                  check_circle
                </span>
                <span>{statusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded"
                aria-label="Dismiss message"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-2xl bg-error-container/80 border border-error/20 text-on-error-container text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-error shrink-0">
                  error
                </span>
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-on-error-container/70 hover:text-on-error-container p-0.5 rounded"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. Filters Navigation Bar                                    */}
          {/* ============================================================ */}
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex p-1 bg-surface-lavender/60 border border-border-subtle rounded-2xl">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === "all"
                    ? "bg-primary text-white shadow-xs"
                    : "text-on-surface hover:text-primary"
                }`}
              >
                <span>All</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === "all"
                      ? "bg-white/20 text-white"
                      : "bg-surface-white text-text-muted"
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("unread")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === "unread"
                    ? "bg-primary text-white shadow-xs"
                    : "text-on-surface hover:text-primary"
                }`}
              >
                <span>Unread</span>
                {unreadTotal > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeFilter === "unread"
                        ? "bg-white/20 text-white"
                        : "bg-primary text-white"
                    }`}
                  >
                    {unreadTotal}
                  </span>
                )}
              </button>
            </div>

            {/* Current Results Overview */}
            <span className="text-xs font-medium text-text-muted hidden sm:inline-block">
              {totalCount} {totalCount === 1 ? "notification" : "notifications"}
            </span>
          </div>

          {/* ============================================================ */}
          {/* 4. Notifications Feed List                                   */}
          {/* ============================================================ */}
          {loading ? (
            /* Loading Skeleton */
            <div className="bg-surface-white rounded-3xl border border-border-subtle shadow-xs overflow-hidden divide-y divide-border-subtle/70">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="p-4 sm:p-5 flex items-start gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface-lavender shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="flex items-center justify-between">
                      <div className="h-3.5 bg-surface-lavender rounded w-1/3" />
                      <div className="h-3 bg-surface-lavender rounded w-20" />
                    </div>
                    <div className="h-3 bg-surface-lavender rounded w-4/5" />
                    <div className="h-2.5 bg-surface-lavender rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-surface-white rounded-3xl border border-border-subtle shadow-xs p-8 sm:p-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[24px]">error_outline</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">Could not load notifications</h3>
              <p className="text-xs sm:text-sm text-text-muted max-w-md mt-1 mb-6 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchNotifications(page, activeFilter)}
                className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-resting transition-all"
              >
                Try Again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            /* Empty State */
            <div className="bg-surface-white rounded-3xl border border-border-subtle shadow-xs p-10 sm:p-14 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[28px]">
                  {activeFilter === "unread" ? "done_all" : "notifications_off"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">
                {activeFilter === "unread" ? "No unread notifications." : "You're all caught up."}
              </h3>
              <p className="text-xs sm:text-sm text-text-muted max-w-sm mt-1 mb-6 leading-relaxed">
                {activeFilter === "unread"
                  ? "You've read all your notifications."
                  : "There are no notifications to display right now."}
              </p>
              {activeFilter === "unread" && (
                <button
                  type="button"
                  onClick={() => handleFilterChange("all")}
                  className="px-5 py-2 rounded-full bg-surface-lavender hover:bg-primary hover:text-white text-primary text-xs font-bold transition-all"
                >
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            /* Notification Items List */
            <div className="bg-surface-white rounded-3xl border border-border-subtle shadow-xs overflow-hidden divide-y divide-border-subtle/70">
              {notifications.map((notif) => {
                const visuals = getNotificationVisuals(notif.type);
                const isItemInFlight = inFlightIds.has(notif.id);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleCardClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick(notif);
                      }
                    }}
                    className={`w-full text-left p-4 sm:p-5 flex items-start gap-4 transition-colors relative cursor-pointer group ${
                      !notif.is_read
                        ? "bg-surface-lavender/25 hover:bg-surface-lavender/50"
                        : "bg-surface-white hover:bg-surface-lavender/30"
                    }`}
                  >
                    {/* Visual Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${visuals.containerClass}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {visuals.icon}
                      </span>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              !notif.is_read
                                ? "font-bold text-on-surface"
                                : "font-semibold text-on-surface-variant"
                            }`}
                          >
                            {notif.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 hidden sm:inline-block ${visuals.badgeClass}`}
                          >
                            {visuals.label}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <span
                          className="text-[11px] text-text-muted shrink-0 font-medium"
                          title={formatDhakaTimestamp(notif.created_at)}
                        >
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      {/* Message Body */}
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread Indicator & Accessible Standalone Action */}
                    <div className="flex items-center gap-2 shrink-0 self-center ml-2">
                      {!notif.is_read && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleRead(e, notif)}
                            disabled={isItemInFlight}
                            title="Mark as read"
                            aria-label={`Mark "${notif.title}" as read`}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-primary hover:bg-surface-lavender transition-colors opacity-70 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              check_circle
                            </span>
                          </button>
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-primary"
                            aria-label="Unread notification"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. Server-side Pagination Controls                           */}
          {/* ============================================================ */}
          {!loading && !error && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs">
              <span className="text-text-muted font-medium">
                Showing{" "}
                <span className="font-bold text-on-surface">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
                </span>{" "}
                of <span className="font-bold text-on-surface">{totalCount}</span> notifications
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={!hasPrev || page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-on-surface hover:bg-surface-lavender font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  <span>Previous</span>
                </button>

                <span className="px-3 py-1 text-text-muted font-semibold">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNext || page >= totalPages || loading}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-on-surface hover:bg-surface-lavender font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
