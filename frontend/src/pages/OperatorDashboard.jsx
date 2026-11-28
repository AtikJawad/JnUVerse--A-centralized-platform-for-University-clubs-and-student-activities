import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ClubLogo from "../components/ClubLogo";
import api, { clubsAPI, dashboardAPI, extractErrorMessage } from "../services/api";

/**
 * OperatorDashboard — Week 7 Stage 5
 *
 * Built against Stitch `jnuverse_club_operator_dashboard_minimal_redesign/code.html`:
 * editorial club headline, hairline metric row, Membership Requests list with inline
 * Approve / Reject, Public Snapshot and Quick Actions. Data: GET /api/dashboard/club/,
 * GET /api/clubs/:slug/ and GET /api/clubs/:slug/membership-requests/.
 * The Stitch sidebar is replaced by the shared Navbar used on every operator page.
 */

const dhaka = (iso, options) =>
  iso ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", ...options }).format(new Date(iso)) : "";
const shortDate = (iso) => dhaka(iso, { month: "short", day: "numeric" });

function appliedAgo(iso) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Applied today";
  if (days === 1) return "Applied yesterday";
  return `Applied ${days} days ago`;
}

/** One cell of the Stitch hairline metric row. */
function Metric({ label, value, valueClass = "text-on-surface", note, noteClass = "text-slate-400", caption, to, dot }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-3xl font-bold tracking-tight ${valueClass}`}>{value}</span>
        {note && <span className={`text-[11px] font-medium ${noteClass}`}>{note}</span>}
      </div>
      <span className="text-[12px] text-slate-400">{caption}</span>
    </>
  );
  return to ? (
    <Link to={to} className="px-6 py-5 flex flex-col gap-1 hover:bg-surface-lavender/40 transition-colors">
      {body}
    </Link>
  ) : (
    <div className="px-6 py-5 flex flex-col gap-1">{body}</div>
  );
}

const sectionCard = "bg-surface-white border border-slate-200/60 rounded-xl";

export default function OperatorDashboard() {
  const { user } = useAuth();
  const slug = user?.club?.slug;

  const [dashboard, setDashboard] = useState(null);
  const [club, setClub] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [rowBusy, setRowBusy] = useState({});
  const [toast, setToast] = useState(null);

  const loadAll = useCallback(async () => {
    if (!slug) {
      setError("No club is linked to this operator account.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [dashRes, clubRes, reqRes] = await Promise.all([
        dashboardAPI.club(),
        clubsAPI.getBySlug(slug),
        api.get(`/api/clubs/${slug}/membership-requests/`, { params: { page_size: 50 } }),
      ]);
      setDashboard(dashRes.data);
      setClub(clubRes.data);
      setRequests(reqRes.data?.results || []);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load your club dashboard."));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [r.name, r.department, r.student_id].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [requests, search]);

  // Approve / reject inline (same endpoints as the Members page); counts refresh from the server
  const decide = async (request, action) => {
    setRowBusy((prev) => ({ ...prev, [request.id]: action }));
    try {
      await api.post(`/api/clubs/${slug}/memberships/${request.id}/${action}/`);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      setToast({
        type: "success",
        text: action === "approve" ? `${request.name} is now a member.` : `${request.name}'s request was rejected.`,
      });
      dashboardAPI
        .club()
        .then((res) => setDashboard(res.data))
        .catch(() => {});
    } catch (err) {
      setToast({ type: "error", text: extractErrorMessage(err, `Failed to ${action} this request.`) });
    } finally {
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
    }
  };

  const counts = dashboard?.counts || {};
  const ratings = dashboard?.ratings || {};
  const clubName = club?.name || dashboard?.club?.name || user?.club?.name || "Your Club";
  const publicPath = slug ? `/clubs/${slug}` : "/clubs";

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-20 flex-1">
        <div className="px-5 md:px-8 lg:px-14 py-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
          {/* Club Editorial Headline */}
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-slate-200/50">
            <div className="flex items-center gap-4">
              <ClubLogo
                src={club?.logo}
                name={clubName}
                className="w-12 h-12 rounded-xl bg-surface-lavender text-primary-container flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[24px]">groups</span>
              </ClubLogo>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-[-0.02em] text-on-surface">{clubName}</h1>
                  <span
                    className="material-symbols-outlined text-primary-container text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">Chartered Guild · @{slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/operator/analytics"
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface-white text-slate-700 hover:text-slate-900 hover:border-slate-300 text-[12px] font-medium transition-all inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px] text-slate-400">insights</span>
                <span>Analytics</span>
              </Link>
              <Link
                to={publicPath}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface-white text-slate-700 hover:text-slate-900 hover:border-slate-300 text-[12px] font-medium transition-all inline-flex items-center gap-1.5"
              >
                <span>Public Page</span>
                <span className="material-symbols-outlined text-[13px] text-slate-400">north_east</span>
              </Link>
              <Link
                to={publicPath}
                className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary-hover text-[12px] font-medium transition-all"
              >
                Edit Profile
              </Link>
            </div>
          </section>

          {/* Loading: Stitch minimal shimmer */}
          {loading && (
            <div className="flex flex-col gap-3 animate-pulse" aria-label="Loading dashboard">
              <div className="h-28 bg-slate-100 rounded-xl w-full" />
              <div className="h-10 bg-slate-100 rounded-md w-full" />
              <div className="h-10 bg-slate-100 rounded-md w-full" />
              <div className="h-10 bg-slate-100 rounded-md w-full" />
            </div>
          )}

          {!loading && error && (
            <div className={`${sectionCard} p-6 flex items-center justify-between gap-3`}>
              <span className="text-[13px] text-error">{error}</span>
              <button
                type="button"
                onClick={loadAll}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-700 hover:border-slate-300"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && dashboard && (
            <>
              {/* Minimal Metric Hairline Rows */}
              <section className="flex flex-col gap-4" aria-label="Club metrics">
                <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 ${sectionCard} overflow-hidden`}>
                  <Metric
                    label="Approved Members"
                    value={counts.members ?? 0}
                    caption="Approved student members"
                    to="/operator/members"
                  />
                  <Metric
                    label="Pending Requests"
                    value={counts.pending_membership_requests ?? 0}
                    valueClass="text-primary-container"
                    note={counts.pending_membership_requests > 0 ? "Action needed" : "All clear"}
                    caption="Awaiting your review"
                    dot={counts.pending_membership_requests > 0}
                    to="/operator/members"
                  />
                  <Metric
                    label="Campus Followers"
                    value={counts.followers ?? 0}
                    note="Network reach"
                    caption="Students following your club"
                  />
                </div>
                <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 ${sectionCard} overflow-hidden`}>
                  <Metric
                    label="Upcoming Events"
                    value={counts.upcoming_events ?? 0}
                    note={
                      dashboard.registrations_last_7_days > 0
                        ? `+${dashboard.registrations_last_7_days} registrations this week`
                        : "No new registrations this week"
                    }
                    noteClass={dashboard.registrations_last_7_days > 0 ? "text-emerald-600" : "text-slate-400"}
                    caption={`${counts.draft_events ?? 0} draft${counts.draft_events === 1 ? "" : "s"} not yet published`}
                    to="/operator/events"
                  />
                  <Metric
                    label="Collaboration Requests"
                    value={counts.pending_collaboration_requests ?? 0}
                    valueClass={counts.pending_collaboration_requests > 0 ? "text-primary-container" : "text-on-surface"}
                    note={counts.pending_collaboration_requests > 0 ? "Awaiting response" : "None pending"}
                    caption="Received from other clubs"
                    dot={counts.pending_collaboration_requests > 0}
                    to="/operator/collaborations"
                  />
                  <Metric
                    label="Club Rating"
                    value={typeof ratings.average === "number" ? `★ ${ratings.average.toFixed(1)}` : "—"}
                    note={`${ratings.count || 0} rating${ratings.count === 1 ? "" : "s"}`}
                    caption="Across all ended events"
                  />
                </div>
              </section>

              {/* Core Section: Membership Requests */}
              <section className={`${sectionCard} p-6 sm:p-7 flex flex-col gap-5`} aria-labelledby="requests-heading">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <h2 id="requests-heading" className="text-base font-semibold tracking-tight text-on-surface">
                      Membership Requests
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-primary-container text-[11px] font-semibold">
                      {counts.pending_membership_requests ?? requests.length} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or department..."
                      aria-label="Search membership requests"
                      className="w-56 text-[12px] bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-all"
                    />
                    <Link to="/operator/members" className="text-[12px] font-medium text-slate-500 hover:text-primary-container transition-colors">
                      View all
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[12px] text-slate-400 bg-slate-50/70 px-3.5 py-2 rounded-lg border border-slate-100">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">lock</span>
                  <span>Student institutional emails are protected under Jagannath University privacy standards.</span>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <span className="material-symbols-outlined text-slate-300 text-[28px] mb-2">check_circle</span>
                    <p className="text-[13px] font-medium text-slate-700">
                      {requests.length === 0 ? "No pending requests" : "No requests match your search"}
                    </p>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {requests.length === 0 ? "All student applications have been processed." : "Try another name or department."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredRequests.slice(0, 5).map((request) => (
                      <div key={request.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-on-surface truncate">{request.name}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[12px] text-slate-500 font-mono">{request.student_id}</span>
                          </div>
                          <p className="text-[12px] text-slate-500">
                            Batch {request.batch} · {request.department} ·{" "}
                            <span className="text-slate-400">{appliedAgo(request.requested_at)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => decide(request, "approve")}
                            disabled={Boolean(rowBusy[request.id])}
                            className="px-3 py-1 rounded-md bg-primary-container hover:bg-primary-hover text-white text-[12px] font-medium transition-colors disabled:opacity-60"
                          >
                            {rowBusy[request.id] === "approve" ? "Approving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(request, "reject")}
                            disabled={Boolean(rowBusy[request.id])}
                            className="px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-[12px] font-medium transition-colors disabled:opacity-60"
                          >
                            {rowBusy[request.id] === "reject" ? "Rejecting…" : "Reject"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {filteredRequests.length > 5 && (
                  <Link to="/operator/members" className="self-start text-[12px] font-medium text-primary-container hover:text-primary-hover">
                    View {filteredRequests.length - 5} more →
                  </Link>
                )}
              </section>

              {/* Events: next (published, not ended) and recent (ended, with ratings) */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch" aria-label="Club events">
                {[
                  {
                    key: "next",
                    title: "Next Events",
                    items: dashboard.next_events || [],
                    empty: "No published upcoming events.",
                    meta: (e) =>
                      `${shortDate(e.starts_at)} · ${e.registered_count}${e.capacity ? ` / ${e.capacity}` : ""} registered`,
                  },
                  {
                    key: "recent",
                    title: "Recent Events",
                    items: dashboard.recent_events || [],
                    empty: "No ended events yet.",
                    meta: (e) =>
                      `Ended ${shortDate(e.ends_at)} · ${
                        e.rating_count > 0 && typeof e.average_rating === "number"
                          ? `★ ${e.average_rating.toFixed(1)} (${e.rating_count})`
                          : "No ratings yet"
                      }`,
                  },
                ].map((col) => (
                  <div key={col.key} className={`${sectionCard} p-6 flex flex-col gap-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{col.title}</span>
                      <Link to="/operator/events" className="text-[12px] font-medium text-slate-500 hover:text-primary-container">
                        Manage →
                      </Link>
                    </div>
                    {col.items.length === 0 ? (
                      <p className="text-[12px] text-slate-400 py-4">{col.empty}</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-slate-100">
                        {col.items.map((e) => (
                          <Link
                            key={e.id}
                            to={col.key === "recent" ? `/operator/events/${e.id}/analytics` : `/events/${e.id}`}
                            className="py-2.5 flex items-center justify-between gap-3 text-[13px] text-slate-700 hover:text-primary-container transition-colors group"
                          >
                            <span className="font-medium truncate">{e.title}</span>
                            <span className="text-[12px] text-slate-400 group-hover:text-primary-container shrink-0">
                              {col.meta(e)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>

              {/* Bottom Balanced 2-Column Grid: Public Snapshot + Quick Actions */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <div className={`${sectionCard} p-6 flex flex-col justify-between gap-5`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Public Snapshot</span>
                      <span className="text-[11px] text-slate-400 font-mono">@{slug}</span>
                    </div>
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      {club?.description || "No description yet. Add one from Edit Profile so students know what your club does."}
                    </p>
                    {club?.interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {club.interests.map((i) => (
                          <span key={i.id} className="px-2.5 py-0.5 text-[11px] rounded bg-slate-100/80 text-slate-600 font-medium">
                            {i.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-400">
                    <span>
                      {counts.followers ?? 0} followers · {counts.members ?? 0} members
                    </span>
                    <Link to={publicPath} className="text-primary-container hover:text-primary-hover font-medium inline-flex items-center gap-1">
                      <span>View live</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                <div className={`${sectionCard} p-6 flex flex-col justify-between gap-4`}>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Quick Actions</span>
                  <div className="flex flex-col divide-y divide-slate-100">
                    {[
                      ["/operator/members", "Manage Members Roster", `${counts.members ?? 0} enrolled →`],
                      [publicPath, "Update Club Profile", "Logo, interests & contact →"],
                      ["/operator/events", "Manage Events", `${counts.upcoming_events ?? 0} upcoming · ${counts.draft_events ?? 0} drafts →`],
                      ["/operator/analytics", "View Analytics", "Reports & trends →"],
                      ["/operator/notices", "Post a Notice", "Announcements →"],
                      ["/operator/collaborations", "Collaborations", `${counts.pending_collaboration_requests ?? 0} pending →`],
                    ].map(([to, label, meta]) => (
                      <Link
                        key={label}
                        to={to}
                        className="py-2.5 flex items-center justify-between text-[13px] text-slate-700 hover:text-primary-container transition-colors group"
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-[12px] text-slate-400 group-hover:text-primary-container">{meta}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="pt-2 text-[11px] text-slate-400">Jagannath University Student Club System</div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Minimal bottom toast (Stitch) */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-[12px] font-medium ${
            toast.type === "error" ? "bg-error text-white" : "bg-slate-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
