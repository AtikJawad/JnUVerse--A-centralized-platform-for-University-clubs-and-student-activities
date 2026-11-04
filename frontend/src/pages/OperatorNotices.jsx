import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { noticesAPI, authAPI, extractErrorMessage } from "../services/api";

/**
 * Format ISO timestamps to Asia/Dhaka (+06:00 BST).
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
 * Return audience badge visual metadata based on backend Notice.Audience values.
 */
function getAudienceBadge(audience, department) {
  switch (audience) {
    case "public":
      return {
        label: "Public",
        icon: "public",
        containerClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        scopeInfo: "Campus Broadcast · All Students & Visitors",
      };
    case "followers":
      return {
        label: "Followers",
        icon: "visibility",
        containerClass: "bg-blue-50 text-blue-800 border-blue-200",
        scopeInfo: "Enrolled Followers & Club Members",
      };
    case "members":
      return {
        label: "Club Members",
        icon: "groups",
        containerClass: "bg-purple-50 text-purple-800 border-purple-200",
        scopeInfo: "Restricted to Approved Club Roster",
      };
    case "department":
      return {
        label: department ? `Department: ${department}` : "Department",
        icon: "school",
        containerClass: "bg-amber-50 text-amber-800 border-amber-200",
        scopeInfo: department ? `Target Major: ${department}` : "Targeted Academic Cohort",
      };
    default:
      return {
        label: audience ? audience.charAt(0).toUpperCase() + audience.slice(1) : "Notice",
        icon: "campaign",
        containerClass: "bg-surface-lavender text-primary border-primary/20",
        scopeInfo: "General Campus Announcement",
      };
  }
}

/**
 * Pagination & Safety Thresholds
 * 50 notices per page * 20 pages = 1,000 notices initial fetch limit.
 * BATCH_PAGE_CAP: up to 10 pages (500 notices) per continuation batch.
 */
const INITIAL_PAGE_CAP = 20;
const BATCH_PAGE_CAP = 10;

/**
 * Operator Notice Management Workspace — Week 5 Stage 5
 * Complete management console for Club Operators to create, edit,
 * inspect, and delete announcements for their own club.
 * Styled per Google Stitch Operator Workspace design language.
 */
export default function OperatorNotices() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Notices List State (Complete operator dataset for accurate metrics & full-dataset search/filtering)
  const [allNotices, setAllNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Backend Dataset Completeness & Safe Continuation State
  const [totalBackendCount, setTotalBackendCount] = useState(0);
  const [hasMoreBackendPages, setHasMoreBackendPages] = useState(false);
  const [nextBackendPage, setNextBackendPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Audience Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");

  // Client-Side Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Departments List State (Loaded dynamically from authAPI.getDepartments)
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState("");

  // Modal Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    body: "",
    audience: "public",
    department: "",
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);

  const [editingNotice, setEditingNotice] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", body: "" });
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [deletingNotice, setDeletingNotice] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Identity and Generation Guard
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

  // Fetch official university departments from backend
  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    setDepartmentsError("");
    try {
      const res = await authAPI.getDepartments();
      const list = res.data?.departments;
      if (Array.isArray(list) && list.length > 0) {
        setDepartments(list);
      } else {
        setDepartments([]);
        setDepartmentsError("No university academic departments returned by server.");
      }
    } catch (err) {
      setDepartments([]);
      setDepartmentsError(extractErrorMessage(err, "Failed to load academic departments from server."));
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch operator's complete notices dataset using multi-page loop (capped at INITIAL_PAGE_CAP pages initially)
  // Backend GET /api/notices/?mine=true supports club & mine, but NOT search or audience params
  const fetchOperatorNotices = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "club_operator") return;

    const reqGen = generationRef.current;
    const reqIdent = currentIdentity;

    setLoading(true);
    setError("");

    try {
      let accumulated = [];
      let pageNum = 1;
      let hasMore = true;
      let backendCount = 0;
      let hasNextPage = false;
      let nextPg = null;

      while (hasMore) {
        if (!isRequestCurrent(reqGen, reqIdent)) return;

        const response = await noticesAPI.getAll({
          mine: true,
          page: pageNum,
          page_size: 50,
        });

        if (!isRequestCurrent(reqGen, reqIdent)) return;

        const data = response.data;
        const results = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [];
        accumulated = accumulated.concat(results);

        if (typeof data?.count === "number") {
          backendCount = data.count;
        } else if (accumulated.length > backendCount) {
          backendCount = accumulated.length;
        }

        // Termination conditions:
        // 1. All records fetched: no next page, or empty results, or reached/exceeded backend count
        if (!data?.next || results.length === 0 || accumulated.length >= backendCount) {
          hasMore = false;
          hasNextPage = false;
          nextPg = null;
        } else if (pageNum >= INITIAL_PAGE_CAP) {
          // 2. Safety cap reached while more records remain on the backend
          hasMore = false;
          hasNextPage = true;
          nextPg = pageNum + 1;
        } else {
          // 3. Continue to next page within initial cap
          pageNum += 1;
        }
      }

      if (!isRequestCurrent(reqGen, reqIdent)) return;

      // Deduplicate by ID
      const seen = new Set();
      const uniqueNotices = accumulated.filter((n) => {
        if (!n || !n.id || seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });

      setAllNotices(uniqueNotices);
      setTotalBackendCount(backendCount);
      const isPartial = hasNextPage && uniqueNotices.length < backendCount;
      setHasMoreBackendPages(isPartial);
      setNextBackendPage(isPartial ? nextPg : null);
    } catch (err) {
      if (!isRequestCurrent(reqGen, reqIdent)) return;
      if (err.response?.status === 403) {
        setError("Only authorized club operators can access the notice management workspace.");
      } else {
        setError(extractErrorMessage(err, "Failed to load club announcements."));
      }
    } finally {
      if (isRequestCurrent(reqGen, reqIdent)) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, user, currentIdentity, isRequestCurrent]);

  // Load additional older notices from backend beyond initial safety cap (Safe continuation)
  const loadMoreNotices = useCallback(async () => {
    if (!hasMoreBackendPages || !nextBackendPage || loadingMore || loading) return;
    if (!isAuthenticated || user?.role !== "club_operator") return;

    const reqGen = generationRef.current;
    const reqIdent = currentIdentity;

    setLoadingMore(true);
    setActionError("");

    try {
      let accumulated = [...allNotices];
      let pageNum = nextBackendPage;
      let hasMore = true;
      let backendCount = totalBackendCount;
      let hasNextPage = false;
      let nextPg = null;
      let fetchedInBatch = 0;

      while (hasMore && fetchedInBatch < BATCH_PAGE_CAP) {
        if (!isRequestCurrent(reqGen, reqIdent)) return;

        const response = await noticesAPI.getAll({
          mine: true,
          page: pageNum,
          page_size: 50,
        });

        if (!isRequestCurrent(reqGen, reqIdent)) return;

        const data = response.data;
        const results = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [];

        accumulated = accumulated.concat(results);
        fetchedInBatch += 1;

        if (typeof data?.count === "number") {
          backendCount = data.count;
        }

        if (!data?.next || results.length === 0 || accumulated.length >= backendCount) {
          hasMore = false;
          hasNextPage = false;
          nextPg = null;
        } else {
          pageNum += 1;
          nextPg = pageNum;
        }
      }

      if (!isRequestCurrent(reqGen, reqIdent)) return;

      // Deduplicate by ID
      const seen = new Set();
      const uniqueNotices = accumulated.filter((n) => {
        if (!n || !n.id || seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });

      setAllNotices(uniqueNotices);
      setTotalBackendCount(backendCount);
      const isPartial = hasNextPage && uniqueNotices.length < backendCount;
      setHasMoreBackendPages(isPartial);
      setNextBackendPage(isPartial ? nextPg : null);

      if (!isPartial) {
        setActionSuccess(`Successfully loaded all ${uniqueNotices.length.toLocaleString()} club announcements from server.`);
      }
    } catch (err) {
      if (!isRequestCurrent(reqGen, reqIdent)) return;
      setActionError(extractErrorMessage(err, "Failed to load additional announcements from server."));
    } finally {
      if (isRequestCurrent(reqGen, reqIdent)) {
        setLoadingMore(false);
      }
    }
  }, [
    hasMoreBackendPages,
    nextBackendPage,
    loadingMore,
    loading,
    isAuthenticated,
    user,
    currentIdentity,
    isRequestCurrent,
    allNotices,
    totalBackendCount,
  ]);

  // Account-switch & mount handler
  useEffect(() => {
    if (previousIdentityRef.current !== currentIdentity) {
      previousIdentityRef.current = currentIdentity;
      generationRef.current += 1;
      setAllNotices([]);
      setTotalBackendCount(0);
      setHasMoreBackendPages(false);
      setNextBackendPage(null);
      setLoadingMore(false);
      setPage(1);
      setError("");
      setActionSuccess("");
      setActionError("");
      setIsCreateOpen(false);
      setEditingNotice(null);
      setDeletingNotice(null);
    }

    if (!isAuthenticated || user?.role !== "club_operator") {
      setAllNotices([]);
      setTotalBackendCount(0);
      setHasMoreBackendPages(false);
      setNextBackendPage(null);
      setLoading(false);
      return;
    }

    fetchOperatorNotices();
  }, [isAuthenticated, user, currentIdentity, fetchOperatorNotices]);

  // Completeness indicator: true if backend has additional records beyond safety cap
  const isPartiallyLoaded = hasMoreBackendPages && allNotices.length < totalBackendCount;

  // Compute summary metrics across the complete operator notices dataset
  const metrics = useMemo(() => {
    let publicCount = 0;
    let followersCount = 0;
    let membersCount = 0;
    let departmentCount = 0;

    allNotices.forEach((n) => {
      if (n.audience === "public") publicCount += 1;
      else if (n.audience === "followers") followersCount += 1;
      else if (n.audience === "members") membersCount += 1;
      else if (n.audience === "department") departmentCount += 1;
    });

    return {
      total: allNotices.length,
      publicCount,
      followersCount,
      membersCount,
      membersFollowers: followersCount + membersCount,
      departmentCount,
    };
  }, [allNotices]);

  // Audience Tabs for Segmented Control with live count badges
  const audienceTabs = useMemo(
    () => [
      { id: "all", label: "All", count: metrics.total },
      { id: "public", label: "Public", count: metrics.publicCount },
      { id: "followers", label: "Followers", count: metrics.followersCount },
      { id: "members", label: "Members", count: metrics.membersCount },
      { id: "department", label: "Department", count: metrics.departmentCount },
    ],
    [metrics]
  );

  // Filter notices across the complete operator dataset by audience and search query
  const filteredNotices = useMemo(() => {
    return allNotices.filter((n) => {
      if (audienceFilter !== "all" && n.audience !== audienceFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchBody = n.body?.toLowerCase().includes(q);
        const matchDept = n.department?.toLowerCase().includes(q);
        if (!matchTitle && !matchBody && !matchDept) return false;
      }
      return true;
    });
  }, [allNotices, audienceFilter, searchQuery]);

  // Reset pagination to page 1 when search or audience filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, audienceFilter]);

  // Client-side pagination calculations over filtered notices
  const totalFiltered = filteredNotices.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedNotices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredNotices.slice(startIndex, startIndex + pageSize);
  }, [filteredNotices, currentPage, pageSize]);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Handle Create Notice Submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    const errors = {};
    const trimmedTitle = createForm.title.trim();
    const trimmedBody = createForm.body.trim();

    if (!trimmedTitle) {
      errors.title = "Notice title is required.";
    } else if (trimmedTitle.length > 200) {
      errors.title = "Notice title cannot exceed 200 characters.";
    }

    if (!trimmedBody) {
      errors.body = "Notice body text is required.";
    }

    if (createForm.audience === "department") {
      if (departmentsLoading) {
        errors.department = "Please wait for university department data to finish loading.";
      } else if (departmentsError || departments.length === 0) {
        errors.department = "Cannot target department: failed to load university departments. Please click Retry.";
      } else if (!createForm.department) {
        errors.department = "Please select a target academic department.";
      } else if (!departments.includes(createForm.department)) {
        errors.department = "Selected department is not a recognized university department.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreateErrors({});
    setCreateLoading(true);

    const payload = {
      title: trimmedTitle,
      body: trimmedBody,
      audience: createForm.audience,
    };

    // Strictly send department only when audience is "department"
    if (createForm.audience === "department") {
      payload.department = createForm.department;
    }

    try {
      const res = await noticesAPI.create(payload);

      setActionSuccess("Announcement published successfully! Target students have been notified.");
      setIsCreateOpen(false);
      setCreateForm({
        title: "",
        body: "",
        audience: "public",
        department: "",
      });

      // Update state immediately with confirmed backend record
      if (res.data && res.data.id) {
        setAllNotices((prev) => [res.data, ...prev.filter((item) => item.id !== res.data.id)]);
        setTotalBackendCount((prev) => prev + 1);
      } else {
        fetchOperatorNotices();
      }
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to create announcement.");
      setActionError(msg);
      if (err.response?.data && typeof err.response.data === "object") {
        setCreateErrors(err.response.data);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Notice Modal
  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setEditForm({
      title: notice.title || "",
      body: notice.body || "",
    });
    setEditErrors({});
  };

  // Handle Edit Notice Submission (Title and Body only per NoticeUpdateSerializer)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingNotice) return;
    setActionError("");
    setActionSuccess("");

    const errors = {};
    const trimmedTitle = editForm.title.trim();
    const trimmedBody = editForm.body.trim();

    if (!trimmedTitle) {
      errors.title = "Notice title is required.";
    } else if (trimmedTitle.length > 200) {
      errors.title = "Notice title cannot exceed 200 characters.";
    }

    if (!trimmedBody) {
      errors.body = "Notice body text is required.";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditErrors({});
    setEditLoading(true);

    const payload = {
      title: trimmedTitle,
      body: trimmedBody,
    };

    try {
      const res = await noticesAPI.update(editingNotice.id, payload);

      setActionSuccess("Notice updated successfully!");
      setEditingNotice(null);

      // Update notice locally with confirmed backend data
      setAllNotices((prev) =>
        prev.map((item) => (item.id === editingNotice.id ? { ...item, ...res.data } : item))
      );
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to update notice.");
      setActionError(msg);
      if (err.response?.data && typeof err.response.data === "object") {
        setEditErrors(err.response.data);
      }
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Notice Confirmation & API Call (Waits for HTTP 204 confirmation)
  const handleDeleteConfirm = async () => {
    if (!deletingNotice) return;
    setActionError("");
    setActionSuccess("");
    setDeleteLoading(true);

    try {
      await noticesAPI.delete(deletingNotice.id);

      setActionSuccess("Notice deleted successfully.");
      const deletedId = deletingNotice.id;
      setDeletingNotice(null);

      // Remove notice only after confirmed backend deletion
      setAllNotices((prev) => prev.filter((item) => item.id !== deletedId));
      setTotalBackendCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to delete notice. You can only delete your own club's notices.");
      setActionError(msg);
      setDeletingNotice(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clubName = user?.club?.name || user?.name || "Your Society";

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-28 sm:pt-[120px] pb-12 sm:pb-16 bg-canvas-base flex-1">
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-12 flex flex-col gap-6">
          {/* ========================================================================= */}
          {/* 1. EDITORIAL STITCH HEADER                                                */}
          {/* ========================================================================= */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-border-subtle/80">
            <div className="max-w-2xl flex flex-col gap-1">
              {/* Stitch Uppercase Mono Eyebrow */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary font-mono">
                  YOUR CLUB COMMUNITY · OFFICIAL BROADCASTS
                </span>
                <span className="w-6 h-[1px] bg-primary/30" />
              </div>

              {/* Art-Directed Headline with Italic Primary Keyword */}
              <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-on-surface leading-tight">
                Manage your <span className="font-normal italic text-primary">announcements</span>
              </h1>

              <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-0.5">
                Create, publish, and target official campus announcements to student cohorts and club members.
              </p>
            </div>

            {/* Club Context Badge & Compact Action Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              {/* Authenticated Club Context Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-white border border-border-subtle shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-on-surface truncate max-w-[200px] sm:max-w-none">
                  {clubName}
                </span>
                <span className="text-[11px] text-text-muted">· Official Dispatch</span>
              </div>

              {/* Refresh & Create Notice CTAs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchOperatorNotices}
                  disabled={loading || loadingMore}
                  className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Refresh notices from server"
                >
                  <span className={`material-symbols-outlined text-[15px] ${loading ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateErrors({});
                    setIsCreateOpen(true);
                    if (departments.length === 0 && !departmentsLoading) {
                      fetchDepartments();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-resting hover:shadow-primary-glow transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Create New Notice</span>
                </button>
              </div>
            </div>
          </header>

          {/* Feedback Banners */}
          {actionSuccess && (
            <div
              role="status"
              className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-950 text-xs sm:text-sm animate-fadeIn"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                <span className="font-semibold">{actionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccess("")}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded transition"
                aria-label="Dismiss message"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-error-container text-on-error-container border border-error/30 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fadeIn"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">error</span>
                <span className="font-semibold">{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError("")}
                className="text-text-muted hover:text-on-error-container p-0.5 rounded transition"
                aria-label="Dismiss message"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Incomplete Data / Pagination Cap Warning Banner */}
          {isPartiallyLoaded && !loading && (
            <div
              role="status"
              className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 text-xs sm:text-sm animate-fadeIn shadow-xs"
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5 sm:mt-0">
                  history_toggle_off
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="font-bold text-on-surface">
                    Showing the latest {allNotices.length.toLocaleString()} of {totalBackendCount.toLocaleString()} notices.
                  </span>
                  <span className="text-amber-800 text-xs font-medium">
                    Some older notices are not loaded.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={loadMoreNotices}
                disabled={loadingMore}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 shrink-0 self-end sm:self-auto"
                title="Fetch next batch of older notices from server"
              >
                <span className={`material-symbols-outlined text-[15px] ${loadingMore ? "animate-spin" : ""}`}>
                  {loadingMore ? "progress_activity" : "download"}
                </span>
                <span>{loadingMore ? "Loading Older Notices..." : "Load More Records"}</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. COHESIVE LINEAR METRIC RIBBON (Single White Card)                      */}
          {/* ========================================================================= */}
          <section
            aria-label="Notices Overview Summary"
            className="w-full bg-surface-white rounded-2xl border border-border-subtle p-4 sm:p-5 shadow-xs"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle/70 items-center">
              {/* Metric 1: Total / Loaded Notices */}
              <div className="flex items-center gap-3 sm:px-2">
                <div className="w-10 h-10 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight leading-tight">
                      {metrics.total.toLocaleString()}
                    </span>
                    {isPartiallyLoaded && (
                      <span
                        className="text-xs font-semibold text-text-muted"
                        title={`${totalBackendCount.toLocaleString()} total notices on server`}
                      >
                        / {totalBackendCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
                    {isPartiallyLoaded ? "Loaded Notices" : "Total Notices"}
                  </span>
                </div>
              </div>

              {/* Metric 2: Public Notices */}
              <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 tracking-tight leading-tight">
                    {metrics.publicCount.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
                    {isPartiallyLoaded ? "Loaded Public" : "Public Notices"}
                  </span>
                </div>
              </div>

              {/* Metric 3: Members & Followers */}
              <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xl sm:text-2xl font-extrabold text-blue-700 tracking-tight leading-tight">
                    {metrics.membersFollowers.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
                    {isPartiallyLoaded ? "Loaded Members & Followers" : "Members & Followers"}
                  </span>
                </div>
              </div>

              {/* Metric 4: Department Targeted */}
              <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-700 tracking-tight leading-tight">
                    {metrics.departmentCount.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
                    {isPartiallyLoaded ? "Loaded Department" : "Department Targeted"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. UNIFIED SEARCH & AUDIENCE FILTER TOOLBAR                               */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Input Field */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isPartiallyLoaded
                      ? `Search within ${allNotices.length.toLocaleString()} loaded notices...`
                      : "Search notices by title, content, or department..."
                  }
                  className="w-full h-10 pl-10 pr-9 rounded-xl sm:rounded-full bg-surface-white border border-border-subtle text-xs text-on-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-on-surface p-0.5"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Audience Segmented Filter Pills with live item count chips */}
              <div className="inline-flex p-1 bg-surface-lavender/70 rounded-full border border-border-subtle/80 shadow-inner overflow-x-auto max-w-full">
                {audienceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAudienceFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                      audienceFilter === tab.id
                        ? "bg-primary text-white font-bold shadow-xs"
                        : "text-text-muted hover:text-on-surface hover:bg-surface-white/60"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        audienceFilter === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-surface-lavender text-text-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Incomplete Search & Filter Disclosure */}
            {isPartiallyLoaded && !loading && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 rounded-xl bg-surface-lavender/60 border border-border-subtle text-text-muted text-[11px] leading-relaxed">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-[15px] shrink-0">info</span>
                  <span>
                    Search and audience filters apply to the <strong>{allNotices.length.toLocaleString()} loaded notices</strong> only. Older notices might not appear in search results.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadMoreNotices}
                  disabled={loadingMore}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0"
                >
                  <span>Load more records to expand search</span>
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-surface-white rounded-2xl p-5 border border-border-subtle shadow-xs flex flex-col gap-3 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-24 h-4 rounded-full bg-surface-lavender" />
                    <div className="w-32 h-3.5 rounded bg-surface-lavender" />
                  </div>
                  <div className="w-1/2 h-5 rounded bg-surface-lavender" />
                  <div className="w-full h-3.5 rounded bg-surface-lavender/60" />
                  <div className="w-4/5 h-3.5 rounded bg-surface-lavender/60" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8 rounded-2xl bg-surface-white border border-border-subtle text-center flex flex-col items-center justify-center gap-2.5 shadow-xs">
              <span className="material-symbols-outlined text-error text-[36px]">error</span>
              <h3 className="text-sm font-bold text-on-surface">Unable to load announcements</h3>
              <p className="text-xs text-text-muted max-w-md">{error}</p>
              <button
                type="button"
                onClick={fetchOperatorNotices}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span>Retry Request</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. COMPACT QUIET EMPTY STATES                                             */}
          {/* ========================================================================= */}
          {/* Empty State: Operator has zero notices overall */}
          {!loading && !error && allNotices.length === 0 && (
            <div className="py-10 px-6 rounded-2xl bg-surface-white border border-border-subtle text-center flex flex-col items-center justify-center gap-2 shadow-xs">
              <span className="material-symbols-outlined text-text-muted text-[28px] mb-1">campaign</span>
              <h3 className="text-sm font-bold text-on-surface">No notices yet</h3>
              <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                Publish your first announcement to keep your club community informed.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateErrors({});
                  setIsCreateOpen(true);
                  if (departments.length === 0 && !departmentsLoading) {
                    fetchDepartments();
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Create New Notice</span>
              </button>
            </div>
          )}

          {/* Filter Mismatch Empty State: Operator has notices, but none match filters */}
          {!loading && !error && allNotices.length > 0 && filteredNotices.length === 0 && (
            <div className="py-10 px-6 rounded-2xl bg-surface-white border border-border-subtle text-center flex flex-col items-center justify-center gap-2 shadow-xs">
              <span className="material-symbols-outlined text-text-muted text-[28px] mb-1">filter_alt_off</span>
              <h3 className="text-sm font-bold text-on-surface">No matching notices</h3>
              <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                No announcements match your search query or audience filter among the {allNotices.length.toLocaleString()} loaded notices.
                {isPartiallyLoaded
                  ? " Older notices might not be loaded yet."
                  : ' Try clearing your search or switching to "All".'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setAudienceFilter("all");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">clear_all</span>
                  <span>Clear Filters</span>
                </button>
                {isPartiallyLoaded && (
                  <button
                    type="button"
                    onClick={loadMoreNotices}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${loadingMore ? "animate-spin" : ""}`}>
                      {loadingMore ? "progress_activity" : "download"}
                    </span>
                    <span>Load Older Notices</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. REFINED NOTICE CARDS LIST (Clean, compact, no raw UUID)                 */}
          {/* ========================================================================= */}
          {!loading && !error && paginatedNotices.length > 0 && (
            <div className="flex flex-col gap-3.5">
              {paginatedNotices.map((notice) => {
                const badge = getAudienceBadge(notice.audience, notice.department);
                const clubSlug = notice.club?.slug;

                return (
                  <article
                    key={notice.id}
                    className="bg-surface-white rounded-2xl p-4 sm:p-5 border border-border-subtle shadow-xs hover:border-primary/25 hover:shadow-resting transition-all flex flex-col gap-3.5"
                  >
                    {/* Top Row: Audience Badge, Academic Major & Timestamp */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badge.containerClass}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>

                        {notice.audience === "department" && notice.department && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary border border-primary/20 text-[10px] font-semibold">
                            <span className="material-symbols-outlined text-[12px]">school</span>
                            <span>{notice.department}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-text-muted text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <time dateTime={notice.created_at}>
                            {formatDhakaTimestamp(notice.created_at)}
                          </time>
                        </div>

                        {clubSlug && (
                          <Link
                            to={`/clubs/${clubSlug}`}
                            state={{ noticeId: notice.id }}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold ml-1"
                            title="Preview on Public Notice Board"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            <span className="hidden sm:inline">Preview</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Notice Title & Body Text */}
                    <div className="flex flex-col gap-1">
                      <h2 className="text-base sm:text-lg font-bold text-on-surface leading-snug break-words">
                        {notice.title}
                      </h2>
                      <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line break-words">
                        {notice.body}
                      </div>
                    </div>

                    {/* Footer Row: Clean Audience Scope Metadata & Action Buttons (No raw UUID) */}
                    <div className="pt-3 border-t border-border-subtle/80 flex items-center justify-between flex-wrap gap-2.5">
                      {/* Useful Audience Scope Information */}
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          {badge.icon}
                        </span>
                        <span className="font-medium truncate max-w-[280px] sm:max-w-md">
                          {badge.scopeInfo}
                        </span>
                      </div>

                      {/* Management Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(notice)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary text-xs font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingNotice(notice)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border-subtle hover:bg-error-container hover:text-on-error-container text-rose-600 text-xs font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalFiltered > pageSize && (
            <div className="flex items-center justify-between pt-4 border-t border-border-subtle flex-wrap gap-3">
              <span className="text-xs text-text-muted">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered}{" "}
                {isPartiallyLoaded ? "loaded announcements" : "announcements"}
                {(searchQuery.trim() || audienceFilter !== "all") && (
                  <span className="ml-1 text-text-muted">
                    (filtered from {allNotices.length.toLocaleString()} {isPartiallyLoaded ? "loaded notices" : "total"})
                  </span>
                )}
                {isPartiallyLoaded && (
                  <span className="ml-1.5 text-amber-800 font-semibold">
                    · {totalBackendCount.toLocaleString()} total on server
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {isPartiallyLoaded && (
                  <button
                    type="button"
                    onClick={loadMoreNotices}
                    disabled={loadingMore || loading}
                    className="px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    title="Load more older notices from server"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${loadingMore ? "animate-spin" : ""}`}>
                      {loadingMore ? "progress_activity" : "download"}
                    </span>
                    <span>{loadingMore ? "Loading..." : "Load Older Records"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrev || loading}
                  className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors disabled:opacity-50 shadow-xs"
                >
                  Previous
                </button>
                <span className="px-3 py-1 rounded-lg bg-surface-lavender text-primary font-bold text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!hasNext || loading}
                  className="px-3.5 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors disabled:opacity-50 shadow-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 6. REFINED CREATE NOTICE MODAL (max-w-lg, rounded-2xl, p-6)               */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-surface-white rounded-2xl p-6 max-w-lg w-full border border-border-subtle shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Publish New Notice</h2>
                  <p className="text-[11px] text-text-muted">Broadcast official announcements to your club audience.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-text-muted hover:text-on-surface p-1 rounded-full transition"
                aria-label="Close dialog"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Subtle Informational Policy Strip */}
            <div className="p-3 rounded-xl bg-surface-lavender/60 border border-border-subtle text-[11px] text-text-muted flex items-start gap-2 leading-relaxed">
              <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">info</span>
              <div>
                <span className="font-semibold text-on-surface">Broadcast Policy:</span> Notices publish immediately to targeted student feeds. Audience scope and target department cannot be modified after publication.
              </div>
            </div>

            {/* Create Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
              {/* Notice Title */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="create-title" className="text-xs font-bold text-on-surface">
                    Notice Title <span className="text-error">*</span>
                  </label>
                  <span className="text-[11px] text-text-muted font-mono">
                    {createForm.title.length} / 200
                  </span>
                </div>
                <input
                  id="create-title"
                  type="text"
                  maxLength={200}
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Annual Programming Contest 2026 Orientation"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {createErrors.title && (
                  <span className="text-[11px] text-error font-semibold">{createErrors.title}</span>
                )}
              </div>

              {/* Audience Selector */}
              <div className="flex flex-col gap-1">
                <label htmlFor="create-audience" className="text-xs font-bold text-on-surface">
                  Target Audience <span className="text-error">*</span>
                </label>
                <select
                  id="create-audience"
                  value={createForm.audience}
                  onChange={(e) => {
                    const nextAudience = e.target.value;
                    // Reset department whenever audience changes away from 'department' to prevent stale submissions
                    setCreateForm((prev) => ({
                      ...prev,
                      audience: nextAudience,
                      department:
                        nextAudience === "department"
                          ? departments.includes(prev.department)
                            ? prev.department
                            : ""
                          : "",
                    }));
                    if (nextAudience === "department" && departments.length === 0 && !departmentsLoading) {
                      fetchDepartments();
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="public">Public (Everyone on campus)</option>
                  <option value="followers">Followers (Followers &amp; Approved Members)</option>
                  <option value="members">Club Members (Approved roster members only)</option>
                  <option value="department">Department (Students of a specific major)</option>
                </select>
                <span className="text-[11px] text-text-muted">
                  {createForm.audience === "public" && "Visible to all students, visitors, and guest users."}
                  {createForm.audience === "followers" && "Visible only to verified students following or enrolled in your club."}
                  {createForm.audience === "members" && "Strictly restricted to approved members on your official roster."}
                  {createForm.audience === "department" && "Visible to students currently enrolled in the designated academic major."}
                </span>
              </div>

              {/* Department Dropdown & Error/Loading Handler (shown only if audience === "department") */}
              {createForm.audience === "department" && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-lavender/50 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <label htmlFor="create-department" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[15px]">school</span>
                      Target Academic Department <span className="text-error">*</span>
                    </label>
                    {departmentsLoading && (
                      <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
                        <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </span>
                    )}
                  </div>

                  {departmentsError ? (
                    <div className="p-2.5 rounded-lg bg-error-container text-on-error-container border border-error/30 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold flex items-center gap-1 text-[11px]">
                          <span className="material-symbols-outlined text-[15px] text-error">error</span>
                          Failed to load departments
                        </span>
                        <button
                          type="button"
                          onClick={fetchDepartments}
                          disabled={departmentsLoading}
                          className="px-2 py-0.5 rounded-full bg-error text-white font-bold text-[10px] hover:bg-error/90 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <span className={`material-symbols-outlined text-[11px] ${departmentsLoading ? "animate-spin" : ""}`}>
                            refresh
                          </span>
                          <span>Retry</span>
                        </button>
                      </div>
                      <p className="text-[10px] opacity-90">{departmentsError}</p>
                    </div>
                  ) : (
                    <>
                      <select
                        id="create-department"
                        required
                        disabled={departmentsLoading || departments.length === 0}
                        value={createForm.department}
                        onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
                      >
                        <option value="" disabled>
                          {departmentsLoading
                            ? "Loading university departments..."
                            : departments.length === 0
                            ? "No departments available"
                            : "Select university department..."}
                        </option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {createErrors.department && (
                        <span className="text-[11px] text-error font-semibold">{createErrors.department}</span>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Notice Body */}
              <div className="flex flex-col gap-1">
                <label htmlFor="create-body" className="text-xs font-bold text-on-surface">
                  Notice Content &amp; Instructions <span className="text-error">*</span>
                </label>
                <textarea
                  id="create-body"
                  rows={5}
                  required
                  value={createForm.body}
                  onChange={(e) => setCreateForm({ ...createForm, body: e.target.value })}
                  placeholder="Write your complete notice details, agenda, timing, and guidelines here..."
                  className="w-full p-3 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y leading-relaxed"
                />
                {createErrors.body && (
                  <span className="text-[11px] text-error font-semibold">{createErrors.body}</span>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createLoading ||
                    (createForm.audience === "department" &&
                      (departmentsLoading || departments.length === 0 || !createForm.department))
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-resting transition-all disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">send</span>
                      <span>Publish Announcement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. REFINED EDIT NOTICE MODAL (max-w-lg, rounded-2xl, p-6)                 */}
      {/* ========================================================================= */}
      {editingNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-surface-white rounded-2xl p-6 max-w-lg w-full border border-border-subtle shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Edit Announcement</h2>
                  <p className="text-[11px] text-text-muted">Update title and content for this published notice.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="text-text-muted hover:text-on-surface p-1 rounded-full transition"
                aria-label="Close dialog"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Read-Only Audience Scope Info (Compact row per Stitch) */}
            {(() => {
              const b = getAudienceBadge(editingNotice.audience, editingNotice.department);
              return (
                <div className="p-3 rounded-xl bg-surface-lavender/40 border border-border-subtle flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                      <span className="material-symbols-outlined text-text-muted text-[15px]">lock</span>
                      <span>Audience Scope (Immutable):</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${b.containerClass}`}>
                        <span className="material-symbols-outlined text-[12px]">{b.icon}</span>
                        <span>{b.label}</span>
                      </span>
                      {editingNotice.department && editingNotice.audience === "department" && (
                        <span className="text-[11px] text-text-muted font-medium">({editingNotice.department})</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-text-muted leading-relaxed">
                    Audience settings cannot be changed after publication. Only title and text content can be updated.
                  </span>
                </div>
              );
            })()}

            {/* Edit Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5">
              {/* Notice Title */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="edit-title" className="text-xs font-bold text-on-surface">
                    Notice Title <span className="text-error">*</span>
                  </label>
                  <span className="text-[11px] text-text-muted font-mono">
                    {editForm.title.length} / 200
                  </span>
                </div>
                <input
                  id="edit-title"
                  type="text"
                  maxLength={200}
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {editErrors.title && (
                  <span className="text-[11px] text-error font-semibold">{editErrors.title}</span>
                )}
              </div>

              {/* Notice Body */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-body" className="text-xs font-bold text-on-surface">
                  Notice Content <span className="text-error">*</span>
                </label>
                <textarea
                  id="edit-body"
                  rows={5}
                  required
                  value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  className="w-full p-3 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y leading-relaxed"
                />
                {editErrors.body && (
                  <span className="text-[11px] text-error font-semibold">{editErrors.body}</span>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
                  disabled={editLoading}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-resting transition-all disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">save</span>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. REFINED DELETE CONFIRMATION MODAL (max-w-md, rounded-2xl, p-6)         */}
      {/* ========================================================================= */}
      {deletingNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-surface-white rounded-2xl p-6 max-w-md w-full border border-border-subtle shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Delete Announcement?</h2>
                <span className="text-[11px] text-text-muted">This action is permanent and cannot be undone.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-canvas-base border border-border-subtle text-xs text-on-surface-variant flex flex-col gap-1">
              <span className="font-bold text-on-surface line-clamp-2">{deletingNotice.title}</span>
              <span className="text-[11px] text-text-muted">
                Published: {formatDhakaTimestamp(deletingNotice.created_at)}
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Deleting this announcement removes it from the Club Notice Board and cascades deletion to all associated student in-app notifications.
            </p>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingNotice(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-error text-white text-xs font-bold hover:bg-error/90 shadow-xs transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
