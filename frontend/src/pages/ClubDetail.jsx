import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { extractErrorMessage, noticesAPI } from "../services/api";
import Navbar from "../components/Navbar";
import LoadingState from "../components/LoadingState";

function getClubIcon(club) {
  if (!club) return "groups";
  const text = `${club.name} ${club.description || ""}`.toLowerCase();
  if (text.includes("it") || text.includes("computer") || text.includes("tech") || text.includes("code") || text.includes("software")) {
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

function getCategoryLabel(club) {
  if (!club) return "Campus Society";
  const text = `${club.name} ${club.description || ""}`.toLowerCase();
  if (text.includes("it") || text.includes("computer") || text.includes("tech")) return "STEM & Tech";
  if (text.includes("debate") || text.includes("speech")) return "Academic & Debate";
  if (text.includes("photo") || text.includes("art")) return "Cultural & Arts";
  if (text.includes("sport")) return "Sports & Athletics";
  if (text.includes("research")) return "Research & Science";
  return "Student Society";
}

/**
 * Format ISO timestamps to Asia/Dhaka (+06:00 BST) date string.
 * Example: "Nov 4, 2026 • 05:30 PM BST"
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
      };
    case "followers":
      return {
        label: "Followers",
        icon: "visibility",
        containerClass: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "members":
      return {
        label: "Club Members",
        icon: "groups",
        containerClass: "bg-purple-50 text-purple-800 border-purple-200",
      };
    case "department":
      return {
        label: department ? `Department: ${department}` : "Department",
        icon: "school",
        containerClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    default:
      return {
        label: audience ? audience.charAt(0).toUpperCase() + audience.slice(1) : "Notice",
        icon: "campaign",
        containerClass: "bg-surface-lavender text-primary border-primary/20",
      };
  }
}

/**
 * Skeleton loading cards for notice board.
 */
function NoticeSkeletons() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-canvas-base/50 border border-border-subtle/80 flex flex-col gap-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="w-24 h-5 rounded-full bg-surface-lavender/80" />
            <div className="w-28 h-4 rounded bg-surface-lavender/60" />
          </div>
          <div className="w-3/4 h-5 rounded bg-surface-lavender/80" />
          <div className="space-y-2 pt-1">
            <div className="w-full h-3.5 rounded bg-surface-lavender/50" />
            <div className="w-5/6 h-3.5 rounded bg-surface-lavender/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClubDetail() {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [club, setClub] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [followLoading, setFollowLoading] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Operator Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: "",
    logo: "",
    contact_email: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Notice Board State
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState("");
  const [noticesPage, setNoticesPage] = useState(1);
  const [noticesTotalCount, setNoticesTotalCount] = useState(0);
  const [hasMoreNotices, setHasMoreNotices] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [highlightedNoticeId, setHighlightedNoticeId] = useState(null);

  const noticeReqGenRef = useRef(0);

  const currentIdentity =
    isAuthenticated && user
      ? `${user.id ?? user.email ?? "auth"}:${user.role ?? "user"}`
      : "anonymous";

  const identityRef = useRef(currentIdentity);
  identityRef.current = currentIdentity;

  const targetNoticeId =
    location.state?.noticeId ||
    new URLSearchParams(location.search).get("notice") ||
    new URLSearchParams(location.search).get("notice_id");

  const fetchClubData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/api/clubs/${slug}/`);
      const clubData = response.data;
      setClub(clubData);
      setEditFormData({
        description: clubData.description || "",
        logo: clubData.logo || "",
        contact_email: clubData.contact_email || "",
      });

      if (isAuthenticated && user?.role === "student") {
        try {
          const memRes = await api.get(`/api/clubs/${slug}/membership/`);
          setMembershipStatus(memRes.data?.status || null);
        } catch {
          setMembershipStatus(clubData.my_membership || null);
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load club profile."));
    } finally {
      setLoading(false);
    }
  }, [slug, isAuthenticated, user]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  // Fetch Notices for the current club (audience visibility handled by backend)
  const fetchNotices = useCallback(
    async (pageNumber = 1, isLoadMore = false) => {
      if (!slug) return;
      const currentGen = ++noticeReqGenRef.current;
      const requestIdentity = currentIdentity;
      const requestSlug = slug;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setNoticesLoading(true);
        setNoticesError("");
      }

      try {
        const response = await noticesAPI.getAll({
          club: slug,
          page: pageNumber,
          page_size: 5,
        });

        if (
          currentGen !== noticeReqGenRef.current ||
          requestSlug !== slug ||
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
        const count = typeof data?.count === "number" ? data.count : newResults.length;
        const hasNext = Boolean(data?.next);

        // If targetNoticeId is specified on initial load and not present in page 1,
        // attempt to fetch the specific notice so it can be highlighted, strictly verifying club ownership
        if (targetNoticeId && !isLoadMore && !newResults.some((n) => n.id === targetNoticeId)) {
          try {
            const singleNoticeRes = await noticesAPI.getById(targetNoticeId);

            // Verify the request still belongs to the active generation, slug, and authenticated identity
            if (
              currentGen === noticeReqGenRef.current &&
              requestSlug === slug &&
              requestIdentity === identityRef.current
            ) {
              const noticeData = singleNoticeRes.data;
              const noticeClub = noticeData?.club;
              const noticeClubSlug =
                typeof noticeClub === "object" ? noticeClub?.slug : noticeClub;

              // Strictly verify that the notice belongs to the currently displayed club
              if (noticeData && noticeClubSlug && noticeClubSlug === slug) {
                newResults.unshift(noticeData);
              }
            }
          } catch {
            // Notice is deleted, inaccessible, outside audience permissions, or mismatched; ignore gracefully
          }
        }

        if (
          currentGen !== noticeReqGenRef.current ||
          requestSlug !== slug ||
          requestIdentity !== identityRef.current
        ) {
          return;
        }

        if (isLoadMore) {
          setNotices((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const filteredNew = newResults.filter((n) => !existingIds.has(n.id));
            return [...prev, ...filteredNew];
          });
        } else {
          setNotices(newResults);
        }

        setNoticesPage(pageNumber);
        setNoticesTotalCount(count);
        setHasMoreNotices(hasNext);
      } catch (err) {
        if (
          currentGen !== noticeReqGenRef.current ||
          requestSlug !== slug ||
          requestIdentity !== identityRef.current
        ) {
          return;
        }
        const errorMsg = extractErrorMessage(err, "Failed to load club announcements.");
        if (isLoadMore) {
          setFeedback({ type: "error", text: errorMsg });
        } else {
          setNoticesError(errorMsg);
        }
      } finally {
        if (
          currentGen === noticeReqGenRef.current &&
          requestSlug === slug &&
          requestIdentity === identityRef.current
        ) {
          setNoticesLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [slug, targetNoticeId, currentIdentity]
  );

  // Load next page of notices without duplicating entries
  const handleLoadMore = () => {
    if (loadingMore || !hasMoreNotices) return;
    fetchNotices(noticesPage + 1, true);
  };

  // Reset notice state on club slug change
  useEffect(() => {
    setNotices([]);
    setNoticesPage(1);
    setNoticesTotalCount(0);
    setHasMoreNotices(false);
    setNoticesError("");
    setHighlightedNoticeId(null);
  }, [slug]);

  // Initial and reactive fetch of notices on mount, club change, auth change, follow, or membership updates
  useEffect(() => {
    fetchNotices(1, false);
  }, [fetchNotices, isAuthenticated, user, club?.is_following, membershipStatus]);

  // Scroll to and highlight notice card if arriving from notifications or query param
  useEffect(() => {
    if (!targetNoticeId || noticesLoading) return;
    const match = notices.find((n) => n.id === targetNoticeId);
    if (match) {
      // Club ownership verification before highlighting:
      const noticeClub = match.club;
      const noticeClubSlug = typeof noticeClub === "object" ? noticeClub?.slug : noticeClub;
      if (noticeClubSlug && noticeClubSlug !== slug) {
        return;
      }

      setHighlightedNoticeId(targetNoticeId);
      const timer = setTimeout(() => {
        const el = document.getElementById(`notice-${targetNoticeId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetNoticeId, noticesLoading, notices, slug]);

  // Handle Follow / Unfollow Toggle
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/clubs/${slug}` } } });
      return;
    }

    if (user?.role === "club_operator") {
      setFeedback({
        type: "info",
        text: "Club operators cannot follow societies. Please log in with a Student account.",
      });
      return;
    }

    setFollowLoading(true);
    try {
      if (club.is_following) {
        await api.delete(`/api/clubs/${slug}/follow/`);
        setClub((prev) => ({
          ...prev,
          is_following: false,
          follower_count: Math.max(0, (prev.follower_count || 1) - 1),
        }));
        setFeedback({ type: "success", text: `You unfollowed ${club.name}.` });
      } else {
        const res = await api.post(`/api/clubs/${slug}/follow/`);
        const count = res.data?.follower_count ?? (club.follower_count || 0) + 1;
        setClub((prev) => ({
          ...prev,
          is_following: true,
          follower_count: count,
        }));
        setFeedback({ type: "success", text: `You are now following ${club.name}!` });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(err, "Failed to update follow status."),
      });
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle Membership Application Request
  const handleRequestMembership = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/clubs/${slug}` } } });
      return;
    }

    if (user?.role !== "student") {
      setFeedback({
        type: "info",
        text: "Only verified JnU students can apply for club membership.",
      });
      return;
    }

    setMembershipLoading(true);
    try {
      const res = await api.post(`/api/clubs/${slug}/membership/`);
      setMembershipStatus(res.data?.status || "pending");
      setFeedback({
        type: "success",
        text: "Your membership application has been submitted to the executive committee!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(err, "Failed to submit membership request."),
      });
    } finally {
      setMembershipLoading(false);
    }
  };

  // Handle Cancel / Leave Membership
  const handleCancelMembership = async () => {
    if (!window.confirm("Are you sure you want to withdraw your membership or application?")) {
      return;
    }

    setMembershipLoading(true);
    try {
      await api.delete(`/api/clubs/${slug}/membership/`);
      setMembershipStatus("left");
      setFeedback({
        type: "info",
        text: "Your membership status with this society has been updated.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(err, "Failed to cancel membership."),
      });
    } finally {
      setMembershipLoading(false);
    }
  };

  // Handle Operator Profile Update
  const handleOperatorSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");

    try {
      const payload = {
        description: editFormData.description.trim(),
        logo: editFormData.logo.trim(),
        contact_email: editFormData.contact_email.trim(),
      };
      const res = await api.patch(`/api/clubs/${slug}/`, payload);
      setClub(res.data);
      setIsEditing(false);
      setFeedback({
        type: "success",
        text: "Club profile updated successfully!",
      });
    } catch (err) {
      setEditError(extractErrorMessage(err, "Failed to update profile."));
    } finally {
      setEditLoading(false);
    }
  };

  const isOperatorOfThisClub = user?.role === "club_operator" && user?.name === club?.name;

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        {/* Floating Notification Banner */}
        {feedback && (
          <div className="fixed top-24 right-6 z-50 max-w-md animate-fadeIn">
            <div
              className={`p-4 rounded-2xl shadow-lg border flex items-center gap-3 ${
                feedback.type === "error"
                  ? "bg-error-container text-on-error-container border-error/30"
                  : feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-surface-white text-on-surface border-border-subtle"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {feedback.type === "error" ? "error" : feedback.type === "success" ? "check_circle" : "info"}
              </span>
              <p className="text-xs font-semibold leading-relaxed flex-1">
                {feedback.text}
              </p>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-text-muted hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-8 flex flex-col gap-8">
          {/* Loading View */}
          {loading && <LoadingState message="Loading club profile details..." />}

          {/* Error View */}
          {!loading && error && (
            <div className="p-12 bg-surface-white border border-border-subtle rounded-3xl text-center max-w-xl mx-auto my-8">
              <span className="material-symbols-outlined text-error text-[40px] mb-3">error</span>
              <h2 className="text-xl font-bold text-on-surface">Club Not Found</h2>
              <p className="text-xs text-text-muted mt-2">{error}</p>
              <Link
                to="/clubs"
                className="mt-6 inline-flex px-6 py-2.5 rounded-full bg-primary text-white text-xs font-bold"
              >
                Back to Explore Clubs
              </Link>
            </div>
          )}

          {/* Loaded Club Content */}
          {!loading && !error && club && (
            <>
              {/* Page Header (Editorial & Minimalist - Direct from Stitch) */}
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-border-subtle/70">
                <div className="flex flex-col gap-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary font-bold text-xs uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Verified Campus Guild
                    </span>
                    <span className="text-text-muted text-xs">· Official Registry</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
                    {club.name}
                  </h1>
                  <p className="text-sm text-text-muted mt-0.5">
                    Official Jagannath University society profile and student engagement registry.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to="/clubs"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary font-semibold text-xs transition-all shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>All Campus Clubs</span>
                  </Link>
                </div>
              </header>

              {/* Asymmetrical 2-Column Content Layout (Direct from Stitch) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: Profile Context & Edit Area (~60% / 7 cols) */}
                <section className="lg:col-span-7 flex flex-col gap-6">
                  {/* Verification Status Banner (Direct from Stitch) */}
                  <div className="p-4 rounded-2xl bg-surface-lavender/60 border border-border-subtle flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <span className="material-symbols-outlined text-[20px]">verified</span>
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface">Verified Student Guild</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active Charter
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-canvas-base text-text-muted border border-border-subtle text-[11px] font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">lock</span>Read-only Tier
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Chartered by Jagannath University Proctorial &amp; Student Guild Board. Verification standing is officially synchronized.
                      </p>
                    </div>
                  </div>

                  {/* Main Profile Info or Operator Editor Form */}
                  <div className="bg-surface-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle flex flex-col gap-6">
                    {/* Header Row */}
                    <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                      <div>
                        <h2 className="text-base font-bold text-on-surface">
                          {isEditing ? "Edit Society Profile" : "About This Society"}
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">
                          {isEditing ? "Update public description and correspondence contacts." : "Charter information visible to all students."}
                        </p>
                      </div>

                      {isOperatorOfThisClub && !isEditing && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-1.5 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Edit Profile
                        </button>
                      )}
                    </div>

                    {/* OPERATOR EDIT FORM */}
                    {isEditing ? (
                      <form onSubmit={handleOperatorSave} className="flex flex-col gap-5">
                        {editError && (
                          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
                            {editError}
                          </div>
                        )}

                        {/* Read-Only Club Name */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                              Official Chartered Club Name
                              <span className="material-symbols-outlined text-text-muted text-[14px]">lock</span>
                            </label>
                            <span className="text-[11px] text-text-muted">Managed by Registrar</span>
                          </div>
                          <div className="w-full h-11 px-4 flex items-center bg-surface-container-low rounded-xl border border-border-subtle text-xs text-text-muted select-none">
                            {club.name}
                          </div>
                        </div>

                        {/* Club Description Textarea */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-on-surface">
                              Club Mission &amp; Overview
                            </label>
                            <span className="text-[11px] text-text-muted font-mono">
                              {editFormData.description.length} / 600
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            maxLength={600}
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            className="w-full p-3 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                            placeholder="Describe your society's objectives, workshops, and activities..."
                          />
                        </div>

                        {/* Public Contact Email */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-on-surface">
                            Public Contact Email
                          </label>
                          <input
                            type="email"
                            value={editFormData.contact_email}
                            onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="e.g. contact@jnuit.org"
                          />
                        </div>

                        {/* Form Action Controls */}
                        <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface hover:bg-surface-lavender transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={editLoading}
                            className="px-6 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            {editLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* READ-ONLY VIEW (Students & Visitors) */
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                            Mission Statement
                          </span>
                          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                            {club.description || "Official university student society promoting talent, research, and campus community engagement."}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                          <div className="p-3.5 rounded-xl bg-canvas-base border border-border-subtle/80 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-lavender flex items-center justify-center text-primary shrink-0">
                              <span className="material-symbols-outlined text-[18px]">mail</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] text-text-muted">Public Contact</span>
                              <span className="text-xs font-semibold text-on-surface truncate">
                                {club.contact_email || "Registrar Verified"}
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-canvas-base border border-border-subtle/80 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-lavender flex items-center justify-center text-primary shrink-0">
                              <span className="material-symbols-outlined text-[18px]">verified</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] text-text-muted">Affiliation</span>
                              <span className="text-xs font-semibold text-on-surface truncate">
                                Jagannath University
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Operator Manage Members Quick Jump */}
                        {isOperatorOfThisClub && (
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-on-surface">Member Roster Console</span>
                                <span className="text-[11px] text-text-muted">Review applications and approved roster.</span>
                              </div>
                            </div>
                            <Link
                              to={`/clubs/${club.slug}/members`}
                              className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors"
                            >
                              Manage Members
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NOTICE BOARD SECTION */}
                  <div
                    id="notice-board"
                    className="bg-surface-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle flex flex-col gap-6"
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-border-subtle flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[22px]">campaign</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-on-surface">Notice Board</h2>
                            {noticesTotalCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-surface-lavender text-primary font-bold text-[11px]">
                                {noticesTotalCount} {noticesTotalCount === 1 ? "notice" : "notices"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            Stay informed with the latest announcements from this club.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Loading Skeleton View */}
                    {noticesLoading && <NoticeSkeletons />}

                    {/* Error State with Retry Button */}
                    {!noticesLoading && noticesError && (
                      <div className="p-6 rounded-2xl bg-error-container/30 border border-error/20 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-error-container text-on-error-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px]">error</span>
                        </div>
                        <div className="flex flex-col gap-1 max-w-md">
                          <h3 className="text-sm font-bold text-on-surface">Unable to load announcements</h3>
                          <p className="text-xs text-text-muted leading-relaxed">{noticesError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchNotices(1, false)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">refresh</span>
                          <span>Retry</span>
                        </button>
                      </div>
                    )}

                    {/* Empty State */}
                    {!noticesLoading && !noticesError && notices.length === 0 && (
                      <div className="py-12 px-6 rounded-2xl bg-canvas-base/60 border border-border-subtle text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-3 shadow-xs">
                          <span className="material-symbols-outlined text-[26px]">campaign</span>
                        </div>
                        <h3 className="text-sm font-bold text-on-surface">No announcements yet</h3>
                        <p className="text-xs text-text-muted max-w-sm mt-1 leading-relaxed">
                          This club hasn't published any notices yet. Check back later for updates.
                        </p>
                      </div>
                    )}

                    {/* Notice Cards List */}
                    {!noticesLoading && !noticesError && notices.length > 0 && (
                      <div className="flex flex-col gap-4">
                        {notices.map((notice) => {
                          const badge = getAudienceBadge(notice.audience, notice.department);
                          const isHighlighted = highlightedNoticeId === notice.id;

                          return (
                            <article
                              key={notice.id}
                              id={`notice-${notice.id}`}
                              className={`p-5 rounded-2xl border transition-all flex flex-col gap-3 ${
                                isHighlighted
                                  ? "bg-primary/[0.03] border-primary/40 ring-2 ring-primary/20 shadow-md"
                                  : "bg-surface-white hover:bg-canvas-base/40 border-border-subtle shadow-xs"
                              }`}
                            >
                              {/* Top Meta Row */}
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.containerClass}`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {badge.icon}
                                    </span>
                                    <span>{badge.label}</span>
                                  </span>

                                  {isHighlighted && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                                      <span className="material-symbols-outlined text-[12px]">star</span>
                                      <span>Highlighted Announcement</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  <time dateTime={notice.created_at}>
                                    {formatDhakaTimestamp(notice.created_at)}
                                  </time>
                                </div>
                              </div>

                              {/* Notice Title */}
                              <h3 className="text-base font-bold text-on-surface leading-snug break-words">
                                {notice.title}
                              </h3>

                              {/* Notice Body */}
                              <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line break-words">
                                {notice.body}
                              </div>
                            </article>
                          );
                        })}

                        {/* Load More Pagination */}
                        {hasMoreNotices && (
                          <div className="pt-2 flex flex-col items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleLoadMore}
                              disabled={loadingMore}
                              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                            >
                              {loadingMore ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  <span>Loading announcements...</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                  <span>Load More Announcements</span>
                                </>
                              )}
                            </button>
                            <span className="text-[11px] text-text-muted">
                              Showing {notices.length} of {noticesTotalCount} announcements
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* RIGHT COLUMN: Live Public Preview / Student Viewport (~40% / 5 cols) */}
                <aside className="lg:col-span-5 flex flex-col gap-4 sticky top-24">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">visibility</span>
                      <h2 className="text-sm font-bold text-on-surface">Student Viewport</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-lavender text-primary text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Mirror
                    </span>
                  </div>

                  {/* Student Mirror Card (Direct from Stitch) */}
                  <div className="bg-surface-white rounded-2xl border border-border-subtle shadow-md overflow-hidden relative">
                    {/* Cover Banner Area */}
                    <div className="h-32 w-full relative overflow-hidden flex items-end justify-end p-3 rounded-t-2xl bg-gradient-to-r from-primary to-primary-hover">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <span className="relative z-10 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-wide border border-white/20">
                        {getCategoryLabel(club)}
                      </span>
                    </div>

                    {/* Card Body Content */}
                    <div className="px-6 pb-6 pt-0 relative flex flex-col gap-4">
                      {/* Avatar overlapping banner */}
                      <div className="flex items-end justify-between -mt-10">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-2xl bg-surface-white border-4 border-surface-white shadow-md flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-[34px] text-primary">
                              {getClubIcon(club)}
                            </span>
                          </div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary border-2 border-surface-white flex items-center justify-center text-white shadow-xs">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-surface-lavender text-primary text-[11px] font-bold">
                            Chartered
                          </span>
                        </div>
                      </div>

                      {/* Title & Affiliation */}
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-on-surface leading-tight">
                          {club.name}
                        </h3>
                        <span className="text-xs text-text-muted mt-0.5">
                          @{club.slug} · Jagannath University
                        </span>
                      </div>

                      {/* Metrics Ribbon (Direct from Stitch) */}
                      <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-canvas-base border border-border-subtle text-center">
                        <div className="flex flex-col">
                          <span className="text-base font-extrabold text-on-surface">
                            {club.member_count || 0}
                          </span>
                          <span className="text-[11px] text-text-muted">Members</span>
                        </div>
                        <div className="flex flex-col border-x border-border-subtle">
                          <span className="text-base font-extrabold text-on-surface">
                            {club.follower_count || 0}
                          </span>
                          <span className="text-[11px] text-text-muted">Followers</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-extrabold text-emerald-600 flex items-center justify-center gap-0.5">
                            <span className="material-symbols-outlined text-[15px]">verified_user</span>
                          </span>
                          <span className="text-[11px] text-text-muted">Guild Tier</span>
                        </div>
                      </div>

                      {/* Snippet Description */}
                      <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">
                        {isEditing ? editFormData.description || "Club description..." : club.description || "Official student society."}
                      </p>

                      {/* Public Contact Row */}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-lavender/40 border border-border-subtle/60 text-xs">
                        <span className="material-symbols-outlined text-primary text-[16px]">mail</span>
                        <span className="text-text-muted">Contact:</span>
                        <span className="font-semibold text-primary truncate">
                          {isEditing ? editFormData.contact_email || "contact@jnu.ac.bd" : club.contact_email || "Official Channel"}
                        </span>
                      </div>

                      {/* Action Controls for Students & Visitors */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
                        {/* Follow / Following Button */}
                        <button
                          type="button"
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                            club.is_following
                              ? "bg-surface-lavender hover:bg-surface-variant text-primary"
                              : "bg-surface-white hover:bg-surface-lavender text-on-surface border border-border-subtle"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {club.is_following ? "check" : "add"}
                          </span>
                          <span>{club.is_following ? "Following Society" : "Follow Society"}</span>
                        </button>

                        {/* Membership Action Controls */}
                        {membershipStatus === "approved" ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              Enrolled Member
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelMembership}
                              disabled={membershipLoading}
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              Leave Club
                            </button>
                          </div>
                        ) : membershipStatus === "pending" ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                              Application Pending
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelMembership}
                              disabled={membershipLoading}
                              className="text-[11px] font-semibold text-text-muted hover:text-rose-600"
                            >
                              Withdraw
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRequestMembership}
                            disabled={membershipLoading}
                            className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">person_add</span>
                            <span>{membershipLoading ? "Submitting..." : "Request Membership"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
