import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api, { extractErrorMessage } from "../services/api";
import Navbar from "../components/Navbar";
import LoadingState from "../components/LoadingState";

function getClubIcon(club) {
  if (!club) return "groups";
  const text = `${club.name} ${club.description || ""}`.toLowerCase();
  if (text.includes("it") || text.includes("computer") || text.includes("tech") || text.includes("software")) {
    return "terminal";
  }
  if (text.includes("debate") || text.includes("speech") || text.includes("voice")) {
    return "record_voice_over";
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

export default function MyClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "memberships" | "pending" | "following"
  const [searchQuery, setSearchQuery] = useState("");
  const [followLoading, setFollowLoading] = useState({});

  const fetchMyClubs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/clubs/?page_size=50");
      const results = response.data?.results || response.data || [];
      setClubs(results);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load your club memberships."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyClubs();
  }, [fetchMyClubs]);

  // Subsets based on personal relationship annotations
  const joinedClubs = useMemo(
    () => clubs.filter((c) => c.my_membership === "approved"),
    [clubs]
  );

  const pendingClubs = useMemo(
    () => clubs.filter((c) => c.my_membership === "pending"),
    [clubs]
  );

  const followingClubs = useMemo(
    () => clubs.filter((c) => c.is_following === true),
    [clubs]
  );

  // Union of clubs with any relationship
  const allMyClubs = useMemo(() => {
    const clubMap = new Map();
    [...joinedClubs, ...pendingClubs, ...followingClubs].forEach((c) => {
      clubMap.set(c.slug, c);
    });
    return Array.from(clubMap.values());
  }, [joinedClubs, pendingClubs, followingClubs]);

  const handleFollowToggle = async (club) => {
    const slug = club.slug;
    setFollowLoading((prev) => ({ ...prev, [slug]: true }));

    try {
      if (club.is_following) {
        await api.delete(`/api/clubs/${slug}/follow/`);
        setClubs((prev) =>
          prev.map((c) =>
            c.slug === slug
              ? {
                  ...c,
                  is_following: false,
                  follower_count: Math.max(0, (c.follower_count || 1) - 1),
                }
              : c
          )
        );
      } else {
        const res = await api.post(`/api/clubs/${slug}/follow/`);
        const count = res.data?.follower_count ?? (club.follower_count || 0) + 1;
        setClubs((prev) =>
          prev.map((c) =>
            c.slug === slug
              ? {
                  ...c,
                  is_following: true,
                  follower_count: count,
                }
              : c
          )
        );
      }
    } catch (err) {
      alert(extractErrorMessage(err, "Failed to update follow status."));
    } finally {
      setFollowLoading((prev) => ({ ...prev, [slug]: false }));
    }
  };

  const filteredClubs = useMemo(() => {
    let list = [];
    if (activeFilter === "all") list = allMyClubs;
    else if (activeFilter === "memberships") list = joinedClubs;
    else if (activeFilter === "pending") list = pendingClubs;
    else if (activeFilter === "following") list = followingClubs;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [activeFilter, allMyClubs, joinedClubs, pendingClubs, followingClubs, searchQuery]);

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-12 py-8 flex flex-col gap-8">
          {/* PAGE HEADER (Direct from Stitch Reference) */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
            <div className="flex flex-col max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-lavender w-fit mb-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-bold tracking-wider uppercase">
                  Your Campus Community
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] text-on-surface tracking-tight font-extrabold leading-tight">
                Your clubs,{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  your community.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-text-muted mt-2 leading-relaxed">
                Keep track of your memberships, discover your communities, and stay connected with the clubs you care about at Jagannath University.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
              <Link
                to="/clubs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover hover:shadow-lg transition-all duration-200"
              >
                <span>Explore Clubs</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* MEMBERSHIP OVERVIEW METRICS ROW (3 Cards - Direct from Stitch) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Metric 1: Approved Memberships */}
            <div className="p-6 rounded-2xl bg-surface-white shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-text-muted font-bold block mb-1">
                    Approved Memberships
                  </span>
                  <span className="text-[40px] leading-tight text-on-surface font-extrabold tracking-tight">
                    {joinedClubs.length}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-lavender text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">verified_user</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border-subtle/60">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-text-muted">Official voting &amp; activity access</span>
              </div>
            </div>

            {/* Metric 2: Pending Requests */}
            <div className="p-6 rounded-2xl bg-surface-white shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-text-muted font-bold block mb-1">
                    Pending Requests
                  </span>
                  <span className="text-[40px] leading-tight text-on-surface font-extrabold tracking-tight">
                    {pendingClubs.length}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-container text-on-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border-subtle/60">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="text-xs text-text-muted">Awaiting operator review</span>
              </div>
            </div>

            {/* Metric 3: Following */}
            <div className="p-6 rounded-2xl bg-surface-white shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-text-muted font-bold block mb-1">
                    Following
                  </span>
                  <span className="text-[40px] leading-tight text-on-surface font-extrabold tracking-tight">
                    {followingClubs.length}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">star</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border-subtle/60">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-text-muted">Clubs in your campus feed</span>
              </div>
            </div>
          </div>

          {/* FILTER BAR & VIEW CONTROLS (Direct from Stitch) */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-surface-white p-4 rounded-2xl border border-border-subtle shadow-xs">
            {/* Primary Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0" id="filter-tabs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === "all"
                    ? "bg-surface-lavender text-primary shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                All My Clubs <span className="ml-1 opacity-75">({allMyClubs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("memberships")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === "memberships"
                    ? "bg-surface-lavender text-primary shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                Memberships <span className="ml-1 opacity-75">({joinedClubs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("pending")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === "pending"
                    ? "bg-surface-lavender text-primary shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                Pending Requests <span className="ml-1 opacity-75">({pendingClubs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("following")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === "following"
                    ? "bg-surface-lavender text-primary shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                Following <span className="ml-1 opacity-75">({followingClubs.length})</span>
              </button>
            </div>

            {/* Filter Search Input */}
            <div className="relative min-w-[240px]">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter your clubs..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-canvas-base text-on-surface text-xs focus:outline-none focus:bg-surface-white focus:ring-2 focus:ring-primary/20 transition-all border border-border-subtle/80 placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && <LoadingState message="Loading your club relationships..." />}

          {/* Error Alert */}
          {!loading && error && (
            <div className="p-8 bg-error-container/20 rounded-2xl border border-error-container text-center">
              <span className="material-symbols-outlined text-error text-[32px] mb-2">cloud_off</span>
              <h3 className="text-base font-bold text-on-surface">Unable to load memberships</h3>
              <p className="text-xs text-text-muted mt-1">{error}</p>
              <button
                type="button"
                onClick={fetchMyClubs}
                className="mt-4 px-5 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* EMPTY STATE (Direct from Stitch) */}
          {!loading && !error && filteredClubs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-14 bg-surface-white border border-border-subtle rounded-3xl text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">groups</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-1">
                {activeFilter === "memberships"
                  ? "No approved memberships yet"
                  : activeFilter === "pending"
                  ? "No pending membership applications"
                  : activeFilter === "following"
                  ? "You are not following any clubs yet"
                  : "No clubs in this view"}
              </h3>
              <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
                Explore the campus club registry to discover research societies, debating circles, cultural groups, and athletic teams.
              </p>
              <Link
                to="/clubs"
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <span>Browse Club Directory</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          )}

          {/* MAIN CLUBS GRID (LIVE DATA - Direct from Stitch) */}
          {!loading && !error && filteredClubs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club) => {
                const icon = getClubIcon(club);

                return (
                  <div
                    key={club.slug}
                    className="p-6 rounded-2xl bg-surface-white shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header: Logo, Chartered, Member status */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[28px]">{icon}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-secondary-container text-[11px] font-semibold">
                            Chartered
                          </span>
                          {club.my_membership === "approved" && (
                            <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Approved Member
                            </span>
                          )}
                          {club.my_membership === "pending" && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                              Request Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Titles & Meta */}
                      <div className="mb-2">
                        <h3 className="text-lg font-bold text-on-surface tracking-tight truncate">
                          {club.name}
                        </h3>
                        <span className="text-xs text-text-muted mt-0.5 block">@{club.slug}</span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-text-muted line-clamp-2 mb-4 leading-relaxed">
                        {club.description || "Official university student society promoting talent, research, and campus community engagement."}
                      </p>

                      {/* Metrics line */}
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant py-2 px-3 rounded-xl bg-surface-container-low mb-4">
                        <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                        <span>{club.follower_count || 0} Followers</span>
                        <span className="text-outline-variant">•</span>
                        <span>{club.member_count || 0} Members</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle/60">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to={`/clubs/${club.slug}`}
                          className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-lavender text-on-surface text-xs font-semibold text-center transition-colors"
                        >
                          View Club
                        </Link>
                        <Link
                          to={`/clubs/${club.slug}`}
                          className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-variant text-primary text-xs font-semibold text-center transition-colors"
                        >
                          Details
                        </Link>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFollowToggle(club)}
                        disabled={followLoading[club.slug]}
                        className={`w-full py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          club.is_following
                            ? "bg-surface-lavender text-primary hover:bg-surface-variant"
                            : "bg-surface-white border border-border-subtle text-on-surface hover:bg-surface-lavender"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {club.is_following ? "check" : "add"}
                        </span>
                        <span>{club.is_following ? "Following" : "Follow"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
