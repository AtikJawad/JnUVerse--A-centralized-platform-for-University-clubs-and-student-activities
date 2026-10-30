import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { extractErrorMessage } from "../services/api";
import Navbar from "../components/Navbar";

// Stitch Explore Clubs Filter Categories (Exact order from Reference Image)
const CATEGORIES = [
  { id: "all", label: "All Clubs" },
  { id: "academic", label: "Academic" },
  { id: "cultural", label: "Cultural" },
  { id: "sports", label: "Sports" },
  { id: "social", label: "Social & Volunteering" },
  { id: "technology", label: "Technology" },
];

/**
 * Returns a Stitch-style icon, badge, and color palette based on club name / description
 */
function getClubTheme(club) {
  const text = `${club.name || ""} ${club.description || ""} ${club.department || ""}`.toLowerCase();

  if (text.includes("it") || text.includes("computer") || text.includes("tech") || text.includes("code") || text.includes("software")) {
    return {
      icon: "terminal",
      iconBg: "bg-tertiary-fixed text-primary",
      category: "Technology & Innovation",
      categoryColor: "text-primary",
      deptBadge: "bg-canvas-base text-primary",
      deptDefault: "Faculty of Science",
      badgeType: "Chartered",
    };
  }
  if (text.includes("debate") || text.includes("speech") || text.includes("forum")) {
    return {
      icon: "forum",
      iconBg: "bg-secondary-fixed text-secondary",
      category: "Academic & Debate",
      categoryColor: "text-secondary",
      deptBadge: "bg-canvas-base text-secondary",
      deptDefault: "Arts & Law",
      badgeType: "Chartered",
    };
  }
  if (text.includes("photo") || text.includes("camera")) {
    return {
      icon: "photo_camera",
      iconBg: "bg-orange-100 text-amber-800",
      category: "Cultural & Visual Arts",
      categoryColor: "text-amber-700",
      deptBadge: "bg-canvas-base text-amber-900",
      deptDefault: "Fine Arts",
      badgeType: "Chartered",
    };
  }
  if (text.includes("drama") || text.includes("culture") || text.includes("theater") || text.includes("music") || text.includes("performing")) {
    return {
      icon: "theater_comedy",
      iconBg: "bg-pink-100 text-pink-700",
      category: "Cultural & Performing Arts",
      categoryColor: "text-pink-700",
      deptBadge: "bg-canvas-base text-pink-700",
      deptDefault: "Campus Wide",
      badgeType: "Official Wing",
    };
  }
  if (text.includes("scout") || text.includes("rover") || text.includes("volunteer") || text.includes("welfare") || text.includes("blood") || text.includes("relief")) {
    return {
      icon: "volunteer_activism",
      iconBg: "bg-emerald-100 text-emerald-800",
      category: "Social & Volunteering",
      categoryColor: "text-emerald-700",
      deptBadge: "bg-canvas-base text-emerald-800",
      deptDefault: "Student Affairs",
      badgeType: "Chartered",
    };
  }
  if (text.includes("career") || text.includes("business") || text.includes("case")) {
    return {
      icon: "business_center",
      iconBg: "bg-secondary-fixed text-primary",
      category: "Career & Academic",
      categoryColor: "text-primary",
      deptBadge: "bg-canvas-base text-primary",
      deptDefault: "Business Studies",
      badgeType: "Verified",
    };
  }
  if (text.includes("science") || text.includes("research") || text.includes("biology") || text.includes("chemistry")) {
    return {
      icon: "biotech",
      iconBg: "bg-sky-100 text-sky-800",
      category: "Academic & Research",
      categoryColor: "text-sky-700",
      deptBadge: "bg-canvas-base text-sky-800",
      deptDefault: "Life & Earth Sciences",
      badgeType: "Chartered",
    };
  }
  if (text.includes("sport") || text.includes("cricket") || text.includes("football") || text.includes("athletic") || text.includes("fitness")) {
    return {
      icon: "sports_cricket",
      iconBg: "bg-orange-100 text-orange-800",
      category: "Athletics & Fitness",
      categoryColor: "text-orange-700",
      deptBadge: "bg-canvas-base text-orange-800",
      deptDefault: "Physical Education",
      badgeType: "Official Society",
    };
  }
  if (text.includes("film") || text.includes("movie") || text.includes("cinema") || text.includes("screenwriting")) {
    return {
      icon: "movie",
      iconBg: "bg-rose-100 text-rose-800",
      category: "Cultural & Screenwriting",
      categoryColor: "text-rose-700",
      deptBadge: "bg-canvas-base text-rose-800",
      deptDefault: "Arts & Media",
      badgeType: "Verified",
    };
  }
  return {
    icon: "groups",
    iconBg: "bg-surface-lavender text-primary",
    category: "Campus Community",
    categoryColor: "text-primary",
    deptBadge: "bg-canvas-base text-primary",
    deptDefault: "Student Affairs",
    badgeType: "Chartered",
  };
}

export default function ExploreClubs() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Fetch clubs from DRF backend
  const fetchClubs = useCallback(
    async (currentPage = 1, search = "") => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
        };
        if (search.trim()) {
          params.search = search.trim();
        }

        const response = await api.get("/api/clubs/", { params });
        const data = response.data;

        if (Array.isArray(data)) {
          setClubs(data);
          setTotalCount(data.length);
        } else if (data?.results) {
          setClubs(data.results);
          setTotalCount(data.count || data.results.length);
        } else {
          setClubs([]);
          setTotalCount(0);
        }
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to load club directory."));
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchClubs(page, searchQuery);
  }, [fetchClubs, page, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setActiveCategory("all");
    setPage(1);
  };

  // Follow / Unfollow Toggle
  const handleFollowToggle = async (club) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/clubs" } } });
      return;
    }

    if (user?.role === "club_operator") {
      setFeedbackMessage({
        type: "info",
        text: "Club operators cannot follow societies. Please log in with a Student account.",
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

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
        const updatedCount = res.data?.follower_count ?? (club.follower_count || 0) + 1;
        setClubs((prev) =>
          prev.map((c) =>
            c.slug === slug
              ? {
                  ...c,
                  is_following: true,
                  follower_count: updatedCount,
                }
              : c
          )
        );
      }
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: extractErrorMessage(err, "Failed to update follow status."),
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [slug]: false }));
    }
  };

  // Client-side category filtering and sorting against verified API attributes
  const filteredClubs = useMemo(() => {
    let result = [...clubs];

    // Real-time client search filter if user types in search box
    const query = (searchQuery || searchInput).toLowerCase().trim();
    if (query) {
      result = result.filter((c) => {
        const text = `${c.name || ""} ${c.description || ""} ${c.slug || ""} ${c.department || ""}`.toLowerCase();
        return text.includes(query);
      });
    }

    // Category filter according to Stitch category pills
    if (activeCategory !== "all") {
      result = result.filter((c) => {
        const text = `${c.name || ""} ${c.description || ""} ${c.department || ""}`.toLowerCase();
        if (activeCategory === "technology") {
          return text.includes("it") || text.includes("tech") || text.includes("computer") || text.includes("software") || text.includes("code") || text.includes("cyber");
        }
        if (activeCategory === "academic") {
          return text.includes("academic") || text.includes("debate") || text.includes("speech") || text.includes("voice") || text.includes("science") || text.includes("research") || text.includes("study") || text.includes("olympiad") || text.includes("career");
        }
        if (activeCategory === "cultural") {
          return text.includes("culture") || text.includes("cultural") || text.includes("art") || text.includes("photo") || text.includes("drama") || text.includes("music") || text.includes("theater") || text.includes("film");
        }
        if (activeCategory === "sports") {
          return text.includes("sport") || text.includes("athletic") || text.includes("cricket") || text.includes("football") || text.includes("fitness");
        }
        if (activeCategory === "social") {
          return text.includes("social") || text.includes("volunteer") || text.includes("scout") || text.includes("rover") || text.includes("welfare") || text.includes("blood") || text.includes("relief");
        }
        return true;
      });
    }

    // Sorting according to Stitch sort options
    if (sortBy === "popularity") {
      result.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "recent") {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return result;
  }, [clubs, searchQuery, searchInput, activeCategory, sortBy]);

  // Featured club selection: highest follower count or first club
  const featuredClub = useMemo(() => {
    if (!clubs || clubs.length === 0) return null;
    return [...clubs].sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))[0];
  }, [clubs]);

  const featuredTheme = useMemo(() => {
    return featuredClub ? getClubTheme(featuredClub) : null;
  }, [featuredClub]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        {/* Floating Feedback Notification */}
        {feedbackMessage && (
          <div className="fixed top-24 right-6 z-50 max-w-md animate-fadeIn">
            <div
              className={`p-4 rounded-2xl shadow-lg border flex items-center gap-3 ${
                feedbackMessage.type === "error"
                  ? "bg-error-container text-on-error-container border-error/30"
                  : "bg-surface-white text-on-surface border-border-subtle"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {feedbackMessage.type === "error" ? "error" : "info"}
              </span>
              <p className="text-xs font-semibold leading-relaxed flex-1">
                {feedbackMessage.text}
              </p>
              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="text-text-muted hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Atmospheric Gradient Canvas with Ambient Blobs */}
        <div className="w-full relative overflow-hidden pb-16">
          <div className="absolute -top-32 right-10 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-tertiary-fixed-dim/25 blur-3xl pointer-events-none -z-10" />

          <div className="max-w-[1360px] 2xl:max-w-[1840px] mx-auto px-5 md:px-10 lg:px-16 2xl:px-[100px] pt-8 lg:pt-10 2xl:pt-[65px] flex flex-col gap-10 2xl:gap-14">
            {/* Two-Column Hero: Left Context (~60%) + Right Floating Community Icons (~40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 2xl:gap-14 items-center w-full">
              {/* Left Column (~60%: Col 1-7 on desktop) */}
              <div className="lg:col-span-7 flex flex-col gap-3.5 2xl:gap-5 w-full">
                <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full bg-surface-lavender text-primary font-bold text-[11px] 2xl:text-xs tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-primary animate-pulse" />
                  FIND YOUR COMMUNITY
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-[46px] xl:text-[54px] 2xl:text-[68px] text-on-surface tracking-tight 2xl:tracking-[-0.03em] font-extrabold leading-tight lg:leading-[1.18] 2xl:leading-[1.2] w-full">
                  Find your people.{" "}
                  <span className="bg-gradient-to-r from-[#2028C8] via-[#424BD6] to-[#6668E8] bg-clip-text text-transparent">
                    Follow
                  </span>
                  <span className="lg:hidden"> </span>
                  <br className="hidden lg:block" />
                  <span className="inline lg:inline-block lg:mt-1 2xl:mt-2 bg-gradient-to-r from-[#2028C8] via-[#424BD6] to-[#6668E8] bg-clip-text text-transparent">
                    your passion.
                  </span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl 2xl:text-[24px] text-text-muted 2xl:leading-[38px] max-w-xl 2xl:max-w-2xl font-normal">
                  Discover the clubs, communities, and opportunities that make campus life more meaningful at Jagannath University.
                </p>
              </div>

              {/* Right Column (~40%: Col 8-12 on desktop) — Floating Community Constellation matching Reference Photo */}
              <div className="lg:col-span-5 flex items-center justify-center relative w-full pt-6 lg:pt-0">
                <div
                  className="relative w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] 2xl:max-w-[560px] h-[260px] sm:h-[280px] lg:h-[300px] 2xl:h-[320px] pointer-events-none select-none mx-auto"
                  aria-hidden="true"
                >
                  {/* Darker Ambient Center Glow Aura behind Science Club */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 2xl:w-96 h-44 sm:h-56 2xl:h-60 rounded-full bg-gradient-to-tr from-[#3B45D6]/30 via-[#5E67EE]/35 to-[#8A90F5]/25 blur-3xl -z-10 pointer-events-none" />

                  {/* 1. IT Society (Top Left) */}
                  <div className="absolute top-[4%] left-[10%] sm:left-[12%] bg-white rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08),0_2px_6px_rgba(19,21,38,0.03)] border border-white/90 flex items-center gap-2.5 animate-orbit-float-1 z-20">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EEF2FF] text-[#2529C8] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                        terminal
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-on-surface leading-tight">
                        IT Society
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-text-muted leading-tight mt-0.5">
                        Tech & AI
                      </span>
                    </div>
                  </div>

                  {/* 2. Debating (Top Right) */}
                  <div className="absolute top-[2%] right-[4%] sm:right-[6%] bg-white rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08),0_2px_6px_rgba(19,21,38,0.03)] border border-white/90 flex items-center gap-2.5 animate-orbit-float-2 z-20">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F3F0FF] text-[#6366F1] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                        chat
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-on-surface leading-tight">
                        Debating
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-text-muted leading-tight mt-0.5">
                        Public Policy
                      </span>
                    </div>
                  </div>

                  {/* 3. Sports Icon Badge (Far Left) */}
                  <div className="absolute top-[38%] left-[1%] sm:left-[2%] w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FFFBEB] text-[#D97706] shadow-[0_6px_18px_-2px_rgba(217,119,6,0.15)] border border-[#FEF3C7] flex items-center justify-center animate-orbit-float-5 z-20">
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                      sports_cricket
                    </span>
                  </div>

                  {/* 4. Science Club (Center — Transparent / Translucent Surface revealing the darker glowing aura) */}
                  <div className="absolute top-[28%] left-[34%] sm:left-[36%] bg-white/10 backdrop-blur-sm rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08)] border border-white/80 flex items-center gap-2.5 animate-orbit-float-3 z-20">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F0F9FF]/80 text-[#0284C7] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                        biotech
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-on-surface leading-tight">
                        Science Club
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[#2529C8] leading-tight mt-0.5">
                        Research
                      </span>
                    </div>
                  </div>

                  {/* 5. Photography Icon Badge (Far Right) */}
                  <div className="absolute top-[33%] right-[0%] sm:right-[1%] w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FFF7ED] text-[#EA580C] shadow-[0_6px_18px_-2px_rgba(234,88,12,0.15)] border border-[#FFEDD5] flex items-center justify-center animate-orbit-float-1 z-20">
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                      photo_camera
                    </span>
                  </div>

                  {/* 6. Rover Scout (Lower Left) */}
                  <div className="absolute bottom-[23%] left-[10%] sm:left-[12%] bg-white rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08),0_2px_6px_rgba(19,21,38,0.03)] border border-white/90 flex items-center gap-2.5 animate-orbit-float-4 z-20">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                        volunteer_activism
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-on-surface leading-tight">
                        Rover Scout
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-text-muted leading-tight mt-0.5">
                        Leadership
                      </span>
                    </div>
                  </div>

                  {/* 7. Cultural Wing (Lower Right) */}
                  <div className="absolute bottom-[21%] right-[6%] sm:right-[8%] bg-white rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08),0_2px_6px_rgba(19,21,38,0.03)] border border-white/90 flex items-center gap-2.5 animate-orbit-float-2 z-20">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                        theater_comedy
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-on-surface leading-tight">
                        Cultural Wing
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-text-muted leading-tight mt-0.5">
                        Drama & Arts
                      </span>
                    </div>
                  </div>

                  {/* 8. Film & Drama (Bottom Center Compact Pill — Clean without trailing dot) */}
                  <div className="absolute bottom-[3%] left-[38%] sm:left-[40%] bg-white rounded-full px-3 py-1.5 shadow-[0_6px_20px_-2px_rgba(43,52,185,0.06),0_2px_4px_rgba(19,21,38,0.03)] border border-white/90 flex items-center gap-2 animate-orbit-float-3 z-20">
                    <div className="w-6 h-6 rounded-lg bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[14px]">
                        movie
                      </span>
                    </div>
                    <span className="text-xs font-bold text-on-surface leading-none pr-0.5">
                      Film & Drama
                    </span>
                  </div>

                  {/* 9. Ambient Accent Dot (Bottom Right) */}
                  <div className="absolute bottom-[16%] right-[14%] w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#C7D2FE] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Integrated Search & Category Filters (Scaled to 102px Target Height on 2K Desktop) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 2xl:gap-6 p-2.5 sm:p-3 2xl:p-[14px] 2xl:min-h-[102px] rounded-2xl 2xl:rounded-[26px] bg-surface-white shadow-[0_4px_24px_-4px_rgba(43,52,185,0.06)]">
              {/* Search Input with Dedicated Search Button */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[280px] 2xl:min-w-[440px] flex items-center">
                <span className="material-symbols-outlined absolute left-4 2xl:left-6 top-1/2 -translate-y-1/2 text-text-muted text-[22px] 2xl:text-[28px] pointer-events-none select-none">
                  search
                </span>
                <input
                  type="text"
                  id="club-search-input"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search clubs by name, niche, or department..."
                  className="w-full h-12 sm:h-14 2xl:h-[74px] pl-12 2xl:pl-16 pr-28 sm:pr-32 2xl:pr-40 rounded-xl 2xl:rounded-2xl bg-canvas-base text-on-surface placeholder:text-text-muted text-sm 2xl:text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
                <button
                  type="submit"
                  id="club-search-submit-btn"
                  aria-label="Search Clubs"
                  className="absolute right-2 sm:right-2.5 2xl:right-3.5 top-1/2 -translate-y-1/2 h-8 sm:h-10 2xl:h-[50px] px-3.5 sm:px-5 2xl:px-7 rounded-lg sm:rounded-xl 2xl:rounded-2xl bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold text-xs sm:text-sm 2xl:text-base flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px] 2xl:text-[22px]">search</span>
                  <span>Search</span>
                </button>
              </form>

              {/* Category Filter Chips Carousel (Approx 52px Tall on 2K Desktop) */}
              <div className="flex items-center gap-1.5 2xl:gap-3 overflow-x-auto pb-1 lg:pb-0 px-1 scrollbar-none shrink-0" id="category-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setPage(1);
                    }}
                    className={`category-chip h-9 sm:h-10 2xl:h-[52px] px-4 sm:px-5 2xl:px-7 rounded-full text-xs 2xl:text-base whitespace-nowrap transition-all flex items-center justify-center shrink-0 ${
                      activeCategory === cat.id
                        ? "bg-primary text-white font-bold shadow-sm"
                        : "bg-surface-lavender text-on-surface-variant hover:text-primary font-medium"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asymmetrical Featured Club Showcase Banner (Exact Reference Match) */}
            {featuredClub && !searchQuery && activeCategory === "all" && !loading && (
              <section className="relative w-full rounded-[28px] sm:rounded-[36px] 2xl:rounded-[40px] bg-gradient-to-br from-[#FAFAFE] via-[#F3F4FD] to-[#ECEEFC] p-6 sm:p-10 lg:p-12 2xl:p-14 shadow-[0_4px_32px_-8px_rgba(43,52,185,0.05)] border border-[#E8EAFF]/60 overflow-hidden">
                {/* Soft Translucent Lavender Circular Decorative Shape behind Right Panel */}
                <div
                  className="absolute -right-12 -bottom-20 sm:-right-16 sm:-bottom-28 2xl:-right-20 2xl:-bottom-32 w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] 2xl:w-[500px] 2xl:h-[500px] rounded-full bg-[#E2E5FD]/75 pointer-events-none select-none -z-0"
                  aria-hidden="true"
                />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 2xl:gap-12 items-center">
                  {/* Left Spotlight Context (Col 1-8) */}
                  <div className="lg:col-span-8 flex flex-col gap-4 2xl:gap-5">
                    {/* Featured Labels */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full bg-surface-lavender text-primary font-bold text-[11px] 2xl:text-xs tracking-wider uppercase">
                        FEATURED COMMUNITY
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 2xl:px-3.5 2xl:py-1.5 rounded-full bg-white text-on-surface text-xs 2xl:text-sm font-semibold shadow-xs border border-border-subtle/30">
                        <span
                          className="material-symbols-outlined text-primary text-[16px] 2xl:text-[18px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                        Chartered Guild
                      </span>
                    </div>

                    {/* Club Identity & Metadata Row */}
                    <div className="flex items-center gap-4 2xl:gap-5">
                      <div className="w-14 h-14 2xl:w-16 2xl:h-16 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[28px] 2xl:text-[34px]">
                          {featuredTheme?.icon || "terminal"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                          <h2 className="text-2xl sm:text-[28px] 2xl:text-3xl font-extrabold text-on-surface tracking-tight">
                            {featuredClub.name}
                          </h2>
                          <span className="text-xs sm:text-sm 2xl:text-base font-normal text-text-muted">
                            @{featuredClub.slug}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs 2xl:text-sm text-text-muted">
                          <span className="flex items-center gap-1.5 font-semibold text-on-surface">
                            <span className="material-symbols-outlined text-[16px] 2xl:text-[18px] text-primary">groups</span>
                            {featuredClub.follower_count ? featuredClub.follower_count.toLocaleString() : 0} Followers
                          </span>
                          <span className="text-text-muted/40">•</span>
                          <span className="flex items-center gap-1.5 font-semibold text-on-surface">
                            <span className="material-symbols-outlined text-[16px] 2xl:text-[18px] text-secondary">verified_user</span>
                            {featuredClub.member_count || 0} Approved Members
                          </span>
                          <span className="text-text-muted/40">•</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary font-bold text-[11px] 2xl:text-xs">
                            {featuredClub.department || featuredTheme?.deptDefault || "Faculty of Science"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm 2xl:text-base text-text-muted leading-relaxed max-w-2xl 2xl:max-w-3xl font-normal">
                      {featuredClub.description ||
                        "The premier technological innovation society of Jagannath University, empowering students through competitive programming, AI research labs, hackathons, and high-impact software engineering mentorship across Bangladesh."}
                    </p>

                    {/* Spotlight CTAs */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <Link
                        to={`/clubs/${featuredClub.slug}`}
                        className="px-6 py-2.5 2xl:px-7 2xl:py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-xs 2xl:text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Explore Club</span>
                        <span className="material-symbols-outlined text-[18px] 2xl:text-[20px]">arrow_forward</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleFollowToggle(featuredClub)}
                        disabled={followLoading[featuredClub.slug]}
                        className="px-5 py-2.5 2xl:px-6 2xl:py-3 rounded-full bg-white hover:bg-surface-lavender text-primary text-xs 2xl:text-sm font-semibold shadow-xs transition-all flex items-center gap-1.5 border border-border-subtle/20"
                      >
                        <span
                          className="material-symbols-outlined text-[18px] 2xl:text-[20px] text-primary"
                          style={featuredClub.is_following ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {featuredClub.is_following ? "check_circle" : "add"}
                        </span>
                        <span>{featuredClub.is_following ? "Following" : "Follow"}</span>
                      </button>

                      <Link
                        to={`/clubs/${featuredClub.slug}`}
                        className="px-5 py-2.5 2xl:px-6 2xl:py-3 rounded-full bg-surface-lavender hover:bg-secondary-container/40 text-on-surface text-xs 2xl:text-sm font-semibold transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px] 2xl:text-[20px] text-on-surface-variant">
                          badge
                        </span>
                        <span>
                          {featuredClub.my_membership === "approved"
                            ? "Active Member"
                            : featuredClub.my_membership === "pending"
                            ? "Pending Request"
                            : "Request Membership"}
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Right Asymmetrical Stat & Community Visual (Col 9-12) */}
                  <div className="lg:col-span-4 flex flex-col gap-3 w-full max-w-[520px] lg:max-w-none mx-auto">
                    <div className="p-5 sm:p-6 2xl:p-7 rounded-2xl 2xl:rounded-[26px] bg-white shadow-[0_8px_30px_rgba(43,52,185,0.06)] border border-[#E8EAFF]/60 flex flex-col gap-3.5 2xl:gap-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] 2xl:text-xs font-bold text-text-muted uppercase tracking-wider">
                          ACTIVE COHORTS
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] 2xl:text-xs font-bold">
                          Fall 2025
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 2xl:gap-4">
                        <div className="p-3.5 2xl:p-4 rounded-xl 2xl:rounded-2xl bg-canvas-base flex flex-col">
                          <span className="text-2xl 2xl:text-3xl font-extrabold text-primary">
                            {featuredClub.member_count ?? 0}
                          </span>
                          <span className="text-xs 2xl:text-sm text-text-muted mt-0.5">Approved Members</span>
                        </div>
                        <div className="p-3.5 2xl:p-4 rounded-xl 2xl:rounded-2xl bg-canvas-base flex flex-col">
                          <span className="text-2xl 2xl:text-3xl font-extrabold text-secondary">
                            {featuredClub.follower_count ? featuredClub.follower_count.toLocaleString() : "0"}
                          </span>
                          <span className="text-xs 2xl:text-sm text-text-muted mt-0.5">Club Followers</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-2 overflow-hidden">
                          <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-full ring-2 ring-white bg-primary text-white text-[10px] 2xl:text-xs flex items-center justify-center font-bold">
                            RA
                          </div>
                          <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-full ring-2 ring-white bg-secondary text-white text-[10px] 2xl:text-xs flex items-center justify-center font-bold">
                            SN
                          </div>
                          <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-full ring-2 ring-white bg-[#2B34B9] text-white text-[10px] 2xl:text-xs flex items-center justify-center font-bold">
                            TK
                          </div>
                          <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-full ring-2 ring-white bg-surface-lavender text-primary text-[10px] 2xl:text-xs flex items-center justify-center font-bold">
                            +{Math.max(1, (featuredClub.member_count || 112) - 3)}
                          </div>
                        </div>
                        <span className="text-[11px] 2xl:text-xs text-text-muted font-medium">
                          Registered JnU Students
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Main Directory Section */}
            <section className="flex flex-col gap-6 w-full">
              {/* Section Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold text-on-surface tracking-tight">Explore all clubs</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-xs font-bold" id="active-club-counter">
                      {totalCount || filteredClubs.length} Registered Societies
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Find a community that matches your academic, leadership, and creative interests.
                  </p>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-text-muted font-medium">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 rounded-full bg-surface-white text-on-surface text-xs font-semibold shadow-sm focus:outline-none cursor-pointer border-0"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="name">Alphabetical (A-Z)</option>
                    <option value="recent">Recently Chartered</option>
                  </select>
                </div>
              </div>

              {/* SKELETON LOADING STATE */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-surface-white p-6 shadow-sm flex flex-col justify-between h-64">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-surface-lavender" />
                        <div className="w-20 h-5 rounded-full bg-surface-lavender" />
                      </div>
                      <div className="space-y-2">
                        <div className="w-3/4 h-5 rounded bg-surface-lavender" />
                        <div className="w-1/2 h-4 rounded bg-surface-lavender/60" />
                        <div className="w-full h-10 rounded bg-surface-lavender/40" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <div className="flex-1 h-8 rounded-full bg-surface-lavender" />
                        <div className="w-24 h-8 rounded-full bg-surface-lavender" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ERROR STATE */}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center p-12 bg-error-container/20 rounded-3xl text-center max-w-xl mx-auto my-6 w-full border border-error-container">
                  <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[32px]">cloud_off</span>
                  </div>
                  <h3 className="text-xl font-bold text-on-surface">Unable to fetch club directory</h3>
                  <p className="text-xs text-text-muted mt-2 max-w-sm">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchClubs(page, searchQuery)}
                    className="mt-6 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Retry Request
                  </button>
                </div>
              )}

              {/* EMPTY STATE */}
              {!loading && !error && filteredClubs.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 bg-surface-white rounded-3xl text-center shadow-xs border border-border-subtle max-w-xl mx-auto my-6 w-full">
                  <div className="w-16 h-16 rounded-full bg-surface-lavender text-primary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[32px]">manage_search</span>
                  </div>
                  <h3 className="text-xl font-bold text-on-surface">No clubs found</h3>
                  <p className="text-xs text-text-muted mt-2 max-w-sm leading-relaxed">
                    We couldn't find any communities matching your criteria. Try adjusting your search keywords or clearing active filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-6 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Clear Filters
                  </button>
                </div>
              )}

              {/* LIVE DATA GRID (Exact 3-Column Match to Stitch Reference Image) */}
              {!loading && !error && filteredClubs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {filteredClubs.map((club) => {
                    const theme = getClubTheme(club);
                    const deptLabel = club.department || theme.deptDefault;
                    const followerCount = club.follower_count ? club.follower_count.toLocaleString() : 0;

                    return (
                      <article
                        key={club.slug}
                        className="club-card group flex flex-col justify-between rounded-2xl bg-surface-white p-6 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(43,52,185,0.08)] hover:-translate-y-1 transition-all"
                      >
                        <div className="flex flex-col gap-4">
                          {/* Top Row: Icon & Status Badges */}
                          <div className="flex items-start justify-between gap-3">
                            <div className={`w-12 h-12 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0`}>
                              <span className="material-symbols-outlined text-[26px]">
                                {theme.icon}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {/* Primary verification / status badge */}
                              {theme.badgeType === "Official Wing" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[11px] font-semibold">
                                  Official Wing
                                </span>
                              ) : theme.badgeType === "Official Society" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold">
                                  Official Society
                                </span>
                              ) : theme.badgeType === "Verified" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold">
                                  <span
                                    className="material-symbols-outlined text-[14px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                  >
                                    verified
                                  </span>
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold">
                                  <span
                                    className="material-symbols-outlined text-[14px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                  >
                                    verified
                                  </span>
                                  Chartered
                                </span>
                              )}

                              {/* Membership Status Badge (Member or Pending Request) */}
                              {club.my_membership === "approved" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed text-[11px] font-bold">
                                  <span
                                    className="material-symbols-outlined text-[12px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                  >
                                    check_circle
                                  </span>
                                  Member
                                </span>
                              )}
                              {club.my_membership === "pending" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container/40 text-error text-[11px] font-bold">
                                  <span className="material-symbols-outlined text-[12px]">
                                    hourglass_top
                                  </span>
                                  Pending Request
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Club Information */}
                          <div className="flex flex-col">
                            <div className="flex items-baseline justify-between gap-2">
                              <Link to={`/clubs/${club.slug}`}>
                                <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                  {club.name}
                                </h3>
                              </Link>
                              <span className="text-xs text-text-muted shrink-0">
                                {club.acronym || `@${club.slug}`}
                              </span>
                            </div>
                            <span className={`text-xs ${theme.categoryColor} font-semibold mt-0.5`}>
                              {theme.category}
                            </span>
                            <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">
                              {club.description || "Official university student society promoting talent, research, and campus community engagement."}
                            </p>
                          </div>
                        </div>

                        {/* Card Bottom Meta & Actions */}
                        <div className="mt-6 pt-2 flex flex-col gap-3">
                          <div className="flex items-center justify-between text-xs text-text-muted">
                            <span className="flex items-center gap-1 font-medium">
                              <span className="material-symbols-outlined text-[16px] text-text-muted">
                                group
                              </span>
                              {followerCount} followers
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${theme.deptBadge} font-medium text-[11px]`}>
                              {deptLabel}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            {club.is_following ? (
                              <button
                                type="button"
                                onClick={() => handleFollowToggle(club)}
                                disabled={followLoading[club.slug]}
                                className="card-follow-toggle flex-1 py-1.5 px-3 rounded-full bg-surface-lavender hover:bg-secondary-container/40 text-primary text-xs font-semibold transition-all flex items-center justify-center gap-1"
                              >
                                <span
                                  className="material-symbols-outlined text-[16px]"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  check
                                </span>
                                <span>Following</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleFollowToggle(club)}
                                disabled={followLoading[club.slug]}
                                className="card-follow-toggle flex-1 py-1.5 px-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  add
                                </span>
                                <span>Follow</span>
                              </button>
                            )}

                            <Link
                              to={`/clubs/${club.slug}`}
                              className="py-1.5 px-4 rounded-full bg-surface-white hover:bg-surface-lavender text-on-surface hover:text-primary text-xs font-medium transition-colors shadow-sm"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Accessible Pagination */}
              {totalPages > 1 && !loading && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-lavender transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-text-muted px-2 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-lavender transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>

            {/* Campus Guilds FAQ / Advisory Strip (Exact Match to Stitch Reference Image) */}
            <section className="mt-8 p-6 md:p-8 rounded-3xl bg-surface-lavender/50 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">school</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-base font-bold text-on-surface">Want to charter a new club?</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Applications for Fall 2025 new student guilds are open until November 30.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/register/club"
                  className="px-5 py-2 rounded-full bg-surface-white hover:bg-surface-white/80 text-on-surface text-xs font-semibold shadow-sm transition-all"
                >
                  Charter Guidelines
                </Link>
                <Link
                  to="/register/club"
                  className="px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Start an Application
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
