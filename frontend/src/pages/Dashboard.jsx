import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      {/* Top Header */}
      <header className="w-full bg-surface-white/80 backdrop-blur-xl border-b border-border-subtle sticky top-0 z-50">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-resting">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-on-surface">
                JnU<span className="text-primary">Verse</span>
              </span>
              <Badge
                variant={user?.role === "club_operator" ? "secondary" : "primary"}
                className="hidden sm:inline-flex ml-2.5"
                dot
              >
                {user?.role === "club_operator" ? "Club Operator" : "Student"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs font-medium text-text-muted">
              Signed in as{" "}
              <strong className="text-on-surface font-semibold">
                {user?.name || user?.email}
              </strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1360px] mx-auto w-full px-6 lg:px-12 py-8 lg:py-10 flex-1">
        {/* Welcome Banner */}
        <Card className="mb-8 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="primary" dot>
                  Step 1 Foundation Active
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                Welcome back, {user?.name || "Member"}!
              </h1>
              <p className="mt-1 text-text-muted text-sm leading-relaxed">
                Centralized platform for Jagannath University clubs, events, and student activities.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Authenticated Session
              </span>
            </div>
          </div>
        </Card>

        {/* 2-Column Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Account Overview Card */}
          <Card className="md:col-span-1 p-6">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border-subtle">
              <span className="material-symbols-outlined text-primary text-[20px]">
                account_circle
              </span>
              <h2 className="text-base font-bold text-on-surface">Account Profile</h2>
            </div>

            <dl className="space-y-3.5 text-sm">
              <div>
                <dt className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                  Role
                </dt>
                <dd className="mt-0.5 capitalize font-semibold text-on-surface">
                  {user?.role ? user.role.replace("_", " ") : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                  Email
                </dt>
                <dd className="mt-0.5 font-medium text-on-surface break-all">
                  {user?.email || "N/A"}
                </dd>
              </div>
              {user?.student_id && (
                <div>
                  <dt className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                    Student ID
                  </dt>
                  <dd className="mt-0.5 font-mono font-medium text-on-surface">
                    {user.student_id}
                  </dd>
                </div>
              )}
              {user?.department && (
                <div>
                  <dt className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                    Department
                  </dt>
                  <dd className="mt-0.5 font-medium text-on-surface">{user.department}</dd>
                </div>
              )}
              {user?.batch && (
                <div>
                  <dt className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                    Batch
                  </dt>
                  <dd className="mt-0.5 font-medium text-on-surface">{user.batch}</dd>
                </div>
              )}
              {user?.club && (
                <div>
                  <dt className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                    Managed Club
                  </dt>
                  <dd className="mt-0.5 font-semibold text-primary">{user.club.name}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Development & Handoff Status Card */}
          <Card className="md:col-span-2 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  view_kanban
                </span>
                <h2 className="text-base font-bold text-on-surface">
                  Frontend Development Roadmap
                </h2>
              </div>
              <Badge variant="neutral">10-Week Plan</Badge>
            </div>

            <p className="text-xs sm:text-sm text-text-muted mb-6 leading-relaxed">
              Step 1 has established the repository audit, Stitch design system foundation, token configurations, and backend handoff requirements. Future steps will progressively implement the approved screens.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-lavender border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">
                      Week 2: Authentication &amp; Design Foundation
                    </h4>
                    <p className="text-xs text-text-muted">
                      JWT lifecycle, 401 refresh interception, ProtectedRoute, Stitch design tokens &amp; components
                    </p>
                  </div>
                </div>
                <Badge variant="success">Completed</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-white border border-border-subtle flex items-center justify-between opacity-90">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-lavender text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">diversity_3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">
                      Week 3: Club Discovery &amp; Memberships
                    </h4>
                    <p className="text-xs text-text-muted">
                      Explore clubs gallery, club profile, follow/unfollow, join requests &amp; member management
                    </p>
                  </div>
                </div>
                <Badge variant="primary">Next Step</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-white border border-border-subtle flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-lavender text-text-muted flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">event</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">
                      Week 4: Campus Events &amp; Registration
                    </h4>
                    <p className="text-xs text-text-muted">
                      Events schedule, RSVP ticket flow, and operator event publishing
                    </p>
                  </div>
                </div>
                <Badge variant="neutral">Upcoming</Badge>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-white/60 border-t border-border-subtle py-4">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>&copy; 2026 Jagannath University (JnU). All rights reserved.</span>
          <div className="flex items-center gap-6">
            <span>Stitch Design Foundation Active</span>
            <span>Week 2 Auth Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
