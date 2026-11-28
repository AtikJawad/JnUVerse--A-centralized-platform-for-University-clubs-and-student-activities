import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { analyticsAPI, extractErrorMessage } from "../services/api";
import { BarChart, ChartFrame, LineChart, MetricRow, SERIES } from "../components/charts";
import { formatCount, formatDhakaDate, formatMonth, formatPercent, formatRating } from "../utils/format";

/**
 * OperatorAnalytics — Week 8 Stage 4 (`/operator/analytics`)
 *
 * Report 5 (the club's own report) and report 3 (club vs club), scoped by one date filter row.
 * No Stitch analytics screen exists: the page follows the Stitch operator-dashboard style
 * (max-w-6xl, hairline metric row, rounded-xl white cards) and the Stitch reports-interface table.
 * Charts follow the data-viz method (see components/charts/chartTheme.js).
 */

const PRESETS = [
  { key: "all", label: "All time" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "year", label: "This year" },
];

// YYYY-MM-DD in Asia/Dhaka
const dhakaDay = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

function presetRange(key) {
  const today = new Date();
  if (key === "30" || key === "90") {
    const from = new Date(today.getTime() - Number(key) * 24 * 60 * 60 * 1000);
    return { date_from: dhakaDay(from), date_to: dhakaDay(today) };
  }
  if (key === "year") return { date_from: `${dhakaDay(today).slice(0, 4)}-01-01`, date_to: dhakaDay(today) };
  return { date_from: "", date_to: "" };
}

const COMPARISON_METRICS = [
  { key: "registrations", label: "Registrations", format: (v) => formatCount(v), max: undefined },
  { key: "attendance_rate", label: "Attendance rate", format: (v) => formatPercent(v), max: 100 },
  { key: "average_rating", label: "Average rating", format: (v) => formatRating(v), max: 5 },
];

const STATUS_LABEL = { published: "Published", cancelled: "Cancelled", draft: "Draft" };

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{eyebrow}</span>
      <h2 className="text-lg font-semibold tracking-tight text-on-surface">{title}</h2>
      {description && <p className="text-[13px] text-slate-500">{description}</p>}
    </div>
  );
}

export default function OperatorAnalytics() {
  const { user } = useAuth();
  const [preset, setPreset] = useState("all");
  const [period, setPeriod] = useState({ date_from: "", date_to: "" });
  const [custom, setCustom] = useState({ date_from: "", date_to: "" });
  const [myClub, setMyClub] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [metric, setMetric] = useState("registrations");
  const requestRef = useRef(0);

  const load = useCallback(async (range) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setFilterError("");
    try {
      const [mine, compare] = await Promise.all([analyticsAPI.myClub(range), analyticsAPI.clubComparison(range)]);
      if (requestId !== requestRef.current) return;
      setMyClub(mine.data);
      setComparison(compare.data);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      const data = err.response?.data;
      if (err.response?.status === 400 && data) {
        setFilterError([data.date_from, data.date_to, data.detail].flat().filter(Boolean).join(" "));
      } else {
        setError(extractErrorMessage(err, "Failed to load analytics."));
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [load, period]);

  const choosePreset = (key) => {
    setPreset(key);
    const range = presetRange(key);
    setCustom(range);
    setPeriod(range);
  };

  const applyCustom = (e) => {
    e.preventDefault();
    if (custom.date_from && custom.date_to && custom.date_from > custom.date_to) {
      setFilterError("The end date must not be before the start date.");
      return;
    }
    setPreset("custom");
    setPeriod({ ...custom });
  };

  const summary = myClub?.summary || {};
  const monthly = myClub?.monthly || [];
  const events = myClub?.events || [];

  const comparisonMetric = COMPARISON_METRICS.find((m) => m.key === metric);
  const comparisonBars = useMemo(() => {
    const rows = comparison?.clubs || [];
    return rows
      .map((row) => ({
        key: row.club?.slug || row.club?.id,
        label: row.club?.name,
        value: typeof row[metric] === "number" ? row[metric] : 0,
        display: comparisonMetric.format(row[metric]),
        highlight: row.is_mine,
        hasValue: typeof row[metric] === "number",
      }))
      .sort((a, b) => Number(b.hasValue) - Number(a.hasValue) || b.value - a.value || a.label.localeCompare(b.label));
  }, [comparison, metric, comparisonMetric]);

  const periodLabel =
    preset === "all"
      ? "All time"
      : `${period.date_from || "…"} to ${period.date_to || "…"} (event start date)`;

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-20 flex-1">
        <div className="px-5 md:px-8 lg:px-14 py-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
          {/* Editorial headline */}
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-slate-200/50">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-on-surface">Analytics</h1>
              <p className="text-[13px] text-slate-500">
                {myClub?.club?.name || user?.club?.name || "Your club"} · {formatCount(summary.followers)} followers ·{" "}
                {formatCount(summary.members)} members
              </p>
            </div>
            <Link
              to="/operator/events"
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface-white text-slate-700 hover:text-slate-900 hover:border-slate-300 text-[12px] font-medium transition-all inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              Per-event reports
              <span className="material-symbols-outlined text-[13px] text-slate-400">north_east</span>
            </Link>
          </section>

          {/* One filter row above everything it scopes */}
          <section className="flex flex-col gap-2" aria-label="Date filter">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100" role="group" aria-label="Date range presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => choosePreset(p.key)}
                    aria-pressed={preset === p.key}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                      preset === p.key ? "bg-surface-white text-on-surface shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <form onSubmit={applyCustom} className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                <label className="flex items-center gap-1.5">
                  From
                  <input
                    type="date"
                    value={custom.date_from}
                    onChange={(e) => setCustom({ ...custom, date_from: e.target.value })}
                    className="text-[12px] bg-surface-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-container"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  To
                  <input
                    type="date"
                    value={custom.date_to}
                    onChange={(e) => setCustom({ ...custom, date_to: e.target.value })}
                    className="text-[12px] bg-surface-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-container"
                  />
                </label>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-primary-container hover:bg-primary-hover text-white text-[12px] font-medium transition-colors"
                >
                  Apply
                </button>
              </form>
            </div>
            <p className="text-[12px] text-slate-400">Showing: {periodLabel}</p>
            {filterError && (
              <p className="text-[12px] text-error" role="alert">
                {filterError}
              </p>
            )}
          </section>

          {!myClub && loading && (
            <div className="flex flex-col gap-3 animate-pulse" aria-label="Loading analytics">
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
          )}

          {error && (
            <div className="bg-surface-white border border-slate-200/60 rounded-xl p-6 flex items-center justify-between gap-3">
              <span className="text-[13px] text-error">{error}</span>
              <button
                type="button"
                onClick={() => load(period)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-700 hover:border-slate-300"
              >
                Retry
              </button>
            </div>
          )}

          {myClub && comparison && (
            // Refetch keeps the frame: previous render at reduced opacity while loading
            <div className={`flex flex-col gap-10 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
              {/* ---------------- Report 5: the club's own report ---------------- */}
              <section className="flex flex-col gap-5" aria-labelledby="my-club-report">
                <SectionTitle
                  eyebrow="Report 5"
                  title={<span id="my-club-report">Your club&apos;s performance</span>}
                  description="Launched events are published or cancelled; attendance and ratings count completed events only."
                />
                <MetricRow
                  items={[
                    {
                      label: "Events launched",
                      value: formatCount(summary.events_launched),
                      caption: `${formatCount(summary.completed_events)} completed · ${formatCount(summary.cancelled_events)} cancelled`,
                    },
                    {
                      label: "Registrations",
                      value: formatCount(summary.registrations),
                      caption: `${formatPercent(summary.registration_rate)} of capacity`,
                    },
                    {
                      label: "Attendance rate",
                      value: formatPercent(summary.attendance_rate),
                      caption: `${formatCount(summary.attended)} attended`,
                    },
                    {
                      label: "Average rating",
                      value: summary.average_rating == null ? "—" : `★ ${formatRating(summary.average_rating)}`,
                      caption: `${formatCount(summary.rating_count)} ratings`,
                    },
                  ]}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2">
                    <ChartFrame
                      title="Registrations and attendance by month"
                      subtitle="Grouped by event start month, oldest first"
                      legend={[
                        { label: "Registrations", color: SERIES[0], shape: "line" },
                        { label: "Attended", color: SERIES[1], shape: "line" },
                      ]}
                      table={{
                        columns: [
                          { key: "month", label: "Month" },
                          { key: "events", label: "Events", align: "right" },
                          { key: "registrations", label: "Registrations", align: "right" },
                          { key: "attended", label: "Attended", align: "right" },
                          { key: "rating", label: "Avg rating", align: "right" },
                        ],
                        rows: monthly.map((m) => ({
                          month: formatMonth(m.month),
                          events: formatCount(m.events_launched),
                          registrations: formatCount(m.registrations),
                          attended: formatCount(m.attended),
                          rating: formatRating(m.average_rating),
                        })),
                      }}
                    >
                      {monthly.length === 0 ? (
                        <p className="text-[12px] text-slate-400 py-10 text-center">No launched events in this period.</p>
                      ) : (
                        <LineChart
                          xLabels={monthly.map((m) => formatMonth(m.month))}
                          series={[
                            { key: "registrations", name: "Registrations", color: SERIES[0], values: monthly.map((m) => m.registrations) },
                            { key: "attended", name: "Attended", color: SERIES[1], values: monthly.map((m) => m.attended) },
                          ]}
                          format={(v) => formatCount(v)}
                          ariaLabel={`Registrations and attendance by month: ${monthly
                            .map((m) => `${formatMonth(m.month)} ${m.registrations} registered, ${m.attended} attended`)
                            .join("; ")}`}
                        />
                      )}
                    </ChartFrame>
                  </div>

                  {/* Best rated event */}
                  <div className="bg-surface-white border border-slate-200/60 rounded-xl p-6 flex flex-col gap-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Best rated event</span>
                    {myClub.best_rated_event ? (
                      <>
                        <span className="text-[15px] font-semibold text-on-surface">{myClub.best_rated_event.title}</span>
                        <span className="text-3xl font-bold tracking-tight text-on-surface">
                          ★ {formatRating(myClub.best_rated_event.average_rating)}
                        </span>
                        <span className="text-[12px] text-slate-400">
                          {formatCount(myClub.best_rated_event.rating_count)} ratings
                        </span>
                        <Link
                          to={`/operator/events/${myClub.best_rated_event.id}/analytics`}
                          className="text-[12px] font-medium text-primary-container hover:text-primary-hover inline-flex items-center gap-1 min-h-6"
                        >
                          Event report
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                      </>
                    ) : (
                      <p className="text-[13px] text-slate-400">No rated events in this period.</p>
                    )}
                  </div>
                </div>

                {/* Per-event comparison table (Stitch reports-interface table style) */}
                <div className="bg-surface-white border border-slate-200/60 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-on-surface">Events</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-bold">
                      {events.length}
                    </span>
                  </div>
                  {events.length === 0 ? (
                    <p className="px-5 pb-6 text-[13px] text-slate-400">No launched events in this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-surface-lavender/40 text-text-muted text-[11px] uppercase tracking-wider">
                            <th scope="col" className="py-3 px-4 font-bold">Event</th>
                            <th scope="col" className="py-3 px-4 font-bold">Starts</th>
                            <th scope="col" className="py-3 px-4 font-bold text-right">Registered</th>
                            <th scope="col" className="py-3 px-4 font-bold text-right">Fill rate</th>
                            <th scope="col" className="py-3 px-4 font-bold text-right">Attended</th>
                            <th scope="col" className="py-3 px-4 font-bold text-right">Attendance</th>
                            <th scope="col" className="py-3 px-4 font-bold text-right">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((e, i) => (
                            <tr key={e.id} className={`hover:bg-surface-lavender/25 ${i % 2 === 1 ? "bg-surface-lavender/10" : ""}`}>
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Link to={`/operator/events/${e.id}/analytics`} className="font-semibold text-on-surface hover:text-primary">
                                    {e.title}
                                  </Link>
                                  <span className="text-[11px] text-text-muted">
                                    {e.status === "published" && !e.is_completed ? "Upcoming / ongoing" : STATUS_LABEL[e.status] || e.status}
                                    {e.is_completed ? " · Completed" : ""}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-text-muted whitespace-nowrap">{formatDhakaDate(e.starts_at)}</td>
                              <td className="py-3 px-4 text-right tabular-nums">
                                {formatCount(e.registered)}
                                {e.capacity ? <span className="text-text-muted"> / {e.capacity}</span> : null}
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums">{formatPercent(e.fill_rate)}</td>
                              <td className="py-3 px-4 text-right tabular-nums">{formatCount(e.attended)}</td>
                              <td className="py-3 px-4 text-right tabular-nums">{formatPercent(e.attendance_rate)}</td>
                              <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                                {e.average_rating == null ? "—" : `★ ${formatRating(e.average_rating)}`}
                                <span className="text-text-muted"> ({formatCount(e.rating_count)})</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {/* ---------------- Report 3: club vs club ---------------- */}
              <section className="flex flex-col gap-5" aria-labelledby="comparison-report">
                <SectionTitle
                  eyebrow="Report 3"
                  title={<span id="comparison-report">Club vs club</span>}
                  description="Every club on JnUVerse for the same period. Your club is highlighted."
                />
                <ChartFrame
                  title={`${comparisonMetric.label} by club`}
                  subtitle="Ranked highest first · clubs without a value show “—”"
                  table={{
                    columns: [
                      { key: "club", label: "Club" },
                      { key: "launched", label: "Launched", align: "right" },
                      { key: "completed", label: "Completed", align: "right" },
                      { key: "cancelled", label: "Cancelled", align: "right" },
                      { key: "registrations", label: "Registrations", align: "right" },
                      { key: "regRate", label: "Reg. rate", align: "right" },
                      { key: "attended", label: "Attended", align: "right" },
                      { key: "attRate", label: "Attendance", align: "right" },
                      { key: "rating", label: "Rating", align: "right" },
                    ],
                    rows: (comparison.clubs || []).map((c) => ({
                      club: c.is_mine ? `${c.club?.name} (you)` : c.club?.name,
                      launched: formatCount(c.events_launched),
                      completed: formatCount(c.completed_events),
                      cancelled: formatCount(c.cancelled_events),
                      registrations: formatCount(c.registrations),
                      regRate: formatPercent(c.registration_rate),
                      attended: formatCount(c.attended),
                      attRate: formatPercent(c.attendance_rate),
                      rating: c.average_rating == null ? "—" : `${formatRating(c.average_rating)} (${c.rating_count})`,
                    })),
                  }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex self-start p-0.5 rounded-lg bg-slate-100" role="group" aria-label="Comparison measure">
                      {COMPARISON_METRICS.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setMetric(m.key)}
                          aria-pressed={metric === m.key}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            metric === m.key ? "bg-surface-white text-on-surface shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <BarChart
                      data={comparisonBars}
                      emphasis
                      max={comparisonMetric.max}
                      format={comparisonMetric.format}
                      valueLabel={comparisonMetric.label.toLowerCase()}
                    />
                  </div>
                </ChartFrame>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
