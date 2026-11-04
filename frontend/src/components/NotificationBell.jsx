import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsAPI, noticesAPI, extractErrorMessage } from "../services/api";

/**
 * Format ISO timestamps to relative time strings or localized Dhaka dates.
 * e.g., "Just now", "5m ago", "2h ago", "3d ago", or "Nov 4".
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

  const isSameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    ...(isSameYear ? {} : { year: "numeric" }),
  }).format(date);
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
        label: "New Event",
      };
    case "event_cancelled":
      return {
        icon: "event_busy",
        containerClass: "bg-error-container text-on-error-container",
        label: "Cancelled Event",
      };
    case "event_updated":
      return {
        icon: "edit_calendar",
        containerClass: "bg-amber-50 text-amber-600",
        label: "Event Update",
      };
    case "membership_update":
      return {
        icon: "group",
        containerClass: "bg-blue-50 text-blue-600",
        label: "Membership",
      };
    case "collaboration_update":
      return {
        icon: "handshake",
        containerClass: "bg-purple-50 text-purple-600",
        label: "Collaboration",
      };
    case "notice":
    default:
      return {
        icon: "campaign",
        containerClass: "bg-surface-lavender text-primary",
        label: "Notice",
      };
  }
}

/**
 * Route resolution mapping based on backend notification payload and user role.
 * Resolves club slug via noticesAPI for notice notifications and passes notice UUID in state.
 */
async function resolveNotificationTarget(notif, userRole) {
  if (!notif) return { pathname: "/notifications" };

  const eventId = typeof notif.event === "object" ? notif.event?.id : notif.event;

  switch (notif.type) {
    case "event_published":
    case "event_cancelled":
    case "event_updated":
      return { pathname: eventId ? `/events/${eventId}` : "/events" };

    case "membership_update":
      return {
        pathname: userRole === "club_operator" ? "/operator/members" : "/my-clubs",
      };

    case "notice": {
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

    default:
      return { pathname: "/notifications" };
  }
}

/**
 * NotificationBell Component — Week 5 Stage 2
 *
 * Implements:
 * 1. Notification bell button with unread count badge (up to 99, 99+ if >99).
 * 2. Background polling (45s interval, tab visibility awareness, in-flight guard).
 * 3. Identity and request-generation guard preventing async race conditions across account/role switches.
 * 4. Compact preview popover with latest 5 notifications, loading, error, and empty states.
 * 5. Optimistic mark-as-read on click with automatic badge rollback and error banner on failure.
 */
export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const containerRef = useRef(null);
  const isPollingRef = useRef(false);
  const intervalRef = useRef(null);

  // Identity key capturing user ID/email AND role to guard against cross-account/role state contamination
  const currentIdentity =
    isAuthenticated && user
      ? `${user.id ?? user.email ?? "auth"}:${user.role ?? "user"}`
      : null;

  const identityRef = useRef(currentIdentity);
  identityRef.current = currentIdentity;

  const previousIdentityRef = useRef(currentIdentity);
  const generationRef = useRef(0);

  /**
   * Helper to verify if an async response belongs to the active generation and identity.
   */
  const isRequestCurrent = useCallback((reqGen, reqIdent) => {
    return (
      reqGen === generationRef.current &&
      reqIdent !== null &&
      reqIdent === identityRef.current
    );
  }, []);

  /**
   * Fetch unread notifications count from backend.
   * Guarded by isPollingRef and request generation to prevent overlapping or stale responses.
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !currentIdentity) return;
    if (isPollingRef.current) return;

    const requestGeneration = generationRef.current;
    const requestIdentity = currentIdentity;

    isPollingRef.current = true;
    try {
      const response = await notificationsAPI.getUnreadCount();
      // Drop response if identity or generation changed during network in-flight
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      const count = response.data?.unread_count;
      if (typeof count === "number") {
        setUnreadCount(count);
      }
    } catch (err) {
      // Background polling failure: quietly ignore to prevent console noise
    } finally {
      // Only release the guard if this request still belongs to the active user/generation
      if (isRequestCurrent(requestGeneration, requestIdentity)) {
        isPollingRef.current = false;
      }
    }
  }, [isAuthenticated, currentIdentity, isRequestCurrent]);

  /**
   * Fetch latest 5 notifications for the preview dropdown popover.
   * Guarded by request generation and identity check.
   */
  const fetchRecentNotifications = useCallback(async () => {
    if (!isAuthenticated || !currentIdentity) return;

    const requestGeneration = generationRef.current;
    const requestIdentity = currentIdentity;

    setLoading(true);
    setError(null);
    try {
      const response = await notificationsAPI.getAll({ page_size: 5 });
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      const results = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
        ? response.data
        : [];
      setNotifications(results);
    } catch (err) {
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      setError(extractErrorMessage(err, "Failed to load notifications."));
    } finally {
      if (isRequestCurrent(requestGeneration, requestIdentity)) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, currentIdentity, isRequestCurrent]);

  /**
   * Setup polling and identity verification:
   * - Resets all state and increments generation counter when user identity/role changes.
   * - Polls every 45 seconds when authenticated.
   * - Pauses interval when document tab is hidden.
   * - Resumes polling immediately on visibility change to visible.
   * - Cleans up interval and listeners on unmount or identity change.
   */
  useEffect(() => {
    // If the authenticated identity changed (new login, account switch, role change, or logout)
    if (previousIdentityRef.current !== currentIdentity) {
      previousIdentityRef.current = currentIdentity;
      generationRef.current += 1; // Invalidate all prior in-flight requests
      isPollingRef.current = false;

      setUnreadCount(0);
      setNotifications([]);
      setIsOpen(false);
      setError(null);
      setActionError(null);
    }

    if (!isAuthenticated || !currentIdentity) {
      setUnreadCount(0);
      setNotifications([]);
      setIsOpen(false);
      setError(null);
      setActionError(null);
      return;
    }

    // Initial fetch on mount or identity change
    fetchUnreadCount();

    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (document.visibilityState !== "hidden") {
          fetchUnreadCount();
        }
      }, 45000);
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
        startInterval();
      } else {
        stopInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("notifications:updated", fetchUnreadCount);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("notifications:updated", fetchUnreadCount);
    };
  }, [isAuthenticated, currentIdentity, fetchUnreadCount]);

  /**
   * Handle dropdown open/close toggle.
   * When opening, clears previous action errors, fetches latest notifications, and refreshes unread count.
   */
  const handleToggle = () => {
    if (!isOpen) {
      setActionError(null);
      setIsOpen(true);
      fetchRecentNotifications();
      fetchUnreadCount();
    } else {
      setIsOpen(false);
      setActionError(null);
    }
  };

  /**
   * Dismiss dropdown when clicking outside.
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActionError(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  /**
   * Dismiss dropdown on Escape key.
   */
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActionError(null);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  /**
   * Click handler on individual notification item:
   * 1. If already read, immediately closes dropdown and navigates.
   * 2. If unread:
   *    - Takes a snapshot of previous notifications, unreadCount, and active identity/generation.
   *    - Optimistically updates local list (is_read: true) and decrements unreadCount.
   *    - Calls POST /api/notifications/<id>/read/.
   *    - On success: verifies identity guard, closes dropdown, and navigates to target.
   *    - On failure: verifies identity guard before executing rollback, restoring notifications
   *      and unreadCount to exact snapshot, and displaying an error alert in the popover.
   */
  const handleNotificationClick = async (notif) => {
    const requestGeneration = generationRef.current;
    const requestIdentity = currentIdentity;

    // If already read, resolve target, navigate and close
    if (notif.is_read) {
      const target = await resolveNotificationTarget(notif, user?.role);
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      setIsOpen(false);
      setActionError(null);
      navigate(target.pathname || target, target.state ? { state: target.state } : undefined);
      return;
    }

    // Save previous state for rollback if request fails
    const prevNotifications = notifications;
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setActionError(null);

    try {
      await notificationsAPI.markRead(notif.id);
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      window.dispatchEvent(new CustomEvent("notifications:updated"));

      const target = await resolveNotificationTarget(notif, user?.role);

      // Verify request is still current before navigation and closing
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      setIsOpen(false);
      navigate(target.pathname || target, target.state ? { state: target.state } : undefined);
    } catch (err) {
      // Only execute rollback if the request still belongs to the active identity
      if (!isRequestCurrent(requestGeneration, requestIdentity)) {
        return;
      }
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
      const errorMsg = extractErrorMessage(err, "Failed to mark notification as read.");
      setActionError(errorMsg);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Notification Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-lavender hover:text-on-surface transition-colors relative"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-xs pointer-events-none"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-surface-white border border-border-subtle shadow-xl overflow-hidden z-50 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface">Notifications</span>
              {unreadCount > 0 ? (
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-surface-lavender">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-text-muted px-2 py-0.5 rounded-full bg-surface-lavender">
                  All caught up
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-text-muted">Campus Feed</span>
          </div>

          {/* Action Error Alert (e.g. mark-as-read failure rollback) */}
          {actionError && (
            <div className="px-3.5 py-2 bg-error-container/80 border-b border-error/20 flex items-start justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-on-error-container text-[11px] leading-tight flex-1">
                <span className="material-symbols-outlined text-[16px] text-error shrink-0">
                  error
                </span>
                <span className="font-semibold">{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-on-error-container/70 hover:text-on-error-container p-0.5 rounded transition shrink-0"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}

          {/* Content Body */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              /* Loading Skeleton */
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-surface-lavender shrink-0" />
                    <div className="flex-1 space-y-1.5 py-1">
                      <div className="h-3 bg-surface-lavender rounded w-3/4" />
                      <div className="h-2.5 bg-surface-lavender rounded w-full" />
                      <div className="h-2 bg-surface-lavender rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="py-8 px-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">error_outline</span>
                </div>
                <p className="text-xs font-semibold text-on-surface">Could not load notifications</p>
                <p className="text-[11px] text-text-muted mt-1 max-w-[220px] leading-relaxed">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={fetchRecentNotifications}
                  className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-surface-lavender text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              /* Empty State */
              <div className="py-8 px-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-surface-lavender text-primary flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
                <p className="text-xs font-bold text-on-surface">You're all caught up!</p>
                <p className="text-[11px] text-text-muted mt-1 max-w-[240px] leading-relaxed">
                  Official notices, membership updates, and event reminders will appear here.
                </p>
              </div>
            ) : (
              /* Notification Items List */
              <div className="divide-y divide-border-subtle/70">
                {notifications.map((notif) => {
                  const visuals = getNotificationVisuals(notif.type);
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left p-3 flex items-start gap-3 transition-colors relative hover:bg-surface-lavender/60 cursor-pointer ${
                        !notif.is_read ? "bg-surface-lavender/25" : "bg-surface-white"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${visuals.containerClass}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {visuals.icon}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs truncate ${
                              !notif.is_read
                                ? "font-bold text-on-surface"
                                : "font-semibold text-on-surface-variant"
                            }`}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-text-muted shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mt-0.5">
                          {notif.message}
                        </p>
                      </div>

                      {/* Unread Indicator Dot */}
                      {!notif.is_read && (
                        <span
                          className="w-2 h-2 rounded-full bg-primary shrink-0 self-center ml-1"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border-subtle bg-surface-white text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors"
            >
              <span>View all notifications</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
