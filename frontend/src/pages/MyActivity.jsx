import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { analyticsAPI, extractErrorMessage } from "../services/api";
import { HeroFigure, SegmentedBar, SERIES } from "../components/charts";
import { formatCount, formatPercent } from "../utils/format";

/**
 * MyActivity — Week 8 Stage 6 (`/my-activity`, students only)
 *
 * Report 4: the student's own activity (GET /api/analytics/student-activity/).
 * No Stitch screen exists; the page uses the Stitch student-dashboard patterns (eyebrow-dot section
 * header, white rounded-3xl cards with tinted icon squircles, 4rem section rhythm). Per the data-viz
 * method the activity score is the single hero figure, its parts a tall segmented bar with a legend,
 * and the remaining numbers are stat tiles (the tiles double as the table view of the bar).
 */

const CARD = "bg-surface-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(43,52,185,0.04)]";

function StatCard({ icon, iconClass, label, value, caption, to, cta }) {
  return (
    <div className={`${CARD} flex flex-col justify-between gap-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-text-muted">{label}</span>
          <span className="text-[32px] leading-10 font-extrabold tracking-tight text-on-surface">{value}</span>
          {caption && <span className="text-[13px] text-text-muted">{caption}</span>}
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconClass}`}>
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>
      {to && (
        <Link
          to={to}
          className="self-start inline-flex items-center gap-1 min-h-6 py-1 text-xs font-bold text-primary hover:text-primary-hover"
        >
          {cta}
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

export default function MyActivity() {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await analyticsAPI.studentActivity();
      setActivity(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load your activity."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const a = activity || {};
  const parts = [
    { key: "joined", label: "Clubs joined", value: a.clubs_joined || 0, color: SERIES[0] },
    { key: "attended", label: "Events attended", value: a.events_attended || 0, color: SERIES[1] },
    { key: "ratings", label: "Ratings given", value: a.ratings_given || 0, color: SERIES[2] },
  ];

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-20 flex-1">
        <div className="max-w-[1360px] w-full mx-auto px-5 md:px-10 lg:px-16 py-6 flex flex-col gap-16">
          {/* Stitch section header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                <span className="text-[11px] uppercase tracking-wider text-primary font-bold">Report 4 · Your activity</span>
              </div>
              <h1 className="text-[32px] leading-10 sm:text-[44px] sm:leading-[52px] font-bold text-on-surface tracking-tight">
                Your campus activity.
              </h1>
              <p className="text-[15px] leading-6 text-text-muted mt-1">
                How involved you are in clubs and events at Jagannath University.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 min-h-6 py-1 text-sm font-bold text-primary hover:text-primary-hover self-start sm:self-auto"
            >
              Your profile
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          {loading && !activity && (
            <div className="flex flex-col gap-6 animate-pulse" aria-label="Loading your activity">
              <div className="h-56 rounded-3xl bg-surface-lavender/60" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-36 rounded-3xl bg-surface-lavender/60" />
                <div className="h-36 rounded-3xl bg-surface-lavender/60" />
                <div className="h-36 rounded-3xl bg-surface-lavender/60" />
              </div>
            </div>
          )}

          {!loading && error && (
            <div className={`${CARD} flex flex-col items-center text-center gap-3 py-10`}>
              <span className="material-symbols-outlined text-[36px] text-error">warning</span>
              <p className="text-[15px] text-text-muted">{error}</p>
              <button
                type="button"
                onClick={load}
                className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary text-sm font-medium shadow-sm hover:bg-primary-hover"
              >
                Retry
              </button>
            </div>
          )}

          {activity && (
            <>
              {/* Hero: the one number this view leads with, and its parts */}
              <section className={`${CARD} sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center`} aria-label="Activity score">
                <div className="lg:col-span-4">
                  <HeroFigure
                    label="Activity score"
                    value={formatCount(a.activity_score)}
                    caption="Clubs joined + events attended + ratings given"
                  />
                </div>
                <div className="lg:col-span-8 flex flex-col gap-3">
                  <span className="text-[13px] font-semibold text-on-surface">Where your score comes from</span>
                  <SegmentedBar
                    parts={parts}
                    ariaLabel={`Activity score ${a.activity_score}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`}
                  />
                  {a.activity_score === 0 && (
                    <p className="text-[13px] text-text-muted">
                      Join a club, attend an event or rate one you went to — each adds a point.
                    </p>
                  )}
                </div>
              </section>

              {/* Stat cards (also the readable values of the bar above) */}
              <section aria-label="Activity details" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                  icon="verified_user"
                  iconClass="bg-sky-100 text-primary-container"
                  label="Clubs joined"
                  value={formatCount(a.clubs_joined)}
                  caption="Approved memberships"
                  to="/my-clubs"
                  cta="My clubs"
                />
                <StatCard
                  icon="favorite"
                  iconClass="bg-pink-100 text-pink-700"
                  label="Clubs followed"
                  value={formatCount(a.clubs_followed)}
                  caption="Not part of the score"
                  to="/clubs"
                  cta="Explore clubs"
                />
                <StatCard
                  icon="event_available"
                  iconClass="bg-purple-100 text-secondary"
                  label="Events registered"
                  value={formatCount(a.events_registered)}
                  caption="Current registrations"
                  to="/events?tab=registered"
                  cta="My registrations"
                />
                <StatCard
                  icon="how_to_reg"
                  iconClass="bg-orange-100 text-orange-700"
                  label="Events attended"
                  value={formatCount(a.events_attended)}
                  caption="Marked by the organizing club"
                />
                <StatCard
                  icon="percent"
                  iconClass="bg-emerald-100 text-emerald-800"
                  label="Attendance rate"
                  value={formatPercent(a.attendance_rate)}
                  caption="Attended ÷ registered events that have ended"
                />
                <StatCard
                  icon="star"
                  iconClass="bg-amber-100 text-amber-800"
                  label="Ratings given"
                  value={formatCount(a.ratings_given)}
                  caption="Ratings stay anonymous"
                  to="/dashboard"
                  cta="Rate recent events"
                />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
