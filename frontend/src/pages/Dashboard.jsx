import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingState from "../components/LoadingState";
import InterestsPrompt, { isInterestsPromptDismissed } from "../components/InterestsPrompt";
import {
  RatingPrompts,
  SuggestedClubs,
  UpcomingEvents,
  YourCommunities,
} from "../components/dashboard/StudentDashboardSections";
import { dashboardAPI, extractErrorMessage } from "../services/api";

/**
 * Dashboard — Week 7 Stage 4
 *
 * Students: data from GET /api/dashboard/student/, laid out like Stitch
 * `jnuverse_student_dashboard_living_campus_experience`: hero → rating prompts (when any) →
 * "Find your community." → "Your communities." → upcoming events, plus the Stage 3 interests prompt.
 * Club operators are routed to OperatorDashboard (Stage 5) by RoleDashboard in App.jsx.
 */
// Decorative hero "constellation" tiles (Stitch copy and colors, anim-float-1/2/3 in index.css)
const HERO_TILES_LEFT = [
  { title: "Tech & Code", subtitle: "4 Active Guilds", icon: "terminal", iconClass: "bg-sky-100 text-primary-container", anim: "anim-float-1" },
  { title: "Debate & Eloquence", subtitle: "JnU DS Lead", icon: "record_voice_over", iconClass: "bg-purple-100 text-secondary", anim: "anim-float-2 ml-6" },
  { title: "Sports & Athletics", subtitle: "Tournaments Live", icon: "sports_cricket", iconClass: "bg-emerald-100 text-emerald-800", anim: "anim-float-3" },
];

const HERO_TILES_RIGHT = [
  { title: "Photography", subtitle: "Exhibition Open", icon: "photo_camera", iconClass: "bg-orange-100 text-orange-800", anim: "anim-float-2 mr-6" },
  { title: "Music & Drama", subtitle: "Spring Fest Prep", icon: "theater_comedy", iconClass: "bg-pink-100 text-pink-800", anim: "anim-float-1" },
  { title: "Art & Design", subtitle: "JnU Creators", icon: "palette", iconClass: "bg-amber-100 text-amber-800", anim: "anim-float-3 mr-4" },
];

function HeroTile({ tile }) {
  return (
    <div
      className={`pointer-events-auto ${tile.anim} flex items-center gap-3 bg-surface-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(43,52,185,0.08)]`}
    >
      <div className={`w-9 h-9 rounded-xl ${tile.iconClass} flex items-center justify-center hover:scale-105 transition-transform duration-300`}>
        <span className="material-symbols-outlined text-[20px]">{tile.icon}</span>
      </div>
      <div className="flex flex-col pr-2">
        <span className="text-xs text-on-surface font-bold">{tile.title}</span>
        <span className="text-[11px] font-bold tracking-wide text-text-muted">{tile.subtitle}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  const welcomeName =
    isStudent && user?.batch ? `${firstName} (Batch ${user.batch}${user?.department ? ` • ${user.department}` : ""})` : user?.name || "Student";

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(isStudent);
  const [error, setError] = useState("");
  const [promptDismissed, setPromptDismissed] = useState(() => isInterestsPromptDismissed(user?.id));
  const [interestsSavedMessage, setInterestsSavedMessage] = useState("");
  const [ratedMessage, setRatedMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!isStudent) return;
    setLoading(true);
    setError("");
    try {
      const res = await dashboardAPI.student();
      setDashboard(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load your dashboard."));
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setPromptDismissed(isInterestsPromptDismissed(user?.id));
  }, [user?.id]);

  const showInterestsPrompt = Boolean(dashboard) && dashboard.has_interests === false && !promptDismissed;

  // A rated event leaves the prompt list; the count drops by one
  const handleRated = (eventId, stars) => {
    const rated = dashboard?.rating_prompts?.find((e) => e.id === eventId);
    setRatedMessage(`Thanks! You rated "${rated?.title || "the event"}" ${stars} star${stars === 1 ? "" : "s"}.`);
    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rating_prompts: prev.rating_prompts.filter((e) => e.id !== eventId),
        counts: { ...prev.counts, events_to_rate: Math.max((prev.counts?.events_to_rate || 1) - 1, 0) },
      };
    });
  };

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      {/* Shared Stitch Navigation Header */}
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        <div className="max-w-[1360px] w-full mx-auto px-5 md:px-10 lg:px-16 py-6 flex flex-col gap-16">
          {showInterestsPrompt && (
            <InterestsPrompt
              userId={user?.id}
              onSaved={(interests) => {
                setInterestsSavedMessage(
                  `Saved ${interests.length} interest${interests.length === 1 ? "" : "s"}. Your club suggestions have been updated.`
                );
                loadDashboard();
              }}
              onSkip={() => setPromptDismissed(true)}
            />
          )}
          {interestsSavedMessage && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-between gap-3"
            >
              <span>{interestsSavedMessage}</span>
              <button
                type="button"
                onClick={() => setInterestsSavedMessage("")}
                aria-label="Dismiss"
                className="text-emerald-800/70 hover:text-emerald-900"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* 1. HERO SECTION — Stitch jnuverse_student_dashboard_living_campus_experience */}
          <section className="relative w-full rounded-3xl bg-gradient-to-b from-surface-white via-surface-container-low/40 to-canvas-base p-6 sm:p-10 lg:p-12 overflow-hidden shadow-[0_4px_30px_rgba(43,52,185,0.04)]">
            {/* Ambient Glow Behind Hero */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[620px] h-[280px] bg-gradient-to-r from-secondary-fixed/40 via-surface-lavender to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            {/* Left Flank Constellation Tiles (never overlaps center content) */}
            <div className="hidden xl:flex flex-col gap-5 absolute left-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none" aria-hidden="true">
              {HERO_TILES_LEFT.map((tile) => (
                <HeroTile key={tile.title} tile={tile} />
              ))}
            </div>

            {/* Right Flank Constellation Tiles (never overlaps center content) */}
            <div className="hidden xl:flex flex-col gap-5 absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none" aria-hidden="true">
              {HERO_TILES_RIGHT.map((tile) => (
                <HeroTile key={tile.title} tile={tile} />
              ))}
            </div>

            {/* Hero Center Core Content */}
            <div className="relative z-20 max-w-2xl mx-auto flex flex-col items-center text-center">
              {/* Eyebrow Pill */}
              <div className="inline-flex flex-wrap justify-center items-center gap-2 px-4 py-1.5 rounded-full bg-surface-lavender text-primary-container shadow-sm mb-4">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider font-bold">Your Campus, Your Community</span>
                <span className="text-text-muted">|</span>
                <span className="text-[11px] font-semibold text-on-surface">✦ Welcome back, {welcomeName}</span>
              </div>

              {/* Main Headline (headline-lg) */}
              <h1 className="text-[32px] leading-10 sm:text-[44px] sm:leading-[52px] font-bold text-on-surface tracking-tight mb-3">
                Your campus life,{" "}
                <span className="bg-gradient-to-r from-primary via-primary-container to-secondary-container bg-clip-text text-transparent">
                  all in one place.
                </span>
              </h1>

              {/* Supporting Editorial Copy (body-lg) */}
              <p className="text-[17px] leading-7 text-text-muted max-w-xl mx-auto mb-7">
                Discover student clubs, connect with like-minded peers, and find the communities that make university life unforgettable.
              </p>

              {/* CTA Action Hub */}
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                {isStudent ? (
                  <a
                    href="#discovery-section"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-primary-container to-primary-hover text-on-primary text-sm font-bold shadow-[0_8px_20px_-4px_rgba(43,52,185,0.35)] hover:shadow-[0_12px_28px_-4px_rgba(43,52,185,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    <span>Explore Clubs</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </a>
                ) : (
                  <Link
                    to="/clubs"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-primary-container to-primary-hover text-on-primary text-sm font-bold shadow-[0_8px_20px_-4px_rgba(43,52,185,0.35)] hover:shadow-[0_12px_28px_-4px_rgba(43,52,185,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    <span>Explore Clubs</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                )}

                {isStudent ? (
                  <a
                    href="#my-clubs-section"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-surface-white text-on-surface text-sm font-semibold shadow-sm hover:shadow-md hover:bg-surface-lavender/50 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary-container">groups</span>
                    <span>My Communities</span>
                  </a>
                ) : user?.role === "club_operator" ? (
                  <Link
                    to="/operator/members"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-surface-white text-on-surface text-sm font-semibold shadow-sm hover:shadow-md hover:bg-surface-lavender/50 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary-container">group</span>
                    <span>Manage Members</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {/* 2. STUDENT DASHBOARD DATA (GET /api/dashboard/student/) */}
          {isStudent && loading && <LoadingState message="Loading your dashboard..." />}

          {isStudent && !loading && error && (
            <div className="p-5 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadDashboard}
                className="px-4 py-1.5 rounded-full bg-surface-white text-on-surface text-xs font-semibold shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {isStudent && !loading && !error && dashboard && (
            <>
              <RatingPrompts
                events={dashboard.rating_prompts}
                total={dashboard.counts?.events_to_rate || 0}
                onRated={handleRated}
                ratedMessage={ratedMessage}
              />
              <SuggestedClubs clubs={dashboard.suggested_clubs} hasInterests={dashboard.has_interests} />
              <YourCommunities />
              <UpcomingEvents
                events={dashboard.next_events}
                total={dashboard.counts?.events_registered_upcoming || 0}
              />
            </>
          )}

        </div>
      </main>
    </div>
  );
}
