import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { collaborationsAPI, extractErrorMessage } from "../services/api";

/**
 * Format ISO datetime string to Month Year (e.g., "Nov 2026").
 */
function formatPartnerSince(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Loading skeleton matching the 2-column partner card layout.
 */
function PartnerSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full" aria-hidden="true">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-canvas-base/50 border border-border-subtle/80 flex flex-col justify-between gap-4 animate-pulse h-44"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-lavender/80" />
            <div className="w-24 h-5 rounded-full bg-surface-lavender/70" />
          </div>
          <div className="space-y-2">
            <div className="w-3/4 h-4 rounded bg-surface-lavender/80" />
            <div className="w-1/2 h-3.5 rounded bg-surface-lavender/60" />
            <div className="w-2/3 h-3 rounded bg-surface-lavender/40" />
          </div>
          <div className="w-full h-8 rounded-full bg-surface-lavender/50 pt-2" />
        </div>
      ))}
    </div>
  );
}

/**
 * Public Partner Clubs Section for Club Detail page.
 * Displays accepted collaborative partner clubs for the currently viewed club.
 *
 * @param {Object} props
 * @param {string} props.clubSlug - The unique slug of the currently viewed club.
 */
export default function PartnerClubsSection({ clubSlug }) {
  const [partners, setPartners] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const reqGenRef = useRef(0);
  const isMountedRef = useRef(true);
  const partnersRef = useRef(partners);
  partnersRef.current = partners;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPartners = useCallback(
    async (pageNumber = 1, isLoadMore = false) => {
      if (!clubSlug) return;
      const currentGen = ++reqGenRef.current;
      const targetSlug = clubSlug;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
        setRefreshError("");
      }

      try {
        const response = await collaborationsAPI.getPartners(targetSlug, {
          page: pageNumber,
        });

        if (
          !isMountedRef.current ||
          currentGen !== reqGenRef.current ||
          targetSlug !== clubSlug
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
          setPartners((prev) => {
            const existingKeys = new Set(prev.map((p) => p.id || p.slug));
            const uniqueIncoming = newResults.filter((p) => {
              const key = p.id || p.slug;
              return key && !existingKeys.has(key);
            });
            return [...prev, ...uniqueIncoming];
          });
          setPage(pageNumber);
        } else {
          const seenKeys = new Set();
          const uniqueFirstPage = newResults.filter((p) => {
            const key = p.id || p.slug;
            if (key && !seenKeys.has(key)) {
              seenKeys.add(key);
              return true;
            }
            return false;
          });
          setPartners(uniqueFirstPage);
          setPage(1);
        }

        setTotalCount(total);
        setHasMore(Boolean(nextUrl));
      } catch (err) {
        if (
          !isMountedRef.current ||
          currentGen !== reqGenRef.current ||
          targetSlug !== clubSlug
        ) {
          return;
        }

        const msg = extractErrorMessage(err, "Failed to load partner clubs.");

        // If this was a refresh or load-more of already populated data, do not wipe existing cards
        if (isLoadMore || (!isLoadMore && pageNumber === 1 && partnersRef.current.length > 0)) {
          setRefreshError(msg);
        } else {
          setError(msg);
        }
      } finally {
        if (
          isMountedRef.current &&
          currentGen === reqGenRef.current &&
          targetSlug === clubSlug
        ) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [clubSlug]
  );

  // Invalidate and refetch whenever clubSlug changes
  useEffect(() => {
    setPartners([]);
    setTotalCount(0);
    setError("");
    setRefreshError("");
    setPage(1);
    setHasMore(false);

    if (clubSlug) {
      fetchPartners(1, false);
    }
  }, [clubSlug, fetchPartners]);

  const handleLoadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      fetchPartners(page + 1, true);
    }
  };

  const handleManualRetry = () => {
    if (!loading && !loadingMore) {
      fetchPartners(1, false);
    }
  };

  return (
    <section
      id="partner-clubs"
      aria-labelledby="partner-clubs-heading"
      className="bg-surface-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle flex flex-col gap-6"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[22px]">handshake</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="partner-clubs-heading" className="text-base font-bold text-on-surface">
                Partner Clubs
              </h2>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-surface-lavender text-primary font-bold text-[11px]">
                  {totalCount} {totalCount === 1 ? "partner" : "partners"}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Clubs that collaborate with this community.
            </p>
          </div>
        </div>

        {/* Refresh button if data is loaded */}
        {!loading && !error && partners.length > 0 && (
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={loading || loadingMore}
            className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-lavender transition-colors disabled:opacity-50"
            title="Refresh partners list"
            aria-label="Refresh partners list"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        )}
      </div>

      {/* Non-destructive refresh error banner */}
      {refreshError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
            <span>{refreshError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshError("")}
            className="text-amber-700 hover:text-amber-900 font-bold"
            aria-label="Dismiss warning"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton View */}
      {loading && <PartnerSkeletons />}

      {/* Initial Error State with Retry Button */}
      {!loading && error && (
        <div
          role="alert"
          className="p-6 rounded-2xl bg-error-container/30 border border-error/20 text-center flex flex-col items-center justify-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-error-container text-on-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">error</span>
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <h3 className="text-sm font-bold text-on-surface">Unable to load partner clubs</h3>
            <p className="text-xs text-text-muted leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleManualRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && partners.length === 0 && (
        <div className="py-10 px-6 rounded-2xl bg-canvas-base/60 border border-border-subtle text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-3 shadow-xs">
            <span className="material-symbols-outlined text-[26px]">handshake</span>
          </div>
          <h3 className="text-sm font-bold text-on-surface">No partner clubs yet</h3>
          <p className="text-xs text-text-muted max-w-sm mt-1 leading-relaxed">
            Established collaborations will appear here once this club partners with another club.
          </p>
        </div>
      )}

      {/* Partner Cards Grid */}
      {!loading && !error && partners.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {partners.map((partner) => {
              const formattedDate = formatPartnerSince(partner.partner_since);

              return (
                <article
                  key={partner.id || partner.slug}
                  className="p-5 rounded-2xl bg-surface-white hover:bg-canvas-base/40 border border-border-subtle shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="flex flex-col gap-3">
                    {/* Top Row: Avatar & Badge */}
                    <div className="flex items-start justify-between gap-3">
                      {partner.logo ? (
                        <img
                          src={partner.logo}
                          alt={`${partner.name} logo`}
                          className="w-12 h-12 rounded-xl object-cover border border-border-subtle shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`avatar-fallback w-12 h-12 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0 font-bold ${
                          partner.logo ? "hidden" : "flex"
                        }`}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined text-[24px]">groups</span>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold shrink-0">
                        <span className="material-symbols-outlined text-[13px]">handshake</span>
                        <span>Partner Club</span>
                      </span>
                    </div>

                    {/* Partner Details */}
                    <div className="flex flex-col min-w-0">
                      <Link
                        to={`/clubs/${partner.slug}`}
                        className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate"
                        title={partner.name}
                      >
                        {partner.name}
                      </Link>
                      <span className="text-xs text-text-muted font-mono truncate">
                        @{partner.slug}
                      </span>
                      {formattedDate && (
                        <div className="flex items-center gap-1 text-[11px] text-text-muted mt-2">
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          <span>Partner since {formattedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Link to Club Detail */}
                  <div className="pt-2 border-t border-border-subtle/70">
                    <Link
                      to={`/clubs/${partner.slug}`}
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary font-bold text-xs transition-colors shadow-xs"
                    >
                      <span>View Club</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Load More Pagination */}
          {hasMore && (
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
                    <span>Loading partners...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                    <span>Load More Partners</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-text-muted">
                Showing {partners.length} of {totalCount} partners
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

PartnerClubsSection.propTypes = {
  clubSlug: PropTypes.string.isRequired,
};

