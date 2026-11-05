import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";
import { ratingsAPI, extractErrorMessage } from "../services/api";
import StarRating, { RATING_LABELS } from "./StarRating";

/**
 * EventRatingBreakdown Component — Week 6 Stage 3
 *
 * Operator-facing aggregate rating summary and 1–5 star distribution breakdown.
 * Consumes GET /api/events/:id/rating-summary/
 *
 * Strict Privacy Guarantee:
 * Displays aggregate feedback only (average score, total count, 1–5 distribution).
 * Student names, emails, IDs, timestamps, and individual records are never fetched or displayed.
 */
export default function EventRatingBreakdown({
  eventId,
  eventTitle = "Event",
  onClose,
}) {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const generationRef = useRef(0);
  const currentIdentity = user ? `${user.id || user.email}:${user.role}` : "anonymous";
  const identityRef = useRef(currentIdentity);

  // Fetch rating summary from backend
  const fetchSummary = useCallback(
    async (isRefresh = false) => {
      if (!eventId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const currentGen = generationRef.current;
      try {
        const res = await ratingsAPI.getRatingSummary(eventId);
        if (generationRef.current !== currentGen) return;

        // Backend response contract: { average: float | null, count: int, breakdown: { "1": int, ... "5": int } }
        const data = res?.data;
        if (data && typeof data === "object") {
          setSummary(data);
        } else {
          setSummary(null);
        }
      } catch (err) {
        if (generationRef.current !== currentGen) return;
        const statusCode = err.response?.status;
        let errorMessage = "Failed to load event rating summary.";

        if (statusCode === 401) {
          errorMessage = "Authentication expired. Please sign in again.";
        } else if (statusCode === 403) {
          errorMessage =
            err.response?.data?.detail ||
            "Access Denied: Only the organizing club's operator can view this rating summary.";
        } else if (statusCode === 404) {
          errorMessage = "Event rating summary is not available for this event.";
        } else {
          errorMessage = extractErrorMessage(err, "Failed to retrieve rating summary.");
        }

        setError({
          status: statusCode,
          message: errorMessage,
        });
      } finally {
        if (generationRef.current === currentGen) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [eventId]
  );

  // Identity safety: reset state when user switches accounts or eventId changes
  useEffect(() => {
    generationRef.current += 1;
    if (identityRef.current !== currentIdentity) {
      identityRef.current = currentIdentity;
      setSummary(null);
      setError(null);
    }
    fetchSummary(false);
  }, [currentIdentity, eventId, fetchSummary]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchSummary(true);
  };

  // --------------------------------------------------------------------------
  // STATE 1: Initial Loading State
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div
        className="p-6 rounded-3xl bg-surface-container-low border border-border-subtle/80 animate-pulse space-y-4"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-surface-lavender rounded-full" />
          <div className="h-4 w-20 bg-surface-lavender rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 space-y-2">
            <div className="h-10 w-24 bg-surface-lavender rounded-xl" />
            <div className="h-4 w-32 bg-surface-lavender rounded-full" />
          </div>
          <div className="md:col-span-8 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 w-full bg-surface-lavender rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 2: Error State
  // --------------------------------------------------------------------------
  if (error) {
    const isAccessDenied = error.status === 403;

    return (
      <div
        role="alert"
        className={`p-6 rounded-3xl border transition-all ${
          isAccessDenied
            ? "bg-amber-50/70 border-amber-200 text-amber-950"
            : "bg-error-container/30 border-error/20 text-on-error-container"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`material-symbols-outlined text-[24px] shrink-0 mt-0.5 ${
                isAccessDenied ? "text-amber-700" : "text-error"
              }`}
            >
              {isAccessDenied ? "shield_lock" : "error"}
            </span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold">
                {isAccessDenied ? "Operator Authorization Required" : "Unable to Load Ratings"}
              </h4>
              <p className="text-xs leading-relaxed text-text-muted">{error.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isAccessDenied && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-primary transition-colors flex items-center gap-1 shadow-xs"
              >
                <span
                  className={`material-symbols-outlined text-[15px] ${
                    refreshing ? "animate-spin" : ""
                  }`}
                >
                  refresh
                </span>
                <span>Retry</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-surface-white/60 text-text-muted hover:text-on-surface transition-colors"
                aria-label="Close rating panel"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Extract verified backend metrics
  const totalCount =
    summary && Number.isInteger(summary.count) && summary.count >= 0 ? summary.count : 0;
  const rawAverage = summary?.average;
  const hasNumericAverage =
    typeof rawAverage === "number" && Number.isFinite(rawAverage) && rawAverage > 0;
  const breakdown = summary?.breakdown && typeof summary.breakdown === "object" ? summary.breakdown : {};

  // --------------------------------------------------------------------------
  // STATE 3: Empty State (No Ratings Submitted Yet)
  // --------------------------------------------------------------------------
  if (totalCount === 0 || !hasNumericAverage) {
    return (
      <div className="p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-border-subtle/80 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">hotel_class</span>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Attendee Feedback
              </h4>
              <h3 className="text-sm font-bold text-on-surface">Event Rating Performance</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-[11px] font-semibold text-text-muted hover:text-primary transition-colors shadow-xs"
              title="Refresh rating status"
            >
              <span
                className={`material-symbols-outlined text-[14px] ${
                  refreshing ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-surface-lavender text-text-muted hover:text-on-surface transition-colors"
                aria-label="Close rating panel"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Empty Message Plate */}
        <div className="py-6 px-4 rounded-2xl bg-surface-white border border-border-subtle text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-surface-lavender text-text-muted flex items-center justify-center mx-auto shadow-xs">
            <span className="material-symbols-outlined text-[24px]">reviews</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-on-surface">No student ratings yet</p>
            <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
              Ratings become available after the event concludes. Only registered student attendees
              can submit a verified 1 to 5 star rating within the 7-day post-event window.
            </p>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1">
          <span className="material-symbols-outlined text-[14px] text-primary">verified_user</span>
          <span>
            Strict Privacy Standard: Individual attendee identities and ratings remain strictly
            confidential from club operators.
          </span>
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 4: Populated Rating Breakdown State
  // --------------------------------------------------------------------------
  const formattedAverage = Number(rawAverage).toFixed(1);

  return (
    <section
      aria-label={`Rating performance summary for ${eventTitle}`}
      className="p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-border-subtle/80 space-y-6"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border-subtle/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">insights</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Auditorium Consensus
            </span>
            <h3 className="text-sm sm:text-base font-bold text-on-surface">
              Event Rating Performance &amp; Distribution
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-[11px] font-semibold text-text-muted hover:text-primary transition-colors shadow-xs"
            title="Refresh aggregate summary"
          >
            <span
              className={`material-symbols-outlined text-[14px] ${
                refreshing ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-surface-lavender text-text-muted hover:text-on-surface transition-colors"
              aria-label="Close rating panel"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Aggregate Metric Plate (Left 4 cols) & 5-Star Breakdown (Right 8 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Column: Average Score & Total Count */}
        <div className="md:col-span-4 p-5 rounded-2xl bg-surface-white border border-border-subtle shadow-xs flex flex-col items-center justify-center text-center space-y-3">
          <div className="space-y-0.5">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-on-surface">
                {formattedAverage}
              </span>
              <span className="text-base sm:text-lg font-bold text-text-muted">/ 5</span>
            </div>

            <p className="text-[11px] font-bold text-primary-container">
              {RATING_LABELS[Math.round(rawAverage)] || "Audience Consensus"}
            </p>
          </div>

          {/* Read-Only Star Visualization */}
          <div>
            <StarRating value={rawAverage} readOnly size="md" />
          </div>

          <div className="pt-2 border-t border-border-subtle/80 w-full">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-lavender text-primary-container text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span>
                {totalCount} {totalCount === 1 ? "Student Rating" : "Student Ratings"}
              </span>
            </span>
          </div>
        </div>

        {/* Right Column: 5-Star Breakdown Progress Bars (5 down to 1) */}
        <div className="md:col-span-8 p-5 rounded-2xl bg-surface-white border border-border-subtle shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold pb-1 border-b border-border-subtle/50">
            <span>Rating Tier</span>
            <div className="flex items-center gap-8">
              <span>Audience Share</span>
              <span className="w-14 text-right">Count</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const levelCount =
                typeof breakdown[String(star)] === "number" ? breakdown[String(star)] : 0;
              const percentage = totalCount > 0 ? Math.round((levelCount / totalCount) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  {/* Star Tier Label */}
                  <div className="flex items-center gap-1 w-16 shrink-0 font-semibold text-on-surface">
                    <span>{star}</span>
                    <span className="text-amber-500 text-[14px] leading-none">★</span>
                    <span className="text-text-muted text-[10px] hidden sm:inline">
                      ({RATING_LABELS[star]})
                    </span>
                  </div>

                  {/* Horizontal Distribution Bar */}
                  <div
                    className="flex-1 h-3 rounded-full bg-surface-lavender overflow-hidden relative shadow-inner"
                    role="progressbar"
                    aria-valuenow={levelCount}
                    aria-valuemin={0}
                    aria-valuemax={totalCount}
                    aria-label={`${star} star rating distribution: ${levelCount} responses (${percentage}%)`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Percentage & Count Numbers */}
                  <div className="flex items-center justify-end gap-3 w-24 shrink-0 text-right">
                    <span className="text-text-muted text-[11px] font-medium w-10">
                      {percentage}%
                    </span>
                    <span className="font-bold text-on-surface text-xs w-10">
                      {levelCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strict Privacy Protection Guarantee Footer */}
      <div className="pt-2 flex items-start gap-2.5 text-xs text-text-muted">
        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
          verified_user
        </span>
        <p className="leading-relaxed">
          <strong className="text-on-surface font-semibold">Strict Privacy Safeguard:</strong>{" "}
          Individual student identities, attendance mapping, and timestamps are confidential. Club
          operators only see aggregate feedback distributions to guide future event planning.
        </p>
      </div>
    </section>
  );
}

EventRatingBreakdown.propTypes = {
  eventId: PropTypes.string.isRequired,
  eventTitle: PropTypes.string,
  onClose: PropTypes.func,
};

