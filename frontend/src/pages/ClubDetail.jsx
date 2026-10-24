import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { extractErrorMessage } from "../services/api";
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

export default function ClubDetail() {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
