import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { extractErrorMessage } from "../services/api";
import Navbar from "../components/Navbar";
import LoadingState from "../components/LoadingState";

export default function OperatorMembers() {
  const { user } = useAuth();

  const [club, setClub] = useState(null);
  const [activeTab, setActiveTab] = useState("approved"); // "approved" | "pending"
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState(null);

  // Modal State for Remove Member
  const [memberToRemove, setMemberToRemove] = useState(null);

  // 1. Identify operator's club
  const loadOperatorClub = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/clubs/?page_size=50");
      const list = response.data?.results || response.data || [];

      // Operator's user.name equals the club name in DRF
      let myClub = list.find((c) => c.name === user?.name);
      if (!myClub && list.length > 0) {
        myClub = list[0];
      }

      if (!myClub) {
        setError("No chartered club profile found for this operator account.");
        setLoading(false);
        return;
      }

      setClub(myClub);

      // Fetch pending requests and approved members
      const [reqRes, memRes] = await Promise.all([
        api.get(`/api/clubs/${myClub.slug}/membership-requests/`),
        api.get(`/api/clubs/${myClub.slug}/members/`),
      ]);

      setPendingRequests(reqRes.data?.results || reqRes.data || []);
      setApprovedMembers(memRes.data?.results || memRes.data || []);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load club membership roster."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOperatorClub();
  }, [loadOperatorClub]);

  // Handle Approve Application
  const handleApprove = async (membershipId) => {
    if (!club) return;
    setActionLoading((prev) => ({ ...prev, [membershipId]: true }));
    setFeedback(null);

    try {
      await api.post(`/api/clubs/${club.slug}/memberships/${membershipId}/approve/`);
      setFeedback({ type: "success", text: "Student membership approved successfully!" });

      const approvedItem = pendingRequests.find((m) => m.id === membershipId);
      if (approvedItem) {
        setPendingRequests((prev) => prev.filter((m) => m.id !== membershipId));
        setApprovedMembers((prev) => [
          ...prev,
          { ...approvedItem, status: "approved", reviewed_at: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(err, "Failed to approve membership request."),
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [membershipId]: false }));
    }
  };

  // Handle Reject Application
  const handleReject = async (membershipId) => {
    if (!club) return;
    if (!window.confirm("Are you sure you want to decline this student application?")) return;

    setActionLoading((prev) => ({ ...prev, [membershipId]: true }));
    setFeedback(null);

    try {
      await api.post(`/api/clubs/${club.slug}/memberships/${membershipId}/reject/`);
      setFeedback({ type: "info", text: "Application declined." });
      setPendingRequests((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(err, "Failed to decline application."),
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [membershipId]: false }));
    }
  };

  // Handle Remove Member Confirmation
  const confirmRemoveMember = async () => {
    if (!club || !memberToRemove) return;
    const membershipId = memberToRemove.id;
    setActionLoading((prev) => ({ ...prev, [membershipId]: true }));
    setFeedback(null);

    try {
      await api.delete(`/api/clubs/${club.slug}/memberships/${membershipId}/`);
      setFeedback({ type: "info", text: "Student removed from approved roster." });
      setApprovedMembers((prev) => prev.filter((m) => m.id !== membershipId));
      setMemberToRemove(null);
    } catch (err) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(err, "Failed to remove member."),
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [membershipId]: false }));
    }
  };

  // Distinct departments represented
  const departmentsList = useMemo(() => {
    const depts = new Set();
    approvedMembers.forEach((m) => {
      if (m.department) depts.add(m.department);
    });
    return Array.from(depts);
  }, [approvedMembers]);

  // Filtered members or requests
  const activeList = activeTab === "approved" ? approvedMembers : pendingRequests;
  const filteredList = useMemo(() => {
    return activeList.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.student_id && m.student_id.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q));

      const matchDept =
        selectedDept === "all" ||
        (m.department && m.department.toLowerCase() === selectedDept.toLowerCase());

      return matchQuery && matchDept;
    });
  }, [activeList, searchQuery, selectedDept]);

  const getInitials = (name) => {
    if (!name) return "JU";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#F8F8FF] text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-20 bg-[#F8F8FF] flex-1 pb-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {/* Feedback Alert Toast */}
          {feedback && (
            <div className="mb-6 p-4 rounded-xl shadow-xs border flex items-center justify-between gap-3 bg-white border-border-subtle animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    feedback.type === "error"
                      ? "text-error"
                      : feedback.type === "success"
                      ? "text-emerald-600"
                      : "text-primary"
                  }`}
                >
                  {feedback.type === "error" ? "error" : feedback.type === "success" ? "check_circle" : "info"}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-on-surface">
                  {feedback.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-text-muted hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* 1. HEADER & CLUB CONTEXT (Direct from Stitch Reference) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-7 pb-6 border-b border-border-subtle/70">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary font-mono">
                  YOUR CLUB COMMUNITY · ACTIVE ROSTER
                </span>
                <span className="w-6 h-[1px] bg-primary/30" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">
                Manage your <span className="font-normal italic text-primary">members</span>
              </h1>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                View verified enrolled members, coordinate student society directories, and review incoming requests.
              </p>
            </div>

            {/* Club Identity Badge Card */}
            {club && (
              <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-white border border-border-subtle shadow-xs self-start lg:self-auto hover:border-primary/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
                  {club.name ? club.name.substring(0, 2).toUpperCase() : "JU"}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-on-surface">{club.name}</span>
                    <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
                  </div>
                  <Link
                    to={`/clubs/${club.slug}`}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                  >
                    <span>Public Page</span>
                    <span className="material-symbols-outlined text-[13px]">north_east</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 2. METRICS & KEY STATS BAR (Direct from Stitch Reference) */}
          <div className="w-full bg-white rounded-2xl border border-border-subtle p-5 mb-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Metric 1 */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">badge</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-extrabold text-on-surface tracking-tight">
                    {approvedMembers.length}
                  </span>
                  <span className="text-xs text-text-muted font-medium">Total Enrolled Members</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="flex items-center gap-4 md:border-l md:border-border-subtle md:pl-6">
                <div className="w-11 h-11 rounded-xl bg-surface-lavender text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">school</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-extrabold text-on-surface tracking-tight">
                    {departmentsList.length || 1}
                  </span>
                  <span className="text-xs text-text-muted font-medium">Departments Represented</span>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="flex items-center justify-between md:border-l md:border-border-subtle md:pl-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-on-surface tracking-tight">
                        {pendingRequests.length}
                      </span>
                      {pendingRequests.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs text-text-muted font-medium">Pending Applications</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("pending")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === "pending"
                      ? "bg-primary text-white"
                      : "bg-surface-lavender text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  <span>Review Queue</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Student Privacy Policy Reminder Banner */}
          <div className="mb-6 p-3.5 rounded-xl bg-surface-lavender/50 border border-border-subtle flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
              privacy_tip
            </span>
            <p className="text-xs text-text-muted">
              <strong className="text-on-surface">Privacy Protected:</strong> Student emails are never disclosed to club operators per university security policy. Verified institutional records display academic ID, department, and admission batch only.
            </p>
          </div>

          {/* 3. SEARCH & TAB FILTER BAR (Direct from Stitch Reference) */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[19px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a member by name, student ID, or department..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-border-subtle text-on-surface placeholder:text-slate-400 text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-xs"
              />
            </div>

            {/* Tab Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("approved")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === "approved"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-white text-on-surface hover:bg-surface-lavender border border-border-subtle"
                }`}
              >
                Active Roster ({approvedMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "pending"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-white text-on-surface hover:bg-surface-lavender border border-border-subtle"
                }`}
              >
                Pending Requests ({pendingRequests.length})
                {pendingRequests.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Department Filter Pills (if departments exist) */}
          {departmentsList.length > 1 && activeTab === "approved" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDept("all")}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedDept === "all"
                    ? "bg-primary text-white"
                    : "bg-white border border-border-subtle text-slate-600 hover:text-primary"
                }`}
              >
                All Departments
              </button>
              {departmentsList.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedDept === dept
                      ? "bg-primary text-white"
                      : "bg-white border border-border-subtle text-slate-600 hover:text-primary"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {/* Loading View */}
          {loading && <LoadingState message="Synchronizing membership roster..." />}

          {/* Error View */}
          {!loading && error && (
            <div className="p-12 bg-white border border-border-subtle rounded-2xl text-center">
              <span className="material-symbols-outlined text-rose-500 text-[32px] mb-2">cloud_off</span>
              <h3 className="text-base font-bold text-on-surface">Roster synchronization error</h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={loadOperatorClub}
                className="mt-4 px-5 py-2 rounded-xl bg-surface-lavender text-primary text-xs font-bold"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* EMPTY VIEW */}
          {!loading && !error && filteredList.length === 0 && (
            <div className="p-12 bg-white border border-border-subtle rounded-2xl text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-4 mx-auto">
                <span className="material-symbols-outlined text-[32px]">
                  {activeTab === "pending" ? "mark_email_read" : "group_off"}
                </span>
              </div>
              <h3 className="text-base font-bold text-on-surface mb-1">
                {activeTab === "pending"
                  ? "No pending membership requests"
                  : "No members found"}
              </h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                {activeTab === "pending"
                  ? "All student applications have been processed. New membership requests will appear here in real time."
                  : "No student records match the active filter criteria."}
              </p>
            </div>
          )}

          {/* 4. ROSTER TABLE (Direct from Stitch Table Structure) */}
          {!loading && !error && filteredList.length > 0 && (
            <div className="flex flex-col gap-2">
              {/* Minimal Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-border-subtle/80">
                <div className="col-span-4">Student Information</div>
                <div className="col-span-3">Department &amp; Batch</div>
                <div className="col-span-2">Guild Role / Status</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Rows */}
              {filteredList.map((member) => {
                const initials = getInitials(member.name);
                const isActioning = actionLoading[member.id];

                return (
                  <div
                    key={member.id}
                    className="member-row group relative bg-white hover:bg-[#FBFBFF] rounded-xl border border-border-subtle p-3.5 md:px-5 md:py-3 transition-all duration-150 hover:shadow-xs hover:border-primary/20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
                      {/* Col 1: Student Information */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-lavender text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/10">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                              {member.name || "Student"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </div>
                          <span className="font-mono text-xs text-text-muted">
                            ID: {member.student_id || "Unverified"}
                          </span>
                        </div>
                      </div>

                      {/* Col 2: Department & Batch */}
                      <div className="col-span-3 flex flex-col justify-center">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {member.department || "General Faculty"}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          Batch {member.batch || "Regular"}
                        </span>
                      </div>

                      {/* Col 3: Guild Status */}
                      <div className="col-span-2 flex items-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            member.status === "approved"
                              ? "bg-indigo-50/70 text-primary border border-primary/15"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {member.status === "approved" ? "Enrolled Member" : "Application Pending"}
                        </span>
                      </div>

                      {/* Col 4: Date */}
                      <div className="col-span-2 flex items-center text-xs text-text-muted">
                        <span className="material-symbols-outlined text-[15px] mr-1.5 text-slate-400">
                          event
                        </span>
                        {member.requested_at
                          ? new Date(member.requested_at).toLocaleDateString()
                          : "Active"}
                      </div>

                      {/* Col 5: Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-1.5">
                        {activeTab === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(member.id)}
                              disabled={isActioning}
                              title="Approve Member"
                              className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(member.id)}
                              disabled={isActioning}
                              title="Decline Request"
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setMemberToRemove(member)}
                            title="Remove Member"
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 5. REMOVE MEMBER CONFIRMATION MODAL (Direct from Stitch Reference) */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-border-subtle shadow-2xl">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">person_remove</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-on-surface">Remove this member?</h3>
                <span className="text-[11px] text-text-muted">Student Revocation Confirmation</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This action will revoke the student’s approved membership from your club roster. They will no longer have access to club activity announcements or internal guild communications.
            </p>

            {/* Target Member Preview Card */}
            <div className="p-3 rounded-xl bg-[#F8F9FD] border border-border-subtle mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {getInitials(memberToRemove.name)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-on-surface truncate">
                  {memberToRemove.name}
                </span>
                <span className="font-mono text-[11px] text-text-muted truncate">
                  ID: {memberToRemove.student_id} · {memberToRemove.department}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveMember}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
