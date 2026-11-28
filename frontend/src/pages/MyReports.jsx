import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { fetchAllPages, extractErrorMessage, REPORT_REASONS, REPORT_STATUS_LABELS } from "../services/api";

/**
 * MyReports — Week 7 Stage 6 (students and club operators)
 *
 * Built against Stitch `jnuverse_reports_interface/code.html`: metadata strip with scope pill,
 * editorial header with context banner, summary quick-strip, "Activity Log" table with status
 * pills, institutional notice, and the empty / skeleton / error views.
 * Data: GET /api/reports/ (the user's own reports only).
 */

const STATUS_STYLE = {
  open: { pill: "bg-surface-lavender text-primary", dot: "bg-primary" },
  under_review: { pill: "bg-secondary-container/40 text-on-secondary-container", dot: "bg-primary-container" },
  resolved: { pill: "bg-tertiary-fixed text-[#001A41]", dot: "bg-[#1B3158]" },
  dismissed: { pill: "bg-surface-container-high text-on-surface", dot: "bg-slate-400" },
};

const REASON_LABELS = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

const formatDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "short", day: "numeric", year: "numeric" }).format(
        new Date(iso)
      )
    : "";

const reportCode = (id) => `REP-${String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;

function SummaryTile({ label, value, valueClass = "text-on-surface", icon, iconClass }) {
  return (
    <div className="bg-surface-white p-4 rounded-xl shadow-sm flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase text-text-muted font-bold tracking-wider">{label}</span>
        <span className={`text-2xl font-extrabold mt-0.5 ${valueClass}`}>{value}</span>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconClass}`}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await fetchAllPages("/api/reports/"));
    } catch (err) {
      setError({ status: err.response?.status, message: extractErrorMessage(err, "Failed to load your reports.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: reports.length,
      inReview: reports.filter((r) => r.status === "open" || r.status === "under_review").length,
      closed: reports.filter((r) => r.status === "resolved" || r.status === "dismissed").length,
    }),
    [reports]
  );

  const isOperator = user?.role === "club_operator";
  const portal = isOperator ? "Operator Portal" : "Student Portal";

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-20 flex-1">
        <div className="px-5 md:px-8 py-6 flex flex-col gap-6 max-w-[1360px] mx-auto w-full">
          {/* Top metadata breadcrumb & scope pill */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-surface-lavender px-3 py-1 rounded-full">
                Reporting
              </span>
              <span className="text-text-muted text-[11px]">•</span>
              <span className="text-xs font-semibold text-text-muted">
                {user?.name} — {portal}
              </span>
            </div>
            <div className="flex items-center gap-2.5 bg-surface-white px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span className="text-[11px] font-bold text-on-surface">Your reports only • Private to your account</span>
            </div>
          </div>

          {/* Editorial header & asymmetric context banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 flex flex-col gap-2">
              <h1 className="text-[32px] leading-10 font-bold tracking-tight text-on-surface">My Reports</h1>
              <p className="text-[15px] leading-6 text-text-muted max-w-2xl">
                Clubs and events you reported as inappropriate, and where each report stands.
              </p>
            </div>
            <div className="lg:col-span-5 bg-surface-white rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-surface-lavender rounded-full opacity-60 pointer-events-none" />
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-surface-lavender flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">How reports work</span>
                  <p className="text-[13px] leading-5 text-on-surface font-medium">
                    The JnUVerse team reviews every report. Reported clubs never see who reported them, and reports
                    cannot be edited or withdrawn.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* View 3: Skeleton loading state */}
          {loading && (
            <div className="flex flex-col gap-4" aria-label="Loading reports">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["w-20", "w-28", "w-32"].map((w) => (
                  <div key={w} className="bg-surface-white p-4 rounded-xl shadow-sm animate-pulse flex flex-col gap-2">
                    <div className={`h-3 ${w} bg-surface-lavender rounded`} />
                    <div className="h-8 w-12 bg-surface-lavender rounded mt-1" />
                  </div>
                ))}
              </div>
              <div className="bg-surface-white rounded-xl p-4 shadow-sm flex flex-col gap-4 animate-pulse">
                <div className="flex justify-between items-center pb-2">
                  <div className="h-6 w-32 bg-surface-lavender rounded" />
                  <div className="h-4 w-48 bg-surface-lavender rounded" />
                </div>
                <div className="h-12 bg-surface-lavender/50 rounded-lg w-full" />
                <div className="h-12 bg-surface-lavender/50 rounded-lg w-full" />
                <div className="h-12 bg-surface-lavender/50 rounded-lg w-full" />
              </div>
            </div>
          )}

          {/* View 4: API error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center p-10 sm:p-16 bg-surface-white rounded-xl shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">warning</span>
              </div>
              {error.status && (
                <div className="px-3 py-1 rounded-full bg-error-container text-on-error-container font-mono font-bold text-[11px] mb-2">
                  HTTP {error.status}
                </div>
              )}
              <h3 className="text-2xl font-bold tracking-tight text-on-surface">Failed to load your reports</h3>
              <p className="text-[15px] leading-6 text-text-muted max-w-md mt-2">{error.message}</p>
              <button
                type="button"
                onClick={load}
                className="mt-6 px-6 py-2.5 rounded-full bg-primary-container text-on-primary text-sm font-medium shadow-sm hover:bg-primary-hover transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Retry
              </button>
            </div>
          )}

          {/* View 2: Empty state */}
          {!loading && !error && reports.length === 0 && (
            <div className="flex flex-col items-center justify-center p-10 sm:p-16 bg-surface-white rounded-xl shadow-sm text-center">
              <div className="w-20 h-20 rounded-full bg-surface-lavender flex items-center justify-center text-primary mb-4 shadow-sm">
                <span className="material-symbols-outlined text-[36px]">folder_off</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-on-surface">No reports to display.</h3>
              <p className="text-[15px] leading-6 text-text-muted max-w-md mt-2">
                If a club or event breaks the rules, use the Report button on its page. Your reports will appear here.
              </p>
              <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-canvas-base text-text-muted text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Scope Status: Clear • You have not reported anything
              </div>
            </div>
          )}

          {/* View 1: Active reports list */}
          {!loading && !error && reports.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryTile label="Total Filed" value={summary.total} icon="assignment" iconClass="bg-surface-lavender text-primary-container" />
                <SummaryTile
                  label="In Review"
                  value={summary.inReview}
                  valueClass="text-primary-container"
                  icon="sync"
                  iconClass="bg-secondary-container/30 text-primary-hover"
                />
                <SummaryTile
                  label="Resolved / Dismissed"
                  value={summary.closed}
                  icon="inventory_2"
                  iconClass="bg-surface-container-high text-on-surface"
                />
              </div>

              <div className="bg-surface-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-surface-white flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-on-surface">Activity Log</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-bold">
                      {reports.length} Record{reports.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Visible only to you
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-lavender/40 text-text-muted text-[11px] uppercase tracking-wider">
                        <th scope="col" className="py-3 px-4 font-bold">Report</th>
                        <th scope="col" className="py-3 px-4 font-bold">Reported Club / Event</th>
                        <th scope="col" className="py-3 px-4 font-bold">Status</th>
                        <th scope="col" className="py-3 px-4 font-bold">Filed On</th>
                        <th scope="col" className="py-3 px-4 font-bold text-right">Type</th>
                      </tr>
                    </thead>
                    <tbody className="text-on-surface text-[13px]">
                      {reports.map((report, index) => {
                        const style = STATUS_STYLE[report.status] || STATUS_STYLE.open;
                        const isClub = report.target_type === "club";
                        const targetName = isClub ? report.club?.name : report.event?.title;
                        const targetPath = isClub
                          ? report.club?.slug && `/clubs/${report.club.slug}`
                          : report.event?.id && `/events/${report.event.id}`;
                        return (
                          <tr
                            key={report.id}
                            className={`hover:bg-surface-lavender/25 transition-colors ${index % 2 === 1 ? "bg-surface-lavender/10" : ""}`}
                          >
                            <td className="py-4 px-4 font-semibold text-primary font-mono whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-text-muted">description</span>
                                {reportCode(report.id)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                {targetPath ? (
                                  <Link to={targetPath} className="font-semibold text-on-surface text-[15px] hover:text-primary">
                                    {targetName || "Unavailable"}
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-on-surface text-[15px]">{targetName || "Unavailable"}</span>
                                )}
                                <span className="text-text-muted text-[11px] font-bold">
                                  {REASON_LABELS[report.reason] || report.reason}
                                  {report.details ? ` • ${report.details}` : ""}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${style.pill}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {REPORT_STATUS_LABELS[report.status] || report.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-text-muted font-medium whitespace-nowrap">{formatDate(report.created_at)}</td>
                            <td className="py-4 px-4 text-right">
                              <span className="px-2.5 py-1 rounded-lg bg-surface-lavender text-text-muted text-[11px] font-bold">
                                {isClub ? "Club" : "Event"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-canvas-base flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">info</span>
                  <p className="text-[13px] leading-5 text-text-muted">
                    <strong className="text-on-surface font-semibold">Notice:</strong> Reports do not hide a club or event
                    automatically and no one is notified. The JnUVerse team updates the status after reviewing each report.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
