import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { eventsAPI, extractErrorMessage } from "../services/api";

/**
 * Date and Time Formatting Helpers using Asia/Dhaka Timezone.
 * Guarantees correct local university time representation on all devices.
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
  if (event.status === "cancelled") {
    return {
      label: "Cancelled",
      color: "text-error bg-error-container/40 border border-error/20",
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
      pulse: false,
    };
  }

  if (startsAt <= now && now < endsAt) {
    return {
      label: "Ongoing",
      color: "text-emerald-800 bg-emerald-50 border border-emerald-200",
      pulse: true,
    };
  }

  if (event.remaining_capacity === 0) {
    return {
      label: "Full",
      color: "text-amber-800 bg-amber-50 border border-amber-200",
      pulse: false,
    };
  }

  if (event.status === "draft") {
    return {
      label: "Draft",
      color: "text-amber-900 bg-amber-100/70 border border-amber-300",
      pulse: false,
    };
  }

  return {
    label: "Upcoming",
    color: "text-primary bg-surface-lavender/90 border border-primary/20",
    pulse: false,
  };
}

/**
 * Deduplicates an array of event objects by their primary ID.
 */
function deduplicateEvents(items) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
  }
  return deduped;
}

/**
 * Fetches all events where ends_at > now from the backend.
 * Uses the backend's page_size=50 (the backend DRF EventPagination maximum limit)
 * and paginates if needed to guarantee that the full active dataset is retrieved.
 */
async function fetchAllActiveEvents(query = "") {
  const params = { upcoming: "true", page_size: 50 };
  if (query.trim()) {
    params.search = query.trim();
  }

  let allResults = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await eventsAPI.getAll({ ...params, page: currentPage });
    const data = res.data;
    const results = Array.isArray(data) ? data : data.results || [];
    allResults = allResults.concat(results);

    const totalCount = data.count ?? allResults.length;
    if (!data.next || allResults.length >= totalCount || results.length === 0) {
      hasMore = false;
    } else {
      currentPage += 1;
    }
  }

  return deduplicateEvents(allResults);
}

export default function ExploreEvents() {
  const [events, setEvents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuredEvent, setFeaturedEvent] = useState(null);

  // In-memory cache for the complete active events dataset keyed by search query
  const activeEventsCacheRef = useRef({ query: null, data: null });

  // Retrieves active events for query, using cache to prevent unnecessary repeated requests
  const getActiveEvents = useCallback(async (query = "", forceRefresh = false) => {
    if (
      !forceRefresh &&
      activeEventsCacheRef.current.query === query &&
      activeEventsCacheRef.current.data !== null
    ) {
      return activeEventsCacheRef.current.data;
    }
    const data = await fetchAllActiveEvents(query);
    activeEventsCacheRef.current = { query, data };
    return data;
  }, []);

  // Fetch events from DRF backend and synchronize featured spotlight
  const fetchEvents = useCallback(
    async (currentPage = 1, currentFilter = "all", query = "", forceRefresh = false) => {
      setLoading(true);
      setError("");

      try {
        // Step 1: Ensure complete active dataset is loaded to select the featured event
        const allActive = await getActiveEvents(query, forceRefresh);
        const now = new Date();

        // Featured event selection: must be from the COMPLETE set of published future events,
        // with the earliest future starts_at. Omitted gracefully if none exist.
        const futurePublished = allActive
          .filter((e) => e.status === "published" && new Date(e.starts_at) > now)
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

        setFeaturedEvent(futurePublished.length > 0 ? futurePublished[0] : null);

        // Step 2: Handle active tab filtering and pagination
        if (currentFilter === "upcoming" || currentFilter === "ongoing") {
          let filtered = [];
          if (currentFilter === "upcoming") {
            // Strictly published and starts_at in the future (ongoing events excluded)
            filtered = allActive.filter(
              (e) => e.status === "published" && new Date(e.starts_at) > now
            );
          } else {
            // Ongoing: strictly published, starts_at <= now, and ends_at > now
            filtered = allActive.filter(
              (e) =>
                e.status === "published" &&
                new Date(e.starts_at) <= now &&
                new Date(e.ends_at) > now
            );
          }

          const total = filtered.length;
          const startIndex = (currentPage - 1) * pageSize;
          const paginatedSlice = filtered.slice(startIndex, startIndex + pageSize);

          setEvents(paginatedSlice);
          setTotalCount(total);
        } else {
          // "all" or "past": preserve native backend DRF server pagination
          const params = {
            page: currentPage,
            page_size: pageSize,
          };

          if (query.trim()) {
            params.search = query.trim();
          }

          if (currentFilter === "past") {
            params.upcoming = "false";
          }

          const res = await eventsAPI.getAll(params);
          const data = res.data;

          let results = [];
          let count = 0;

          if (Array.isArray(data)) {
            results = data;
            count = data.length;
          } else if (data?.results) {
            results = data.results;
            count = data.count ?? data.results.length;
          }

          setEvents(results);
          setTotalCount(count);
        }
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to load campus events."));
      } finally {
        setLoading(false);
      }
    },
    [getActiveEvents, pageSize]
  );

  useEffect(() => {
    fetchEvents(page, activeFilter, searchQuery);
  }, [fetchEvents, page, activeFilter, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleFilterChange = (filterKey) => {
    setActiveFilter(filterKey);
    setPage(1);
  };

  const handleResetFilters = () => {
    activeEventsCacheRef.current = { query: null, data: null };
    setSearchInput("");
    setSearchQuery("");
    setActiveFilter("all");
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
      <Navbar />

      <main className="flex-1 w-full pt-20">
        {/* Subtle atmospheric ambient glow */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[920px] h-96 bg-gradient-to-b from-surface-lavender/70 via-secondary-fixed/30 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
            {/* ============================================================ */}
            {/* 1. Page Introduction / Header Section                        */}
            {/* ============================================================ */}
            <section className="flex flex-col items-start gap-3 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-lavender text-primary shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider font-bold">
                  CAMPUS LIFE, HAPPENING NOW
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-on-surface tracking-tight font-extrabold leading-tight">
                Discover{" "}
                <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
                  what’s happening.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">
                Find campus events, meet new people, and make your university experience
                unforgettable at Jagannath University.
              </p>
            </section>

            {/* ============================================================ */}
            {/* 2. Featured Event Card (Asymmetric Layout)                   */}
            {/* ============================================================ */}
            {!loading && featuredEvent && (
              <section aria-label="Featured Campus Event">
                <div className="w-full bg-surface-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs border border-border-subtle hover:shadow-md transition-shadow duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Left Info Panel (7 cols on lg) */}
                    <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 bg-surface-container-low rounded-2xl">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-lavender text-primary text-[11px] uppercase font-bold tracking-wider">
                            <span
                              className="material-symbols-outlined text-[15px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              auto_awesome
                            </span>
                            UP NEXT
                          </div>

                          {(() => {
                            const status = getEventStatus(featuredEvent);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold shadow-xs ${status.color}`}
                              >
                                {status.pulse && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                )}
                                {status.label}
                              </span>
                            );
                          })()}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold mb-1">
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              groups
                            </span>
                            <span>{featuredEvent.club?.name}</span>
                            <span
                              className="material-symbols-outlined text-[16px] text-primary"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                          </div>

                          <h2 className="text-2xl sm:text-3xl text-on-surface font-bold tracking-tight">
                            {featuredEvent.title}
                          </h2>
                        </div>

                        {/* Event Logistics Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-surface-white flex items-center justify-center text-primary shrink-0 shadow-xs">
                              <span className="material-symbols-outlined text-[18px]">
                                calendar_today
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                                Date &amp; Schedule
                              </span>
                              <span className="text-xs text-on-surface font-medium leading-snug">
                                {formatDhakaSchedule(
                                  featuredEvent.starts_at,
                                  featuredEvent.ends_at
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-surface-white flex items-center justify-center text-primary shrink-0 shadow-xs">
                              <span className="material-symbols-outlined text-[18px]">
                                location_on
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                                Venue Location
                              </span>
                              <span className="text-xs text-on-surface font-medium leading-snug">
                                {featuredEvent.venue}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-3 pt-1 leading-relaxed">
                          {featuredEvent.description ||
                            `Join fellow students for this campus event organized by ${featuredEvent.club?.name}.`}
                        </p>
                      </div>

                      {/* Action & Capacity */}
                      <div className="pt-6 flex items-center justify-between flex-wrap gap-4 border-t border-border-subtle/50 mt-4">
                        <Link
                          to={`/events/${featuredEvent.id}`}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all hover:shadow-md"
                        >
                          <span>View Event</span>
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_forward
                          </span>
                        </Link>

                        <span className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            confirmation_number
                          </span>
                          {featuredEvent.capacity !== null
                            ? `${featuredEvent.remaining_capacity ?? 0} seats left (${
                                featuredEvent.registered_count || 0
                              } registered)`
                            : "Unlimited Capacity"}
                        </span>
                      </div>
                    </div>

                    {/* Right Visual Banner Plate (5 cols on lg) */}
                    <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full rounded-2xl overflow-hidden shadow-inner bg-gradient-to-br from-primary via-primary-container to-secondary p-6 sm:p-8 flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                          <span className="material-symbols-outlined text-[24px]">
                            event
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold uppercase tracking-wider">
                          Campus Activity
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-white/80 text-[11px] uppercase tracking-wider font-semibold block">
                          Organized by
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                          {featuredEvent.club?.name}
                        </h3>
                        <p className="text-xs text-white/90 flex items-center gap-1 pt-1">
                          <span className="material-symbols-outlined text-[15px]">
                            location_on
                          </span>
                          <span>{featuredEvent.venue}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* 3. Search and Filters Bar                                    */}
            {/* ============================================================ */}
            <section aria-label="Event Search and Filters" className="space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Search Input Box */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex-1 max-w-lg"
                >
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search events by title..."
                    className="w-full h-11 pl-11 pr-24 bg-surface-white border border-border-subtle rounded-full text-xs text-on-surface placeholder:text-text-muted shadow-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Search
                  </button>
                </form>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div
                    className="inline-flex items-center p-1 bg-surface-white border border-border-subtle rounded-full shadow-xs"
                    role="tablist"
                  >
                    {[
                      { key: "all", label: "All Events" },
                      { key: "upcoming", label: "Upcoming" },
                      { key: "ongoing", label: "Ongoing" },
                      { key: "past", label: "Past" },
                    ].map((tab) => {
                      const isActive = activeFilter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => handleFilterChange(tab.key)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-primary text-white shadow-xs"
                              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-lavender/50"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Header Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-text-muted pt-2 border-b border-border-subtle/50 pb-2">
                <span>
                  Showing{" "}
                  <strong className="text-on-surface">{events.length}</strong> of{" "}
                  <strong className="text-on-surface">{totalCount}</strong> campus events
                </span>
                {searchQuery && (
                  <span className="flex items-center gap-1">
                    Matching &ldquo;<span className="text-primary font-medium">{searchQuery}</span>&rdquo;
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="ml-2 text-primary hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  </span>
                )}
              </div>
            </section>

            {/* ============================================================ */}
            {/* 4. Dynamic Content Area: Grid / Skeleton / Empty / Error     */}
            {/* ============================================================ */}

            {/* State: Loading Skeleton */}
            {loading && (
              <section aria-label="Loading events">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="bg-surface-white rounded-3xl overflow-hidden shadow-xs p-5 space-y-4 border border-border-subtle"
                    >
                      <div className="h-44 w-full bg-surface-lavender rounded-2xl animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-3 w-1/3 bg-surface-lavender rounded-full animate-pulse" />
                        <div className="h-5 w-4/5 bg-surface-lavender rounded-lg animate-pulse" />
                        <div className="h-3 w-1/2 bg-surface-lavender rounded-full animate-pulse" />
                      </div>
                      <div className="h-9 w-full bg-surface-lavender rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* State: API Error */}
            {!loading && error && (
              <section aria-label="Error state">
                <div className="w-full bg-surface-white rounded-3xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto space-y-4 border border-error-container">
                  <div className="w-16 h-16 rounded-full bg-error-container/40 flex items-center justify-center text-error shadow-xs">
                    <span className="material-symbols-outlined text-[32px]">cloud_off</span>
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                      Unable to synchronize campus events
                    </h3>
                    <p className="text-xs sm:text-sm text-text-muted">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchEvents(page, activeFilter, searchQuery, true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span>Retry Connection</span>
                  </button>
                </div>
              </section>
            )}

            {/* State: Empty State */}
            {!loading && !error && events.length === 0 && (
              <section aria-label="No events found">
                <div className="w-full bg-surface-white rounded-3xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto space-y-4 border border-border-subtle">
                  <div className="w-16 h-16 rounded-full bg-surface-lavender flex items-center justify-center text-primary shadow-xs">
                    <span className="material-symbols-outlined text-[32px]">event_busy</span>
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                      No campus events found
                    </h3>
                    <p className="text-xs sm:text-sm text-text-muted">
                      No events match your current filter or search criteria. Explore other
                      categories or check back later!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Reset Filters</span>
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  </button>
                </div>
              </section>
            )}

            {/* State: Live Event Grid */}
            {!loading && !error && events.length > 0 && (
              <section aria-label="Campus Events Grid" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const status = getEventStatus(event);

                    return (
                      <article
                        key={event.id}
                        className="bg-surface-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between border border-border-subtle group"
                      >
                        <div>
                          {/* Card Top Banner Plate */}
                          <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-surface-lavender via-surface-container to-secondary-fixed/40 p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-md flex items-center justify-center text-primary shadow-xs">
                                <span className="material-symbols-outlined text-[20px]">
                                  calendar_today
                                </span>
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${status.color}`}
                              >
                                {status.pulse && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                )}
                                {status.label}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block truncate">
                                {event.club?.name}
                              </span>
                            </div>
                          </div>

                          {/* Card Content Area */}
                          <div className="p-5 sm:p-6 space-y-3">
                            <div className="flex items-center gap-1.5 text-text-muted text-xs">
                              <span className="font-semibold text-primary truncate max-w-[200px]">
                                {event.club?.name}
                              </span>
                              <span>•</span>
                              <span>Chartered</span>
                            </div>

                            <h3 className="text-base sm:text-lg text-on-surface font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {event.title}
                            </h3>

                            <div className="space-y-1.5 pt-1 text-xs text-on-surface-variant">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                                  schedule
                                </span>
                                <span className="truncate">
                                  {formatDhakaSchedule(event.starts_at, event.ends_at)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                                  location_on
                                </span>
                                <span className="truncate">{event.venue}</span>
                              </div>

                              <div className="flex items-center gap-2 text-text-muted pt-0.5">
                                <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                                  confirmation_number
                                </span>
                                <span className="truncate">
                                  {event.capacity !== null
                                    ? `${event.remaining_capacity ?? 0} seats left (${
                                        event.registered_count || 0
                                      }/${event.capacity})`
                                    : "Unlimited Capacity"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Link */}
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1">
                          <Link
                            to={`/events/${event.id}`}
                            className="w-full py-2.5 rounded-full bg-surface-lavender hover:bg-primary hover:text-white text-primary text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>View Details</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_outward
                            </span>
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-xs font-semibold text-on-surface hover:bg-surface-lavender disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Previous
                    </button>

                    <span className="text-xs text-text-muted font-medium">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white text-xs font-semibold text-on-surface hover:bg-surface-lavender disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 5. Footer                                                    */}
      {/* ============================================================ */}
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
