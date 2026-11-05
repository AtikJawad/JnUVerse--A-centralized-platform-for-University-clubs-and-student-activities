import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";
import { ratingsAPI, extractErrorMessage } from "../services/api";
import StarRating, { RATING_LABELS } from "./StarRating";

/**
 * Rigorous backend contract validator for Event Rating Summary.
 *
 * Backend Contract:
 * - count: non-negative integer.
 * - average: null when count === 0; finite float between 1.0 and 5.0 when count > 0.
 * - breakdown: object with string keys "1" through "5", each mapped to a non-negative integer.
 * - sum of breakdown tier counts must strictly equal count.
 */
function validateRatingSummary(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      isValid: false,
      errorReason: "Summary response payload is missing or not a valid object.",
    };
  }

  const { average, count, breakdown } = data;

  // 1. Validate count type and range
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    return {
      isValid: false,
      errorReason: "Total rating count must be a non-negative integer.",
    };
  }

  // 2. Validate breakdown structure and individual tier values
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) {
    return {
      isValid: false,
      errorReason: "Rating distribution breakdown is missing or malformed.",
    };
  }

  const requiredTiers = ["1", "2", "3", "4", "5"];
  let breakdownSum = 0;
  for (const tier of requiredTiers) {
    if (!(tier in breakdown)) {
      return {
        isValid: false,
        errorReason: `Missing rating tier "${tier}" in distribution breakdown.`,
      };
    }
    const tierCount = breakdown[tier];
    if (typeof tierCount !== "number" || !Number.isInteger(tierCount) || tierCount < 0) {
      return {
        isValid: false,
        errorReason: `Rating count for tier "${tier}" must be a non-negative integer.`,
      };
    }
    breakdownSum += tierCount;
  }

  // 3. Verify that the sum of the five breakdown counts equals total count
  if (breakdownSum !== count) {
    return {
      isValid: false,
      errorReason: `Distribution sum (${breakdownSum}) does not equal total rating count (${count}).`,
    };
  }

  // 4. Distinguish Valid Empty State vs. Valid Populated State
  if (count === 0) {
    if (average !== null) {
      return {
        isValid: false,
        errorReason: "Average rating must be null when rating count is zero.",
      };
    }
    return {
      isValid: true,
      stateType: "empty",
      count: 0,
      average: null,
      breakdown,
    };
  }

  // Count > 0: Valid Populated State
  if (typeof average !== "number" || !Number.isFinite(average) || average < 1 || average > 5) {
    return {
      isValid: false,
      errorReason: "Average rating must be a finite number between 1.0 and 5.0 when ratings exist.",
    };
  }

  return {
    isValid: true,
    stateType: "populated",
    count,
    average,
    breakdown,
  };
}

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

  const [validatedSummary, setValidatedSummary] = useState(null);
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

        // Perform strict response validation
        const validation = validateRatingSummary(res?.data);
        if (!validation.isValid) {
          setError({
            status: 422,
            isDataInconsistent: true,
            title: "Inconsistent Rating Summary Data",
            message: `The server returned an inconsistent rating summary for this event (${validation.errorReason}). Please retry or contact technical support.`,
          });
          setValidatedSummary(null);
        } else {
          setError(null);
          setValidatedSummary(validation);
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
          isDataInconsistent: false,
          title: statusCode === 403 ? "Operator Authorization Required" : "Unable to Load Ratings",
          message: errorMessage,
        });
        setValidatedSummary(null);
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
      setValidatedSummary(null);
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
  // STATE 2: Error State (Authorization, Network, or Inconsistent Data)
  // --------------------------------------------------------------------------
  if (error) {
    const isAccessDenied = error.status === 403;
    const isDataInconsistent = error.isDataInconsistent === true;

    return (
      <div
        role="alert"
        className={`p-6 rounded-3xl border transition-all ${
          isAccessDenied
            ? "bg-amber-50/70 border-amber-200 text-amber-950"
            : isDataInconsistent
            ? "bg-amber-50/80 border-amber-300 text-amber-950"
            : "bg-error-container/30 border-error/20 text-on-error-container"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`material-symbols-outlined text-[24px] shrink-0 mt-0.5 ${
                isAccessDenied
                  ? "text-amber-700"
                  : isDataInconsistent
                  ? "text-amber-800"
                  : "text-error"
              }`}
            >
              {isAccessDenied ? "shield_lock" : isDataInconsistent ? "sync_problem" : "error"}
            </span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold">
                {error.title || (isAccessDenied ? "Operator Authorization Required" : "Unable to Load Ratings")}
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

  // --------------------------------------------------------------------------
  // STATE 3: Valid Empty State (count === 0, average === null)
  // --------------------------------------------------------------------------
  if (!validatedSummary || validatedSummary.stateType === "empty") {
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
  // STATE 4: Valid Populated Rating Breakdown State (count > 0, average 1.0..5.0)
  // --------------------------------------------------------------------------
  const { count: totalCount, average: rawAverage, breakdown } = validatedSummary;
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
              const levelCount = breakdown[String(star)];
              const percentage = Math.round((levelCount / totalCount) * 100);

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
