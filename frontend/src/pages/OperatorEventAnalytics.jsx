import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { analyticsAPI, eventsAPI, extractErrorMessage } from "../services/api";
import { BarChart, ChartFrame, ColumnChart, MetricRow, ORDINAL_5 } from "../components/charts";
import { formatCount, formatDhakaDate, formatPercent, formatRating } from "../utils/format";

/**
 * OperatorEventAnalytics — Week 8 Stage 5 (`/operator/events/:id/analytics`)
 *
 * Report 1 (department-wise participation) and report 2 (post-event rating) for one event.
 * Each report can be unavailable on its own (409): department participation needs a published,
 * ended event; ratings need a published event. Styled like the Stitch operator dashboard.
 */

function Unavailable({ icon, title, message, children }) {
  return (
    <div className="bg-surface-white border border-slate-200/60 rounded-xl p-8 flex flex-col items-center text-center gap-2">
      <span className="material-symbols-outlined text-slate-300 text-[32px]">{icon}</span>
      <p className="text-[14px] font-semibold text-on-surface">{title}</p>
      <p className="text-[13px] text-slate-500 max-w-md">{message}</p>
      {children}
    </div>
  );
}

// Promise.allSettled result → { data } or { status, message }
function settle(result, fallback) {
  if (result.status === "fulfilled") return { data: result.value.data };
  const err = result.reason;
  return { status: err.response?.status, message: err.response?.data?.detail || extractErrorMessage(err, fallback) };
}

export default function OperatorEventAnalytics() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [departments, setDepartments] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [eventRes, deptRes, ratingRes] = await Promise.allSettled([
      eventsAPI.getById(id),
      analyticsAPI.departmentParticipation(id),
      analyticsAPI.postEventRatings(id),
    ]);
    if (eventRes.status === "rejected") {
      const status = eventRes.reason.response?.status;
      setError(
        status === 404
          ? "Event not found, or it is another club's draft."
          : extractErrorMessage(eventRes.reason, "Failed to load the event.")
      );
    } else {
      setEvent(eventRes.value.data);
      setDepartments(settle(deptRes, "Failed to load department participation."));
      setRatings(settle(ratingRes, "Failed to load the rating report."));
      const forbidden = [deptRes, ratingRes].some((r) => r.status === "rejected" && r.reason.response?.status === 403);
      if (forbidden) setError("Only the organizing club's operator can view this event's reports.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const dept = departments?.data;
  const rate = ratings?.data;
  const noAttendanceYet = dept && dept.totals?.registered > 0 && dept.totals?.attended === 0;

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-20 flex-1">
        <div className="px-5 md:px-8 lg:px-14 py-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
          <Link
            to="/operator/analytics"
            className="self-start inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-primary-container"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Analytics
          </Link>

          {loading && (
            <div className="flex flex-col gap-3 animate-pulse" aria-label="Loading event reports">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
          )}

          {!loading && error && (
            <div className="bg-surface-white border border-slate-200/60 rounded-xl p-6 flex items-center justify-between gap-3">
              <span className="text-[13px] text-error">{error}</span>
              <Link to="/operator/events" className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-700">
                My events
              </Link>
            </div>
          )}

          {!loading && !error && event && (
            <>
              {/* Event headline */}
              <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-slate-200/50">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Event report</span>
                  <h1 className="text-2xl font-bold tracking-[-0.02em] text-on-surface">{event.title}</h1>
                  <p className="text-[13px] text-slate-500">
                    {event.club?.name} · {formatDhakaDate(event.starts_at)} · {event.venue} ·{" "}
                    {event.status === "cancelled" ? "Cancelled" : event.is_completed ? "Completed" : event.status === "draft" ? "Draft" : "Upcoming / ongoing"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/operator/events/${event.id}/attendees`}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface-white text-slate-700 hover:border-slate-300 text-[12px] font-medium inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px] text-slate-400">how_to_reg</span>
                    Attendees &amp; attendance
                  </Link>
                  <Link
                    to={`/events/${event.id}`}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface-white text-slate-700 hover:border-slate-300 text-[12px] font-medium inline-flex items-center gap-1.5"
                  >
                    Public page
                    <span className="material-symbols-outlined text-[13px] text-slate-400">north_east</span>
                  </Link>
                </div>
              </section>

              {/* ---------------- Report 1: department-wise participation ---------------- */}
              <section className="flex flex-col gap-5" aria-labelledby="dept-report">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Report 1</span>
                  <h2 id="dept-report" className="text-lg font-semibold tracking-tight text-on-surface">
                    Department-wise participation
                  </h2>
                </div>

                {departments?.status === 409 ? (
                  <Unavailable icon="schedule" title="Available after the event ends" message={departments.message} />
                ) : departments?.message ? (
                  <Unavailable icon="error" title="Could not load this report" message={departments.message}>
                    <button type="button" onClick={load} className="mt-2 text-[12px] font-medium text-primary-container">
                      Retry
                    </button>
                  </Unavailable>
                ) : (
                  dept && (
                    <>
                      <MetricRow
                        items={[
                          { label: "Registered", value: formatCount(dept.totals?.registered) },
                          { label: "Attended", value: formatCount(dept.totals?.attended) },
                          { label: "Attendance rate", value: formatPercent(dept.totals?.attendance_rate), caption: "Attended ÷ registered" },
                        ]}
                      />
                      {noAttendanceYet && (
                        <p className="text-[12px] text-amber-800 bg-amber-50 rounded-lg px-3.5 py-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                          No attendance has been marked for this event yet.
                          <Link to={`/operator/events/${event.id}/attendees`} className="font-semibold underline">
                            Mark attendance
                          </Link>
                        </p>
                      )}
                      <ChartFrame
                        title="Attended students by department"
                        subtitle="Most attended first · only departments with at least one registration"
                        table={{
                          columns: [
                            { key: "department", label: "Department" },
                            { key: "registered", label: "Registered", align: "right" },
                            { key: "attended", label: "Attended", align: "right" },
                            { key: "rate", label: "Attendance rate", align: "right" },
                            { key: "share", label: "Share of attended", align: "right" },
                          ],
                          rows: (dept.departments || []).map((d) => ({
                            department: d.department,
                            registered: formatCount(d.registered),
                            attended: formatCount(d.attended),
                            rate: formatPercent(d.attendance_rate),
                            share: formatPercent(d.share_of_attended),
                          })),
                        }}
                      >
                        {dept.departments?.length ? (
                          <BarChart
                            data={dept.departments.map((d) => ({
                              key: d.department,
                              label: d.department,
                              value: d.attended,
                              display: `${formatCount(d.attended)} of ${formatCount(d.registered)}`,
                            }))}
                            format={formatCount}
                            valueLabel="attended"
                          />
                        ) : (
                          <p className="text-[12px] text-slate-400 py-8 text-center">Nobody registered for this event.</p>
                        )}
                      </ChartFrame>
                    </>
                  )
                )}
              </section>

              {/* ---------------- Report 2: post-event rating ---------------- */}
              <section className="flex flex-col gap-5" aria-labelledby="rating-report">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Report 2</span>
                  <h2 id="rating-report" className="text-lg font-semibold tracking-tight text-on-surface">
                    Post-event rating
                  </h2>
                </div>

                {ratings?.status === 409 ? (
                  <Unavailable icon="star" title="No rating report for this event" message={ratings.message} />
                ) : ratings?.message ? (
                  <Unavailable icon="error" title="Could not load this report" message={ratings.message}>
                    <button type="button" onClick={load} className="mt-2 text-[12px] font-medium text-primary-container">
                      Retry
                    </button>
                  </Unavailable>
                ) : (
                  rate && (
                    <>
                      <MetricRow
                        items={[
                          {
                            label: "Average rating",
                            value: rate.average == null ? "—" : `★ ${formatRating(rate.average)}`,
                            caption: "Out of 5",
                          },
                          { label: "Ratings", value: formatCount(rate.total_ratings) },
                          { label: "Attended", value: formatCount(rate.attended) },
                          { label: "Response rate", value: formatPercent(rate.response_rate), caption: "Ratings ÷ attended" },
                        ]}
                      />
                      <ChartFrame
                        title="Rating distribution"
                        subtitle="Number of ratings at each star level · individual ratings stay anonymous"
                        table={{
                          columns: [
                            { key: "rating", label: "Rating" },
                            { key: "count", label: "Ratings", align: "right" },
                            { key: "percent", label: "Share", align: "right" },
                          ],
                          rows: (rate.distribution || []).map((b) => ({
                            rating: `${b.rating}★`,
                            count: formatCount(b.count),
                            percent: formatPercent(b.percent),
                          })),
                        }}
                      >
                        {rate.total_ratings > 0 ? (
                          <ColumnChart
                            data={(rate.distribution || []).map((b) => ({
                              key: String(b.rating),
                              label: `${b.rating}★`,
                              value: b.count,
                              detail: formatPercent(b.percent),
                            }))}
                            colors={ORDINAL_5}
                            valueLabel="ratings"
                            ariaLabel={`Rating distribution: ${(rate.distribution || [])
                              .map((b) => `${b.rating} stars ${b.count}`)
                              .join(", ")}`}
                          />
                        ) : (
                          <p className="text-[12px] text-slate-400 py-8 text-center">No ratings yet.</p>
                        )}
                      </ChartFrame>
                    </>
                  )
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
