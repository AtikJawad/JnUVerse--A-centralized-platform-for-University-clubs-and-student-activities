import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ProposeCollaborationModal from "../components/ProposeCollaborationModal";
import { collaborationsAPI, extractErrorMessage } from "../services/api";

/**
 * Format ISO datetime string to Asia/Dhaka (+06:00 BST).
 * Example: "Nov 24, 2026 • 03:30 PM BST"
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
 * Format ISO datetime string to short date (e.g., "Nov 24, 2026").
 */
function formatDhakaDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Extract two-letter monogram from club name (e.g., "JnU Debating Society" -> "DS").
 */
function getClubMonogram(name) {
  if (!name) return "CB";
  const cleaned = name
    .replace(/^\[.*?\]\s*/, "") // remove [DEMO] prefix
    .replace(/^JnU\s+/i, "")   // remove JnU prefix
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Collaboration Status Badge visual metadata.
 */
function getStatusBadge(status, box, partnerName = "partner club") {
  switch (status) {
    case "pending":
      if (box === "received") {
        return {
          label: "Pending Operator Review",
          icon: "hourglass_top",
          containerClass: "bg-amber-50 text-amber-800 border-amber-200",
          hasDot: true,
          dotClass: "bg-amber-500",
        };
      }
      return {
        label: `Under Review by ${partnerName}`,
        icon: "schedule",
        containerClass: "bg-surface-lavender text-primary border-primary/20",
        hasDot: true,
        dotClass: "bg-primary",
      };
    case "accepted":
      return {
        label: "Accepted Collaboration",
        icon: "check_circle",
        containerClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        hasDot: false,
      };
    case "rejected":
      return {
        label: "Declined",
        icon: "cancel",
        containerClass: "bg-error-container/40 text-error border-error/20",
        hasDot: false,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        icon: "close",
        containerClass: "bg-surface-lavender text-text-muted border-border-subtle",
        hasDot: false,
      };
    default:
      return {
        label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
        icon: "info",
        containerClass: "bg-surface-lavender text-on-surface-variant border-border-subtle",
        hasDot: false,
      };
  }
}

export default function OperatorCollaborations() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Primary Box View: "received" (Incoming) or "sent" (Outgoing)
  const [activeBox, setActiveBox] = useState("received");

  // Status Filter: "" (all), "pending", "accepted", "rejected", "cancelled"
  const [statusFilter, setStatusFilter] = useState("");

  // Search Filter (Client-side query over loaded list)
  const [searchQuery, setSearchQuery] = useState("");

  // Data & Pagination
  const [collaborations, setCollaborations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  // Overview Metrics grounded in backend collection counts
  const [metrics, setMetrics] = useState({
    receivedTotal: 0,
    receivedPending: 0,
    sentTotal: 0,
    sentPending: 0,
    acceptedTotal: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Action Modals State
  const [requestToAccept, setRequestToAccept] = useState(null);
  const [requestToReject, setRequestToReject] = useState(null);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Propose Collaboration Modal State (Stage 6)
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Detail Sheet State (Slide-over drawer matching Stitch)
  const [detailSheetRequest, setDetailSheetRequest] = useState(null);

  // Expanded descriptions map
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  // Separate Generation Guards for Independent Network Streams
  const listGenRef = useRef(0);
  const metricsGenRef = useRef(0);
  const isMountedRef = useRef(true);

  // Shared Identity & Session Safeguard
  const currentIdentity =
    isAuthenticated && user?.role === "club_operator"
      ? `${user.id ?? user.email ?? "auth"}:${user.club?.id ?? user.club?.slug ?? "club"}`
      : "anonymous";

  const identityRef = useRef(currentIdentity);
  identityRef.current = currentIdentity;
  const lastIdentityRef = useRef(currentIdentity);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle Session Identity Transitions (Hydration, Account Switch, Logout)
  useEffect(() => {
    if (lastIdentityRef.current !== currentIdentity) {
      lastIdentityRef.current = currentIdentity;

      // Invalidate all pending in-flight requests from prior session
      listGenRef.current++;
      metricsGenRef.current++;

      // Wipe previous session data immediately to prevent private cross-account leaks
      setCollaborations([]);
      setTotalCount(0);
      setMetrics({
        receivedTotal: 0,
        receivedPending: 0,
        sentTotal: 0,
        sentPending: 0,
        acceptedTotal: 0,
      });
      setError("");
      setDetailSheetRequest(null);
      setRequestToAccept(null);
      setRequestToReject(null);
      setRequestToCancel(null);
      setIsProposalModalOpen(false);

      // If transition to unauthenticated/non-operator, clear loading state
      if (currentIdentity === "anonymous") {
        setLoading(false);
        setLoadingMore(false);
        setMetricsLoading(false);
      }
    }
  }, [currentIdentity]);

  // Fetch accurate overview metrics from backend using lightweight page_size=1 queries
  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "club_operator") {
      setMetricsLoading(false);
      return;
    }

    const currentMetricsGen = ++metricsGenRef.current;
    const requestIdentity = identityRef.current;
    setMetricsLoading(true);

    try {
      const [recvRes, recvPendRes, sentRes, sentPendRes, accRes] = await Promise.all([
        collaborationsAPI.getAll({ box: "received", page_size: 1 }),
        collaborationsAPI.getAll({ box: "received", status: "pending", page_size: 1 }),
        collaborationsAPI.getAll({ box: "sent", page_size: 1 }),
        collaborationsAPI.getAll({ box: "sent", status: "pending", page_size: 1 }),
        collaborationsAPI.getAll({ status: "accepted", page_size: 1 }),
      ]);

      if (
        !isMountedRef.current ||
        currentMetricsGen !== metricsGenRef.current ||
        requestIdentity !== identityRef.current
      ) {
        return;
      }

      setMetrics({
        receivedTotal: recvRes.data?.count || 0,
        receivedPending: recvPendRes.data?.count || 0,
        sentTotal: sentRes.data?.count || 0,
        sentPending: sentPendRes.data?.count || 0,
        acceptedTotal: accRes.data?.count || 0,
      });
    } catch {
      // Non-fatal if metrics query fails; page continues to function
    } finally {
      if (isMountedRef.current && currentMetricsGen === metricsGenRef.current) {
        setMetricsLoading(false);
      }
    }
  }, [isAuthenticated, user?.role]);

  // Fetch collaborations for current box, status filter, and page
  const fetchCollaborations = useCallback(
    async (pageNumber = 1, isLoadMore = false) => {
      if (!isAuthenticated || user?.role !== "club_operator") {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const currentListGen = ++listGenRef.current;
      const requestIdentity = identityRef.current;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
      }

      try {
        const params = {
          box: activeBox,
          page: pageNumber,
          page_size: 20,
        };
        if (statusFilter) {
          params.status = statusFilter;
        }

        const response = await collaborationsAPI.getAll(params);

        if (
          !isMountedRef.current ||
          currentListGen !== listGenRef.current ||
          requestIdentity !== identityRef.current
        ) {
          return;
        }

        const data = response.data;
        const newResults = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [];

        const total = typeof data?.count === "number" ? data.count : newResults.length;
        const nextUrl = data?.next || null;

        if (isLoadMore) {
          setCollaborations((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const unique = newResults.filter((c) => c.id && !seen.has(c.id));
            return [...prev, ...unique];
          });
          setPage(pageNumber);
        } else {
          const seen = new Set();
          const unique = newResults.filter((c) => {
            if (!c.id || seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          setCollaborations(unique);
          setPage(1);
        }

        setTotalCount(total);
        setHasMore(Boolean(nextUrl));
      } catch (err) {
        if (
          !isMountedRef.current ||
          currentListGen !== listGenRef.current ||
          requestIdentity !== identityRef.current
        ) {
          return;
        }

        if (err.response?.status === 403) {
          setError("Access restricted. Only authorized club operators can access the collaboration hub.");
        } else {
          setError(extractErrorMessage(err, "Failed to load collaborations."));
        }
      } finally {
        if (isMountedRef.current && currentListGen === listGenRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [activeBox, statusFilter, isAuthenticated, user?.role]
  );

  // Trigger metrics whenever the authenticated operator becomes available or identity changes
  useEffect(() => {
    if (isAuthenticated && user?.role === "club_operator") {
      fetchMetrics();
    }
  }, [isAuthenticated, user?.role, fetchMetrics]);

  // Fetch / refetch collaborations list when box, filter, or operator session changes
  useEffect(() => {
    if (isAuthenticated && user?.role === "club_operator") {
      setCollaborations([]);
      setTotalCount(0);
      setPage(1);
      setHasMore(false);
      fetchCollaborations(1, false);
    }
  }, [activeBox, statusFilter, isAuthenticated, user?.role, fetchCollaborations]);

  // Load next page
  const handleLoadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      fetchCollaborations(page + 1, true);
    }
  };

  // Switch Box Tab
  const handleBoxChange = (box) => {
    if (box === activeBox) return;
    setActiveBox(box);
    setStatusFilter("");
    setSearchQuery("");
  };

  // Filtered collaborations with client-side search query
  const filteredCollaborations = useMemo(() => {
    if (!searchQuery.trim()) return collaborations;
    const query = searchQuery.toLowerCase().trim();

    return collaborations.filter((collab) => {
      const other =
        activeBox === "received" ? collab.requesting_club : collab.target_club;
      const otherName = other?.name?.toLowerCase() || "";
      const otherSlug = other?.slug?.toLowerCase() || "";
      const title = collab.title?.toLowerCase() || "";
      const description = collab.description?.toLowerCase() || "";
      const eventTitle = collab.event?.title?.toLowerCase() || "";

      return (
        otherName.includes(query) ||
        otherSlug.includes(query) ||
        title.includes(query) ||
        description.includes(query) ||
        eventTitle.includes(query)
      );
    });
  }, [collaborations, searchQuery, activeBox]);

  // Action: Accept Request
  const handleAcceptConfirm = async () => {
    if (!requestToAccept) return;
    setActionLoading(true);
    setModalError("");

    try {
      const response = await collaborationsAPI.accept(requestToAccept.id);
      const updated = response.data;

      // Update locally
      setCollaborations((prev) =>
        prev.map((c) => (c.id === requestToAccept.id ? updated : c))
      );

      // Close modal and sheet
      setRequestToAccept(null);
      if (detailSheetRequest?.id === requestToAccept.id) {
        setDetailSheetRequest(updated);
      }

      setActionSuccess(
        `Partnership with ${requestToAccept.requesting_club?.name} officially accepted and sealed!`
      );
      fetchMetrics();
    } catch (err) {
      if (err.response?.status === 409) {
        setModalError(err.response.data?.detail || "Only pending requests can be accepted.");
      } else if (err.response?.status === 403) {
        setModalError("Your club cannot accept this request.");
      } else {
        setModalError(extractErrorMessage(err, "Failed to accept collaboration request."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Reject Request
  const handleRejectConfirm = async () => {
    if (!requestToReject) return;
    setActionLoading(true);
    setModalError("");

    try {
      const response = await collaborationsAPI.reject(requestToReject.id);
      const updated = response.data;

      // Update locally
      setCollaborations((prev) =>
        prev.map((c) => (c.id === requestToReject.id ? updated : c))
      );

      setRequestToReject(null);
      if (detailSheetRequest?.id === requestToReject.id) {
        setDetailSheetRequest(updated);
      }

      setActionSuccess(
        `Collaboration request from ${requestToReject.requesting_club?.name} has been declined.`
      );
      fetchMetrics();
    } catch (err) {
      if (err.response?.status === 409) {
        setModalError(err.response.data?.detail || "Only pending requests can be declined.");
      } else if (err.response?.status === 403) {
        setModalError("Your club cannot decline this request.");
      } else {
        setModalError(extractErrorMessage(err, "Failed to decline collaboration request."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Cancel Outgoing Request
  const handleCancelConfirm = async () => {
    if (!requestToCancel) return;
    setActionLoading(true);
    setModalError("");

    try {
      const response = await collaborationsAPI.cancel(requestToCancel.id);
      const updated = response.data;

      // Update locally
      setCollaborations((prev) =>
        prev.map((c) => (c.id === requestToCancel.id ? updated : c))
      );

      setRequestToCancel(null);
      if (detailSheetRequest?.id === requestToCancel.id) {
        setDetailSheetRequest(updated);
      }

      setActionSuccess(
        `Your outgoing collaboration request to ${requestToCancel.target_club?.name} has been cancelled.`
      );
      fetchMetrics();
    } catch (err) {
      if (err.response?.status === 409) {
        setModalError(err.response.data?.detail || "Only pending requests can be cancelled.");
      } else if (err.response?.status === 403) {
        setModalError("Only the requesting club can cancel this request.");
      } else {
        setModalError(extractErrorMessage(err, "Failed to cancel collaboration request."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Proposal Submitted Successfully (Stage 6)
  const handleProposalSuccess = (createdCollab) => {
    setIsProposalModalOpen(false);
    const targetName = createdCollab?.target_club?.name || "partner society";
    setActionSuccess(
      `Collaboration proposal successfully dispatched to ${targetName}! It is now registered in your outbound dispatch queue.`
    );

    // Switch to Sent tab per requirements
    setActiveBox("sent");
    setStatusFilter("");
    setSearchQuery("");
    setPage(1);

    // Refresh Outgoing List and Overview Metrics
    fetchCollaborations(1, false);
    fetchMetrics();
  };

  const toggleDescription = (id) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
        <Navbar />
        <main className="w-full pt-28 pb-16 flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-muted font-medium">Verifying operator credentials...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        {/* Floating Notification Toast */}
        {actionSuccess && (
          <div className="fixed top-24 right-6 z-50 max-w-md animate-fadeIn">
            <div className="p-4 rounded-2xl shadow-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-emerald-600">
                check_circle
              </span>
              <p className="text-xs font-semibold leading-relaxed flex-1">
                {actionSuccess}
              </p>
              <button
                type="button"
                onClick={() => setActionSuccess("")}
                className="text-emerald-700 hover:text-emerald-900"
                aria-label="Dismiss alert"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-12 py-8 flex flex-col gap-8">
          {/* Header Section (Direct from Stitch Reference) */}
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-border-subtle/70">
            <div className="flex flex-col max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-primary font-bold tracking-widest uppercase bg-surface-lavender px-2.5 py-0.5 rounded-full">
                  CLUB PARTNERSHIPS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-text-muted">Inter-Society Dispatch</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
                Manage collaborations.
              </h1>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                Review incoming invitations and keep track of collaboration requests involving your club.
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              {/* Operator Context Banner Pill */}
              <div className="flex items-center gap-3 px-4 py-2 bg-surface-white rounded-full border border-border-subtle shadow-xs">
                <div className="relative flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping absolute opacity-75" />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-text-muted">Managing Authority:</span>
                  <span className="font-bold text-on-surface truncate max-w-[180px]">
                    {user?.name || "Your Society"}
                  </span>
                </div>
                <span className="text-text-muted text-[12px]">·</span>
                <span className="text-[11px] text-primary font-semibold tracking-wide hidden sm:inline">
                  Single-Club Registry
                </span>
              </div>

              {/* Propose Collaboration Primary Action Button */}
              <button
                type="button"
                onClick={() => setIsProposalModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
                id="propose-collaboration-btn"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Propose Collaboration</span>
              </button>
            </div>
          </section>

          {/* Overview Metrics Cards (Derived from Real Backend Counts) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-xs font-semibold">Incoming Requests</span>
                <span className="material-symbols-outlined text-primary text-[20px]">
                  inbox
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">
                {metricsLoading ? (
                  <span className="inline-block w-8 h-7 bg-surface-lavender/80 rounded animate-pulse" />
                ) : (
                  metrics.receivedTotal
                )}
              </span>
              <span className="text-[11px] text-text-muted mt-0.5">
                Total received by your club
              </span>
            </div>

            <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-semibold">Pending Action</span>
                <span className="material-symbols-outlined text-amber-600 text-[20px]">
                  pending_actions
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">
                {metricsLoading ? (
                  <span className="inline-block w-8 h-7 bg-amber-100/80 rounded animate-pulse" />
                ) : (
                  metrics.receivedPending
                )}
              </span>
              <span className="text-[11px] text-text-muted mt-0.5">
                Awaiting your club review
              </span>
            </div>

            <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-xs font-semibold">Outgoing Sent</span>
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  send
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">
                {metricsLoading ? (
                  <span className="inline-block w-8 h-7 bg-surface-lavender/80 rounded animate-pulse" />
                ) : (
                  metrics.sentTotal
                )}
              </span>
              <span className="text-[11px] text-text-muted mt-0.5">
                {metricsLoading ? "Checking outbox..." : `${metrics.sentPending} pending target review`}
              </span>
            </div>

            <div className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-semibold">Accepted Partners</span>
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  handshake
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
                {metricsLoading ? (
                  <span className="inline-block w-8 h-7 bg-emerald-100/80 rounded animate-pulse" />
                ) : (
                  metrics.acceptedTotal
                )}
              </span>
              <span className="text-[11px] text-text-muted mt-0.5">
                Established partnerships
              </span>
            </div>
          </section>

          {/* Navigation & Filter Strip (Direct from Stitch) */}
          <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Segmented Box Tabs: Received vs Sent */}
            <div className="inline-flex p-1 bg-surface-white rounded-full border border-border-subtle shadow-xs self-start">
              <button
                type="button"
                onClick={() => handleBoxChange("received")}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs transition-all duration-200 ${
                  activeBox === "received"
                    ? "bg-surface-lavender text-primary font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-canvas-base font-semibold"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">inbox</span>
                <span>Incoming</span>
                {metrics.receivedPending > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold animate-pulse">
                    {metrics.receivedPending}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleBoxChange("sent")}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs transition-all duration-200 ${
                  activeBox === "sent"
                    ? "bg-surface-lavender text-primary font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-canvas-base font-semibold"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Sent</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-lavender text-text-muted text-[10px] font-bold">
                  {metrics.sentTotal}
                </span>
              </button>
            </div>

            {/* Status Filter Chips Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { id: "", label: "All Statuses" },
                { id: "pending", label: "Pending" },
                { id: "accepted", label: "Accepted" },
                { id: "rejected", label: "Declined" },
                { id: "cancelled", label: "Cancelled" },
              ].map((filter) => {
                const isSelected = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(filter.id);
                      setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-all font-semibold ${
                      isSelected
                        ? "bg-primary text-white shadow-xs font-bold"
                        : "bg-surface-white text-on-surface-variant hover:bg-surface-lavender border border-border-subtle"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Search Query Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface-white rounded-2xl border border-border-subtle shadow-xs">
            <div className="relative flex-1 flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-text-muted text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter loaded collaborations by title, club, or scope..."
                className="w-full h-10 pl-10 pr-10 rounded-xl bg-canvas-base text-xs text-on-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-text-muted hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end shrink-0 text-[11px] text-text-muted">
              <span>
                Showing {filteredCollaborations.length} of {collaborations.length} loaded records
              </span>
              <button
                type="button"
                onClick={() => fetchCollaborations(1, false)}
                disabled={loading}
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-lavender transition-colors disabled:opacity-50"
                title="Refresh collaboration list"
                aria-label="Refresh collaboration list"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="min-h-[400px]">
            {/* Loading Skeleton View */}
            {loading && (
              <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-surface-white border border-border-subtle flex flex-col gap-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-surface-lavender/80" />
                        <div className="space-y-2">
                          <div className="w-36 h-4 rounded bg-surface-lavender/80" />
                          <div className="w-24 h-3 rounded bg-surface-lavender/60" />
                        </div>
                      </div>
                      <div className="w-28 h-6 rounded-full bg-surface-lavender/70" />
                    </div>
                    <div className="w-3/4 h-5 rounded bg-surface-lavender/70" />
                    <div className="w-full h-12 rounded bg-surface-lavender/40" />
                  </div>
                ))}
              </div>
            )}

            {/* Error Alert */}
            {!loading && error && (
              <div className="p-8 rounded-3xl bg-error-container/20 border border-error/20 text-center flex flex-col items-center justify-center gap-3 max-w-xl mx-auto my-6">
                <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">cloud_off</span>
                </div>
                <h3 className="text-base font-bold text-on-surface">Unable to load collaborations</h3>
                <p className="text-xs text-text-muted max-w-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchCollaborations(1, false)}
                  className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Retry Request</span>
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredCollaborations.length === 0 && (
              <div className="py-16 px-6 rounded-3xl bg-surface-white border border-border-subtle text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[30px]">
                    {activeBox === "received" ? "inbox" : "send"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-on-surface">
                  {searchQuery
                    ? "No matching collaboration requests"
                    : activeBox === "received"
                    ? "No incoming collaboration requests yet"
                    : "Your club has not sent any collaboration requests yet"}
                </h3>
                <p className="text-xs text-text-muted max-w-sm mt-1 leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your search terms or clearing active filters."
                    : activeBox === "received"
                    ? "When another club proposes a joint initiative or co-hosts an event, their proposal will appear here."
                    : "Cross-club proposals initiated by your executive team will be tracked in this outbound dispatch register."}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-4 py-2 rounded-full bg-surface-lavender text-primary text-xs font-semibold hover:bg-surface-variant transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}

            {/* List of Collaboration Cards (Direct from Stitch) */}
            {!loading && !error && filteredCollaborations.length > 0 && (
              <div className="flex flex-col gap-4">
                {filteredCollaborations.map((collab) => {
                  const partnerClub =
                    activeBox === "received"
                      ? collab.requesting_club
                      : collab.target_club;
                  const partnerName = partnerClub?.name || "Partner Society";
                  const partnerSlug = partnerClub?.slug || "";
                  const monogram = getClubMonogram(partnerName);
                  const badge = getStatusBadge(collab.status, activeBox, partnerName);
                  const isPending = collab.status === "pending";
                  const isDescriptionExpanded = expandedDescriptions[collab.id];

                  return (
                    <article
                      key={collab.id}
                      className="group bg-surface-white rounded-2xl border border-border-subtle p-6 sm:p-7 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(43,52,185,0.08)] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      {/* Left: Club Emblem & Content Stack */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Club Monogram Emblem */}
                        <div
                          className="w-14 h-14 rounded-2xl bg-surface-lavender flex items-center justify-center text-primary font-extrabold text-lg shrink-0 border border-border-subtle shadow-xs"
                          aria-hidden="true"
                        >
                          {monogram}
                        </div>

                        {/* Text & Meta Information */}
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          {/* Top Row: Partner Club Link & Status Badge */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/clubs/${partnerSlug}`}
                              className="text-sm sm:text-base font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                            >
                              <span>{partnerName}</span>
                              <span className="material-symbols-outlined text-[15px] text-text-muted">
                                open_in_new
                              </span>
                            </Link>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-[13px]">
                                verified
                              </span>
                              Chartered Guild
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border ${badge.containerClass}`}
                            >
                              {badge.hasDot && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${badge.dotClass} animate-pulse`}
                                />
                              )}
                              <span className="material-symbols-outlined text-[13px]">
                                {badge.icon}
                              </span>
                              <span>{badge.label}</span>
                            </span>
                          </div>

                          {/* Proposal Title */}
                          <h2 className="text-base sm:text-lg font-bold text-on-surface leading-snug">
                            {collab.title}
                          </h2>

                          {/* Description Body */}
                          {collab.description && (
                            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                              <p
                                className={
                                  isDescriptionExpanded
                                    ? "whitespace-pre-line break-words"
                                    : "line-clamp-2"
                                }
                              >
                                {collab.description}
                              </p>
                              {collab.description.length > 150 && (
                                <button
                                  type="button"
                                  onClick={() => toggleDescription(collab.id)}
                                  className="text-primary hover:underline font-semibold text-xs mt-0.5 inline-block"
                                >
                                  {isDescriptionExpanded ? "Show less" : "Read full brief"}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Meta Information Row */}
                          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-text-muted mt-1">
                            {collab.event && (
                              <span className="inline-flex items-center gap-1 text-on-surface font-medium bg-canvas-base px-2 py-0.5 rounded-md border border-border-subtle">
                                <span className="material-symbols-outlined text-primary text-[15px]">
                                  calendar_month
                                </span>
                                <span>
                                  Event: {collab.event.title} (
                                  {formatDhakaDate(collab.event.starts_at)})
                                </span>
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                schedule
                              </span>
                              <span>Submitted {formatDhakaDate(collab.created_at)}</span>
                            </span>

                            {collab.responded_at && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    done_all
                                  </span>
                                  <span>
                                    Resolved {formatDhakaDate(collab.responded_at)}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions Stack (Accept/Reject for Received, Cancel for Sent) */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border-subtle">
                        {/* Received Pending Controls */}
                        {activeBox === "received" && isPending && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setModalError("");
                                setRequestToAccept(collab);
                              }}
                              className="px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                handshake
                              </span>
                              <span>Accept Invitation</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setModalError("");
                                setRequestToReject(collab);
                              }}
                              className="px-4 py-2 rounded-full bg-surface-lavender hover:bg-error-container hover:text-error text-on-surface-variant text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                            >
                              <span>Decline</span>
                            </button>
                          </div>
                        )}

                        {/* Sent Pending Controls */}
                        {activeBox === "sent" && isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalError("");
                              setRequestToCancel(collab);
                            }}
                            className="px-4 py-2 rounded-full bg-surface-lavender hover:bg-error-container hover:text-error text-text-muted text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              cancel
                            </span>
                            <span>Cancel Request</span>
                          </button>
                        )}

                        {/* View Proposal Details Drawer Toggle */}
                        <button
                          type="button"
                          onClick={() => setDetailSheetRequest(collab)}
                          className="inline-flex items-center justify-center lg:justify-end gap-1 text-primary hover:text-primary-hover font-semibold text-xs transition-colors mt-0.5"
                        >
                          <span>View Full Brief</span>
                          <span className="material-symbols-outlined text-[15px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* Pagination Controls */}
                {hasMore && (
                  <div className="pt-4 flex flex-col items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span>Loading more requests...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">
                            expand_more
                          </span>
                          <span>Load More Requests</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-text-muted">
                      Showing {collaborations.length} of {totalCount} total requests
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* MODAL 1: Accept Collaboration Confirmation Dialog            */}
        {/* ============================================================ */}
        {requestToAccept && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="accept-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              if (!actionLoading) setRequestToAccept(null);
            }}
          >
            <div
              className="bg-surface-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border-subtle flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">
                      handshake
                    </span>
                  </div>
                  <div>
                    <h3 id="accept-modal-title" className="text-base font-bold text-on-surface">
                      Accept Collaboration Proposal?
                    </h3>
                    <p className="text-xs text-text-muted">
                      From: {requestToAccept.requesting_club?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRequestToAccept(null)}
                  className="text-text-muted hover:text-on-surface p-1 rounded-full"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-surface-lavender/50 border border-border-subtle flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface">
                  {requestToAccept.title}
                </span>
                {requestToAccept.description && (
                  <p className="text-xs text-on-surface-variant line-clamp-3">
                    {requestToAccept.description}
                  </p>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Accepting this invitation creates an official inter-club partnership between your club and{" "}
                <strong className="text-on-surface">{requestToAccept.requesting_club?.name}</strong>. Both clubs will be listed as public partners, and a confirmation dispatch will be sent to their executive team.
              </p>

              {modalError && (
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRequestToAccept(null)}
                  className="px-5 py-2 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Keep Reviewing
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleAcceptConfirm}
                  className="px-6 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">
                        check_circle
                      </span>
                      <span>Confirm &amp; Accept Partnership</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL 2: Decline Collaboration Confirmation Dialog           */}
        {/* ============================================================ */}
        {requestToReject && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              if (!actionLoading) setRequestToReject(null);
            }}
          >
            <div
              className="bg-surface-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border-subtle flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-error-container text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">cancel</span>
                  </div>
                  <div>
                    <h3 id="decline-modal-title" className="text-base font-bold text-on-surface">
                      Decline Collaboration Proposal?
                    </h3>
                    <p className="text-xs text-text-muted">
                      From: {requestToReject.requesting_club?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRequestToReject(null)}
                  className="text-text-muted hover:text-on-surface p-1 rounded-full"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-canvas-base border border-border-subtle flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface">
                  {requestToReject.title}
                </span>
                {requestToReject.description && (
                  <p className="text-xs text-on-surface-variant line-clamp-3">
                    {requestToReject.description}
                  </p>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Declining this proposal will formally mark the request as rejected in the university intra-club register. The executive operator of{" "}
                <strong className="text-on-surface">{requestToReject.requesting_club?.name}</strong> will be notified.
              </p>

              {modalError && (
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRequestToReject(null)}
                  className="px-5 py-2 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Keep Invitation
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRejectConfirm}
                  className="px-6 py-2 rounded-full bg-error hover:bg-error/90 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Declining...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      <span>Decline Proposal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL 3: Cancel Outgoing Proposal Confirmation Dialog        */}
        {/* ============================================================ */}
        {requestToCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              if (!actionLoading) setRequestToCancel(null);
            }}
          >
            <div
              className="bg-surface-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border-subtle flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">cancel</span>
                  </div>
                  <div>
                    <h3 id="cancel-modal-title" className="text-base font-bold text-on-surface">
                      Withdraw Outgoing Proposal?
                    </h3>
                    <p className="text-xs text-text-muted">
                      Target: {requestToCancel.target_club?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRequestToCancel(null)}
                  className="text-text-muted hover:text-on-surface p-1 rounded-full"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-canvas-base border border-border-subtle flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface">
                  {requestToCancel.title}
                </span>
                {requestToCancel.description && (
                  <p className="text-xs text-on-surface-variant line-clamp-3">
                    {requestToCancel.description}
                  </p>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cancelling this outgoing request will withdraw the invitation sent to{" "}
                <strong className="text-on-surface">{requestToCancel.target_club?.name}</strong>. The request will be marked as cancelled and cannot be reopened.
              </p>

              {modalError && (
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRequestToCancel(null)}
                  className="px-5 py-2 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Keep Request Active
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelConfirm}
                  className="px-6 py-2 rounded-full bg-error hover:bg-error/90 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SLIDE-OVER DRAWER: Collaboration Brief Details (from Stitch) */}
        {/* ============================================================ */}
        {detailSheetRequest && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex justify-end bg-on-surface/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setDetailSheetRequest(null)}
          >
            <div
              className="bg-surface-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    assignment
                  </span>
                  <span className="text-base font-bold text-on-surface">
                    Collaboration Brief Details
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailSheetRequest(null)}
                  className="p-1 rounded-full text-text-muted hover:text-on-surface hover:bg-surface-lavender transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                {/* Partner Club Banner */}
                {(() => {
                  const partnerClub =
                    activeBox === "received"
                      ? detailSheetRequest.requesting_club
                      : detailSheetRequest.target_club;
                  const partnerName = partnerClub?.name || "Partner Society";
                  const monogram = getClubMonogram(partnerName);
                  const badge = getStatusBadge(
                    detailSheetRequest.status,
                    activeBox,
                    partnerName
                  );

                  return (
                    <div className="flex items-center justify-between p-4 bg-surface-lavender/60 rounded-2xl border border-border-subtle flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-surface-white flex items-center justify-center text-primary font-extrabold text-base shadow-xs">
                          {monogram}
                        </div>
                        <div className="flex flex-col">
                          <Link
                            to={`/clubs/${partnerClub?.slug}`}
                            className="text-sm font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span>{partnerName}</span>
                            <span className="material-symbols-outlined text-[14px]">
                              open_in_new
                            </span>
                          </Link>
                          <span className="text-[11px] text-text-muted">
                            @{partnerClub?.slug}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border ${badge.containerClass}`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {badge.icon}
                        </span>
                        <span>{badge.label}</span>
                      </span>
                    </div>
                  );
                })()}

                {/* Scope & Title */}
                <div>
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Proposal Scope &amp; Initiative
                  </span>
                  <h4 className="text-xl font-extrabold text-on-surface leading-snug">
                    {detailSheetRequest.title}
                  </h4>
                </div>

                {/* Core Description Statement */}
                <div className="p-4 bg-canvas-base rounded-2xl border border-border-subtle flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    Core Statement &amp; Objectives
                  </span>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line break-words">
                    {detailSheetRequest.description || "No specific detailed brief was submitted."}
                  </p>
                </div>

                {/* Linked Event (if present) */}
                {detailSheetRequest.event && (
                  <div className="p-4 bg-surface-lavender/40 border border-border-subtle rounded-2xl flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        calendar_month
                      </span>
                      <span>Linked Campus Event</span>
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-on-surface">
                      {detailSheetRequest.event.title}
                    </span>
                    <span className="text-xs text-text-muted">
                      Starts: {formatDhakaTimestamp(detailSheetRequest.event.starts_at)}
                    </span>
                  </div>
                )}

                {/* Timeline Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-canvas-base border border-border-subtle rounded-xl flex flex-col gap-1">
                    <span className="text-[11px] text-text-muted font-semibold">
                      Submitted On
                    </span>
                    <span className="text-xs font-bold text-on-surface">
                      {formatDhakaTimestamp(detailSheetRequest.created_at)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-canvas-base border border-border-subtle rounded-xl flex flex-col gap-1">
                    <span className="text-[11px] text-text-muted font-semibold">
                      Last Response / Resolution
                    </span>
                    <span className="text-xs font-bold text-on-surface">
                      {detailSheetRequest.responded_at
                        ? formatDhakaTimestamp(detailSheetRequest.responded_at)
                        : "Pending evaluation"}
                    </span>
                  </div>
                </div>

                {/* Protocol Tag */}
                <div className="p-3 rounded-xl bg-canvas-base border border-border-subtle flex items-center justify-between text-xs text-text-muted">
                  <span>Protocol Registry ID</span>
                  <span className="font-mono text-on-surface font-semibold">
                    {detailSheetRequest.id}
                  </span>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-border-subtle bg-canvas-base flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailSheetRequest(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-lavender transition-all"
                >
                  Close Preview
                </button>

                {activeBox === "received" && detailSheetRequest.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRequestToAccept(detailSheetRequest);
                    }}
                    className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      handshake
                    </span>
                    <span>Accept Partnership</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL 4: Propose Collaboration Modal (Stage 6)               */}
        {/* ============================================================ */}
        <ProposeCollaborationModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          onSuccess={handleProposalSuccess}
          currentClub={user?.club}
        />
      </main>
    </div>
  );
}
