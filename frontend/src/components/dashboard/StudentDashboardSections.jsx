import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ratingsAPI, extractErrorMessage, fetchAllPages } from "../../services/api";
import StarRating, { RATING_LABELS } from "../StarRating";
import ClubLogo from "../ClubLogo";
import InterestTags from "../InterestTags";
import { getClubTheme } from "../../utils/clubTheme";

/*
 * Student dashboard sections — Week 7 Stage 4
 * Built against Stitch `jnuverse_student_dashboard_living_campus_experience/code.html`:
 *   2. "Find your community." (discovery grid)  → SuggestedClubs
 *   3. "Your communities." (status list)         → YourCommunities
 *   4. "What's happening on campus?" (showcase)  → UpcomingEvents
 * Rating prompts have no Stitch dashboard block; they follow DESIGN.md card rules.
 */

const RATING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CARD_SHADOW = "shadow-[0_4px_24px_rgba(43,52,185,0.04)]";

const dhakaDate = (iso, options) =>
  iso ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", ...options }).format(new Date(iso)) : "";
const formatDay = (iso) => dhakaDate(iso, { weekday: "short", month: "short", day: "numeric" });
const formatTime = (iso) => dhakaDate(iso, { hour: "2-digit", minute: "2-digit", hour12: true });

/** Stitch section header: eyebrow dot, headline, optional count pill, description, meta action. */
function SectionHeader({ id, eyebrow, title, badge, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
            <span className="text-[11px] uppercase tracking-wider text-primary font-bold">{eyebrow}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id={id} className="text-2xl sm:text-[32px] sm:leading-10 font-bold text-on-surface tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="px-3 py-1 rounded-full bg-secondary-fixed text-primary text-[11px] font-bold shadow-sm">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-[15px] leading-6 text-text-muted mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function HeaderLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-hover hover:gap-2.5 transition-all self-start sm:self-auto py-1"
    >
      <span>{children}</span>
      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
    </Link>
  );
}

/** Stitch empty state: floating circle icon, title, body, pill CTA. */
function EmptyState({ icon, title, body, cta }) {
  return (
    <div className={`flex flex-col items-center justify-center p-10 sm:p-12 bg-surface-white rounded-3xl text-center ${CARD_SHADOW}`}>
      <div className="w-20 h-20 rounded-full bg-surface-lavender flex items-center justify-center text-primary-container mb-4 shadow-sm">
        <span className="material-symbols-outlined text-[40px]" aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-xl font-bold text-on-surface mb-2">{title}</h3>
      <p className="text-[15px] leading-6 text-text-muted max-w-md mx-auto mb-6">{body}</p>
      {cta}
    </div>
  );
}

const ctaClass =
  "px-6 py-3 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:bg-primary-hover hover:shadow-md transition-all";

/* ------------------------------------------------------------------ */
/* Rating prompts (`rating_prompts`)                                   */
/* ------------------------------------------------------------------ */

function RatingPromptCard({ event, onRated }) {
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const closesAt = new Date(new Date(event.ends_at).getTime() + RATING_WINDOW_MS).toISOString();

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await ratingsAPI.submitRating(event.id, rating);
      onRated(event.id, res.data?.my_rating ?? rating);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to submit your rating."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className={`bg-surface-white rounded-3xl p-6 ${CARD_SHADOW} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-primary-container truncate">{event.club?.name}</span>
        <Link to={`/events/${event.id}`} className="text-lg font-bold text-on-surface hover:text-primary truncate">
          {event.title}
        </Link>
        <span className="text-[13px] text-text-muted">
          Ended {formatDay(event.ends_at)} · Rating closes {formatDay(closesAt)}
        </span>
      </div>
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-canvas-base">
        <StarRating
          value={rating}
          onChange={(val) => {
            setRating(val);
            setError("");
          }}
          disabled={submitting}
          size="md"
        />
        <span className="text-xs font-semibold text-on-surface">
          {rating > 0 ? RATING_LABELS[rating] : "Tap a star"}
        </span>
      </div>
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating < 1}
        className="self-start h-10 px-5 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:bg-primary-hover transition-all disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Rating"}
      </button>
    </article>
  );
}

export function RatingPrompts({ events, total, onRated, ratedMessage }) {
  if ((!events || events.length === 0) && !ratedMessage) return null;

  return (
    <section id="rate-events" aria-labelledby="rate-events-heading" className="flex flex-col gap-4 scroll-mt-24">
      <SectionHeader
        id="rate-events-heading"
        eyebrow="Your feedback matters"
        title="Rate your recent events."
        badge={total > 0 ? `${total} to rate` : null}
        description="Ratings are anonymous and stay open for 7 days after an event ends."
      />
      {ratedMessage && (
        <p role="status" className="px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
          {ratedMessage}
        </p>
      )}
      {events?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <RatingPromptCard key={event.id} event={event} onRated={onRated} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Find your community (`suggested_clubs`)                          */
/* ------------------------------------------------------------------ */

function SuggestedClubCard({ club }) {
  const theme = getClubTheme(club);
  const [following, setFollowing] = useState(club.is_following === true);
  const [followers, setFollowers] = useState(club.follower_count || 0);
  const [membership, setMembership] = useState(club.my_membership || null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const handleFollow = async () => {
    setBusy("follow");
    setError("");
    try {
      const res = await api.post(`/api/clubs/${club.slug}/follow/`);
      setFollowing(true);
      if (Number.isInteger(res.data?.follower_count)) setFollowers(res.data.follower_count);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to follow this club."));
    } finally {
      setBusy("");
    }
  };

  const handleJoin = async () => {
    setBusy("join");
    setError("");
    try {
      const res = await api.post(`/api/clubs/${club.slug}/membership/`);
      setMembership(res.data?.status || "pending");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to send your membership request."));
    } finally {
      setBusy("");
    }
  };

  return (
    <div
      className={`bg-surface-white rounded-3xl p-6 ${CARD_SHADOW} hover:shadow-[0_16px_36px_rgba(43,52,185,0.1)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${theme.corner} rounded-bl-full transition-transform duration-500 group-hover:scale-110`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <ClubLogo
            src={club.logo}
            name={club.name}
            className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-sm`}
          >
            <span className="material-symbols-outlined text-[26px]">{theme.icon}</span>
          </ClubLogo>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${theme.pill} text-[11px] font-bold`}>
            <span className="material-symbols-outlined text-[14px]">verified</span>
            <span>Chartered</span>
          </span>
        </div>
        <Link to={`/clubs/${club.slug}`}>
          <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">{club.name}</h3>
        </Link>
        <span className="text-[11px] font-bold tracking-wide text-text-muted block mb-2">@{club.slug}</span>
        <p className="text-[13px] leading-5 text-on-surface-variant line-clamp-3 mb-3">
          {club.description || "Official university student society."}
        </p>
        <InterestTags interests={club.interests} max={3} className="mb-4" />
        <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-canvas-base mb-6 text-text-muted text-[11px] font-bold">
          <span className="flex items-center gap-1 font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-primary">group</span>
            {followers}
          </span>
          <span>Followers</span>
          <span className="text-border-subtle">•</span>
          <span className="font-semibold text-on-surface">{club.member_count || 0}</span>
          <span>Members</span>
        </div>
      </div>

      {error && (
        <p className="relative z-10 text-xs text-error mb-2" role="alert">
          {error}
        </p>
      )}

      {/* Dual independent actions (Stitch): Follow + membership */}
      <div className="relative z-10 pt-2 flex items-center gap-2">
        {following ? (
          <span className="flex-1 h-10 px-3 rounded-full bg-surface-lavender text-primary-container text-xs font-bold flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check</span>
            Following
          </span>
        ) : (
          <button
            type="button"
            onClick={handleFollow}
            disabled={Boolean(busy)}
            className="flex-1 h-10 px-3 rounded-full bg-primary-container text-on-primary text-xs font-bold hover:bg-primary-hover shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {busy === "follow" ? "Following..." : "Follow"}
          </button>
        )}
        {membership === "pending" ? (
          <span className="h-10 px-3 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-amber-600">hourglass_top</span>
            Pending
          </span>
        ) : membership === "approved" ? (
          <span className="h-10 px-4 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            Joined
          </span>
        ) : (
          <button
            type="button"
            onClick={handleJoin}
            disabled={Boolean(busy)}
            className="h-10 px-4 rounded-full bg-surface-lavender text-primary-container text-xs font-bold hover:bg-secondary-container/40 transition-colors flex items-center gap-1 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            {busy === "join" ? "Sending..." : "Join"}
          </button>
        )}
      </div>
    </div>
  );
}

export function SuggestedClubs({ clubs, hasInterests }) {
  return (
    <section id="discovery-section" aria-labelledby="discovery-heading" className="flex flex-col gap-4 scroll-mt-24">
      <SectionHeader
        id="discovery-heading"
        eyebrow="Curated for your profile"
        title="Find your community."
        description="Verified student clubs that match your interests and that you have not joined or followed yet."
        action={<HeaderLink to="/clubs">View all clubs</HeaderLink>}
      />

      {!hasInterests ? (
        <EmptyState
          icon="interests"
          title="Tell us what you care about."
          body="Choose your interests and we will suggest clubs that share them."
          cta={
            <Link to="/profile" className={ctaClass}>
              Choose Interests
            </Link>
          }
        />
      ) : !clubs || clubs.length === 0 ? (
        <EmptyState
          icon="task_alt"
          title="You're all caught up."
          body="You already follow or belong to every club that matches your interests. Update your interests to discover more."
          cta={
            <Link to="/profile" className={ctaClass}>
              Update Interests
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {clubs.map((club) => (
            <SuggestedClubCard key={club.slug} club={club} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Your communities (joined, pending, followed clubs)               */
/* ------------------------------------------------------------------ */

const STATUS_PILL = {
  approved: { label: "Approved Member", pill: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  pending: { label: "Membership Pending", pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  following: { label: "Following Updates", pill: "bg-surface-lavender text-primary", dot: "bg-primary" },
};

export function YourCommunities() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAllPages("/api/clubs/")
      .then((all) => {
        if (!active) return;
        const rank = (c) => (c.my_membership === "approved" ? 0 : c.my_membership === "pending" ? 1 : 2);
        setClubs(
          all
            .filter((c) => c.my_membership === "approved" || c.my_membership === "pending" || c.is_following === true)
            .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
        );
      })
      .catch((err) => active && setError(extractErrorMessage(err, "Failed to load your communities.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const visible = clubs.slice(0, 5);

  return (
    <section id="my-clubs-section" aria-labelledby="communities-heading" className="flex flex-col gap-4 scroll-mt-24">
      <SectionHeader
        id="communities-heading"
        title="Your communities."
        badge={!loading && !error && clubs.length > 0 ? `${clubs.length} Active Subscription${clubs.length === 1 ? "" : "s"}` : null}
        description="Societies you actively participate in and clubs currently on your campus radar."
        action={clubs.length > visible.length ? <HeaderLink to="/my-clubs">View all in My Clubs</HeaderLink> : null}
      />

      {loading && <p className="text-xs text-text-muted">Loading your communities...</p>}
      {!loading && error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && clubs.length === 0 && (
        <EmptyState
          icon="travel_explore"
          title="Your campus journey starts with a community."
          body="You haven't followed any clubs or joined societies yet. Connect with clubs to get event updates and announcements."
          cta={
            <a href="#discovery-section" className={ctaClass}>
              Explore Clubs &amp; Societies
            </a>
          }
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {visible.map((club) => {
            const theme = getClubTheme(club);
            const status =
              STATUS_PILL[club.my_membership === "approved" || club.my_membership === "pending" ? club.my_membership : "following"];
            return (
              <div
                key={club.slug}
                className="bg-surface-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(43,52,185,0.03)] hover:shadow-[0_8px_24px_rgba(43,52,185,0.06)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <ClubLogo
                    src={club.logo}
                    name={club.name}
                    className={`w-12 h-12 rounded-xl ${theme.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5`}
                  >
                    <span className="material-symbols-outlined text-[24px]">{theme.icon}</span>
                  </ClubLogo>
                  <div className="flex flex-col min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-on-surface">{club.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full ${status.pill} text-[11px] font-semibold flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                        {club.my_membership && club.is_following ? " • Following" : ""}
                      </span>
                    </div>
                    <p className="text-[13px] leading-5 text-text-muted max-w-2xl line-clamp-1">
                      {club.description || "Official university student society."}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/clubs/${club.slug}`}
                  className="self-end md:self-center flex-shrink-0 px-4 py-2 rounded-full text-primary text-xs font-bold hover:bg-surface-lavender transition-colors inline-flex items-center gap-1"
                >
                  <span>View Society Profile</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Upcoming events (`next_events`) — Stitch event showcase          */
/* ------------------------------------------------------------------ */

function DateBadge({ iso, className = "" }) {
  return (
    <div className={`bg-surface-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl flex flex-col items-center shadow-sm ${className}`}>
      <span className="text-[11px] uppercase font-bold text-primary">{dhakaDate(iso, { month: "short" })}</span>
      <span className="text-xl font-extrabold text-on-surface leading-none">{dhakaDate(iso, { day: "numeric" })}</span>
    </div>
  );
}

function EventStatusPill({ event }) {
  const now = new Date();
  if (event.status === "cancelled") {
    return <span className="px-2.5 py-0.5 rounded-full bg-error-container/50 text-error text-[11px] font-bold">Cancelled</span>;
  }
  if (new Date(event.starts_at) <= now && new Date(event.ends_at) > now) {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live now
      </span>
    );
  }
  return null;
}

export function UpcomingEvents({ events, total }) {
  const [featured, ...rest] = events || [];

  return (
    <section aria-labelledby="events-heading" className="flex flex-col gap-4">
      <SectionHeader
        id="events-heading"
        title="What's happening for you?"
        badge={total > 0 ? `${total} registered` : null}
        description="Your next registered events, soonest first."
        action={<HeaderLink to="/events?tab=registered">All my registrations</HeaderLink>}
      />

      {!featured ? (
        <EmptyState
          icon="event_upcoming"
          title="No upcoming events yet."
          body="Register for a campus event and it will appear here."
          cta={
            <Link to="/events" className={ctaClass}>
              Browse Events
            </Link>
          }
        />
      ) : (
        <>
          {/* Featured: Stitch asymmetric event showcase card */}
          <div
            className={`bg-surface-white rounded-3xl p-6 lg:p-7 ${CARD_SHADOW} hover:shadow-[0_12px_32px_rgba(43,52,185,0.08)] transition-all flex flex-col lg:flex-row gap-6 items-center`}
          >
            <div className="w-full lg:w-72 h-44 rounded-2xl overflow-hidden relative flex-shrink-0 shadow-sm bg-gradient-to-br from-primary via-primary-container to-secondary">
              {featured.banner ? (
                <img src={featured.banner} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/70">
                  <span className="material-symbols-outlined text-[48px]" aria-hidden="true">event</span>
                </div>
              )}
              <DateBadge iso={featured.starts_at} className="absolute top-3 left-3" />
            </div>
            <div className="flex-1 flex flex-col justify-between w-full min-w-0">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-text-muted text-[11px] font-bold mb-2">
                  <span className="flex items-center gap-1 text-primary-container font-semibold">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    {featured.club?.name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {featured.venue}
                  </span>
                  <EventStatusPill event={featured} />
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-2">{featured.title}</h3>
                {featured.description && (
                  <p className="text-[15px] leading-6 text-text-muted mb-4 line-clamp-2">{featured.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <span className="text-[13px] text-text-muted flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  {formatDay(featured.starts_at)} · {formatTime(featured.starts_at)} – {formatTime(featured.ends_at)}
                </span>
                <Link
                  to={`/events/${featured.id}`}
                  className="px-5 py-2.5 rounded-full bg-surface-lavender text-primary-container text-xs font-bold hover:bg-secondary-container/40 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  <span>View Event</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Remaining events: DESIGN.md feed list (hairline dividers, lavender hover wash) */}
          {rest.length > 0 && (
            <ul className={`bg-surface-white rounded-3xl p-2 ${CARD_SHADOW} divide-y divide-border-subtle`}>
              {rest.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/events/${event.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-lavender transition-colors"
                  >
                    <DateBadge iso={event.starts_at} className="bg-surface-lavender" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-primary-container truncate">{event.club?.name}</span>
                      <span className="text-base font-bold text-on-surface truncate">{event.title}</span>
                      <span className="text-[13px] text-text-muted truncate">
                        {formatTime(event.starts_at)} · {event.venue}
                      </span>
                    </div>
                    <EventStatusPill event={event} />
                    <span className="material-symbols-outlined text-[20px] text-text-muted" aria-hidden="true">
                      chevron_right
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
