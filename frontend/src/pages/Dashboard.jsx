import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
              JnU
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">JnUVerse</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-indigo-600 bg-indigo-50 font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                {user?.role === "club_operator" ? "Club Operator" : "Student"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden md:inline-block text-sm text-slate-600">
              Signed in as <strong className="text-slate-800">{user?.name || user?.email}</strong>
            </span>
            <button
              onClick={logout}
              className="px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome back, {user?.name || "Member"}!
              </h1>
              <p className="mt-1 text-slate-500 text-sm">
                Centralized platform for Jagannath University clubs, activities, and campus events.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                Authenticated (Week 2 Foundation)
              </span>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Account Overview
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase font-semibold text-slate-400">Account Role</dt>
                <dd className="mt-0.5 capitalize font-medium text-slate-800">
                  {user?.role ? user.role.replace("_", " ") : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase font-semibold text-slate-400">Email</dt>
                <dd className="mt-0.5 font-medium text-slate-800 break-all">{user?.email || "N/A"}</dd>
              </div>
              {user?.student_id && (
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Student ID</dt>
                  <dd className="mt-0.5 font-mono font-medium text-slate-800">{user.student_id}</dd>
                </div>
              )}
              {user?.department && (
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Department</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{user.department}</dd>
                </div>
              )}
              {user?.batch && (
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Batch</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{user.batch}</dd>
                </div>
              )}
              {user?.club && (
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Managed Club</dt>
                  <dd className="mt-0.5 font-medium text-indigo-700 font-semibold">{user.club.name}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Development Roadmap Card */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Development Status</h2>
            <p className="text-sm text-slate-500 mb-6">
              Authentication and role-based routing are now active. Subsequent modules will connect directly to the DRF API endpoints as scheduled in the 10-week plan.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900">Week 2: Authentication &amp; RBAC</h4>
                  <p className="text-xs text-emerald-700">JWT lifecycle, refresh interception, ProtectedRoute, Login &amp; Register forms</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                  Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between opacity-80">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Week 3: Club Discovery &amp; Profiles</h4>
                  <p className="text-xs text-slate-500">Club directory, search, category filters, and membership applications</p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">
                  Up Next
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between opacity-60">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Week 4: Events &amp; Registration</h4>
                  <p className="text-xs text-slate-500">Campus events feed, RSVP, tickets, and attendance</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                  Scheduled
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
