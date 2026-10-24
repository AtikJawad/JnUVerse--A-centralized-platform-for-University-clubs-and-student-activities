import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      {/* Shared Stitch Navigation Header */}
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-8 flex flex-col gap-8">
          {/* 1. HERO SECTION (Living Campus Experience - Direct from Stitch) */}
          <section className="relative w-full rounded-3xl bg-gradient-to-b from-surface-white via-surface-container-low/40 to-canvas-base p-6 sm:p-10 lg:p-12 overflow-hidden shadow-[0_4px_30px_rgba(43,52,185,0.04)] border border-border-subtle/60">
            {/* Ambient Glow Behind Hero */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[620px] h-[280px] bg-gradient-to-r from-tertiary-fixed/40 via-surface-lavender to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            {/* Left Flank Constellation Tiles */}
            <div className="hidden xl:flex flex-col gap-4 absolute left-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-3 bg-surface-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-sm border border-border-subtle/50 hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs text-on-surface font-bold">Tech &amp; Code</span>
                  <span className="text-[10px] text-text-muted">JnU IT Society</span>
                </div>
              </div>

              <div className="pointer-events-auto ml-6 flex items-center gap-3 bg-surface-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-sm border border-border-subtle/50 hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs text-on-surface font-bold">Debate &amp; Eloquence</span>
                  <span className="text-[10px] text-text-muted">JnU Debating Society</span>
                </div>
              </div>

              <div className="pointer-events-auto flex items-center gap-3 bg-surface-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-sm border border-border-subtle/50 hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <span className="material-symbols-outlined text-[20px]">sports_soccer</span>
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs text-on-surface font-bold">Sports &amp; Athletics</span>
                  <span className="text-[10px] text-text-muted">Athletics Wing</span>
                </div>
              </div>
            </div>

            {/* Right Flank Constellation Tiles */}
            <div className="hidden xl:flex flex-col gap-4 absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="pointer-events-auto mr-6 flex items-center gap-3 bg-surface-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-sm border border-border-subtle/50 hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-800">
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs text-on-surface font-bold">Photography</span>
                  <span className="text-[10px] text-text-muted">JnU Photo Club</span>
                </div>
              </div>

              <div className="pointer-events-auto flex items-center gap-3 bg-surface-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-sm border border-border-subtle/50 hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center text-pink-800">
                  <span className="material-symbols-outlined text-[20px]">theater_comedy</span>
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs text-on-surface font-bold">Music &amp; Drama</span>
                  <span className="text-[10px] text-text-muted">Cultural Cell</span>
                </div>
              </div>
            </div>

            {/* Hero Center Content */}
            <div className="relative z-20 max-w-2xl mx-auto flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-lavender text-primary shadow-xs mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs uppercase tracking-wider font-bold">Your Campus, Your Community</span>
                <span className="text-text-muted">|</span>
                <span className="text-xs font-semibold text-on-surface">
                  ✦ Welcome back, {user?.name || "Student"}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight leading-tight mb-3">
                Your campus life,{" "}
                <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
                  all in one place.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-text-muted max-w-xl mx-auto mb-7 leading-relaxed">
                Discover student clubs, connect with like-minded peers, and find the communities that make university life unforgettable.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                <Link
                  to="/clubs"
                  className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <span>Explore Clubs</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>

                {user?.role === "student" ? (
                  <Link
                    to="/my-clubs"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-white text-on-surface text-xs font-semibold shadow-xs hover:bg-surface-lavender border border-border-subtle transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
                    <span>My Communities</span>
                  </Link>
                ) : user?.role === "club_operator" ? (
                  <Link
                    to="/operator/members"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-white text-on-surface text-xs font-semibold shadow-xs hover:bg-surface-lavender border border-border-subtle transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">group</span>
                    <span>Manage Members</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {/* 2. OVERVIEW PROFILE & ROADMAP TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <div className="md:col-span-1 p-6 rounded-2xl bg-surface-white border border-border-subtle shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border-subtle">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                  <h2 className="text-sm font-bold text-on-surface">Verified Profile</h2>
                </div>

                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      System Role
                    </dt>
                    <dd className="mt-0.5 capitalize font-semibold text-on-surface">
                      {user?.role ? user.role.replace("_", " ") : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Email
                    </dt>
                    <dd className="mt-0.5 font-medium text-on-surface break-all">
                      {user?.email || "N/A"}
                    </dd>
                  </div>
                  {user?.student_id && (
                    <div>
                      <dt className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                        Student ID
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium text-on-surface">
                        {user.student_id}
                      </dd>
                    </div>
                  )}
                  {user?.department && (
                    <div>
                      <dt className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                        Department
                      </dt>
                      <dd className="mt-0.5 font-medium text-on-surface">{user.department}</dd>
                    </div>
                  )}
                  {user?.batch && (
                    <div>
                      <dt className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                        Batch
                      </dt>
                      <dd className="mt-0.5 font-medium text-on-surface">Batch {user.batch}</dd>
                    </div>
                  )}
                  {user?.name && user?.role === "club_operator" && (
                    <div>
                      <dt className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                        Chartered Society
                      </dt>
                      <dd className="mt-0.5 font-semibold text-primary">{user.name}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="pt-4 mt-4 border-t border-border-subtle/80 flex items-center justify-between text-[11px] text-text-muted">
                <span>Synchronized with DRF</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
            </div>

            {/* Development Roadmap Card */}
            <div className="md:col-span-2 p-6 rounded-2xl bg-surface-white border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">view_kanban</span>
                  <h2 className="text-sm font-bold text-on-surface">
                    JnUVerse 10-Week Development Roadmap
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[10px] font-bold">
                  Week 3 Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-900">Week 1: Foundation &amp; Audit</span>
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  </div>
                  <p className="text-text-muted text-[11px]">
                    Design tokens, repository structure, and health API.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-900">Week 2: Authentication &amp; RBAC</span>
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  </div>
                  <p className="text-text-muted text-[11px]">
                    Student &amp; Operator registration, login, and orbital hub.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/70 border border-primary/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-primary">Week 3: Discovery &amp; Memberships</span>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-white text-[9px] font-bold uppercase">
                      Redesigned
                    </span>
                  </div>
                  <p className="text-text-muted text-[11px]">
                    Explore Clubs, detailed profile, student portal, and operator console.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-on-surface">Week 4: Events &amp; Registration</span>
                    <span className="text-[10px] text-text-muted">Upcoming</span>
                  </div>
                  <p className="text-text-muted text-[11px]">
                    Event feed, schedule, and RSVP ticket management.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
