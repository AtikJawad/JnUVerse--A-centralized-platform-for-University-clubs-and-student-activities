# Week 07 — Backend Handoff: Interests, Reports & Dashboards

**To:** Anik Khondokar (Frontend MVP Coder) & Antigravity  
**From:** Backend (Atik Jawad / Claude)  
**Topic:** Interest selection (students and clubs), content reports, student and club dashboards  
**Status:** **Backend Completed & Verified** (181 automated tests passing, OpenAPI validated)  
**Read first:** `WEEK_01-03`, `WEEK_04`, `WEEK_05`, `WEEK_06` handoffs (conventions, Event and Club objects, notifications, ratings).  
**Contract source of truth:** `docs/api/openapi.yml` (`/api/docs/`).

---

## 1. Interests (needed for dashboard suggestions)

Interests are a fixed list of 13 options (Technology, Programming, Robotics, Research, Debate, Cultural, Music, Photography, Literature, Sports, Social Service, Entrepreneurship, Environment). Both students and clubs pick from it.

### Change to the Club object (affects every club screen)
One field was **added**; nothing was removed or renamed:
```json
{ "...": "all existing club fields unchanged", "interests": [ {"id": "uuid", "name": "Robotics"} ] }
```
`interests` is an empty list when none are chosen.

### `GET /api/auth/interests/` — public
`200 {"interests": [{"id": "uuid", "name": "Debate"}, ...]}` sorted by name. Use it for every interest picker.

### `GET /api/auth/me/interests/` and `PUT /api/auth/me/interests/` — students only
- `GET` → `{"interests": [...]}` the student's current choices.
- `PUT` body `{"interests": ["uuid", "uuid"]}` **replaces the whole selection** (send `[]` to clear). Returns `200 {"interests": [...]}`.
- `400 {"interests": [...]}` for an unknown id, a missing field or a non-list.
- Anonymous `401`; club operator `403`.
- **Onboarding:** after the first login, if the student's interests are empty (or the student dashboard says `has_interests: false`), show an "Choose your interests" step. It can be skipped and changed later.

### Club interests — operator of the club only
`PATCH /api/clubs/{slug}/` accepts `{"interests": ["uuid", ...]}` together with the existing editable fields (`description`, `logo`, `contact_email`). Sending only `interests` leaves the other fields unchanged; sending `[]` clears them. `400 {"interests": [...]}` for unknown ids. Another club's operator or a student → `403`. Add an interests picker to the club profile edit form; show them as tags on club cards and profile.

---

## 2. Reports (inappropriate club or event)

### Rules
- Any logged-in user (student or club operator) can report **a club or an event**.
- A club operator **cannot report their own club or its events** (`400`). Hide the button for them.
- Only **published or cancelled** events can be reported (drafts are not public).
- **One report per user per target.** A second attempt returns `409`. Reports cannot be edited or withdrawn.
- Reporting does **not** hide anything automatically and sends **no notification**. Developers review reports in the admin area.
- A user sees **only their own reports**, with a `status`. The reported club never sees reports about it.

### `POST /api/reports/` — logged in
```json
{ "target_type": "club", "target": "club-slug", "reason": "spam", "details": "optional text" }
```
- `target_type`: `"club"` (then `target` is the club **slug**) or `"event"` (then `target` is the event **id**).
- `reason`: `inappropriate | spam | misleading | harassment | other`.
- `details`: optional, up to 1000 characters; **required when `reason` is `other`**.
- `201`:
```json
{ "id": "uuid", "target_type": "club",
  "club": {"id": "uuid", "name": "...", "slug": "..."}, "event": null,
  "reason": "spam", "details": "optional text", "status": "open", "created_at": "…" }
```
For an event report, `club` is `null` and `event` is `{"id": "uuid", "title": "..."}`.

| Status | When | Body |
|---|---|---|
| 400 | unknown club / event, malformed event id, or a draft event | `{"target":["Club not found."]}` / `{"target":["Event not found."]}` |
| 400 | own club or own club's event | `{"target":["You cannot report your own club or its events."]}` |
| 400 | invalid `target_type` / `reason` | `{"target_type":[...]}` / `{"reason":[...]}` |
| 400 | `reason` is `other` without details | `{"details":["Required when the reason is 'other'."]}` |
| 400 | details longer than 1000 characters | `{"details":[...]}` |
| 401 | not logged in | `{"detail": "..."}` |
| 409 | already reported this target | `{"detail":"You have already reported this."}` |

### `GET /api/reports/` — logged in
Paginated list of the user's own reports, newest first (same object as above). `status` values: `open | under_review | resolved | dismissed`. Show them as "Received", "Under review", "Resolved", "Dismissed". Suggested placement: a "My reports" page in the user menu, and a "Report" action on club and event pages (a dialog with reason and details).

---

## 3. Dashboards

Both dashboards return everything in one call and **reuse existing objects**: every event is the Event object (Week 4 + 6), every club is the Club object (Week 3 + 7).

### `GET /api/dashboard/student/` — students only (anonymous `401`, operator `403`)
```json
{ "has_interests": true,
  "counts": { "clubs_followed": 2, "clubs_joined": 2, "pending_membership_requests": 1,
              "unread_notifications": 8, "events_registered_upcoming": 4, "events_to_rate": 2 },
  "next_events": [ Event, ... ],
  "rating_prompts": [ Event, ... ],
  "suggested_clubs": [ Club, ... ] }
```
- `next_events`: up to 5 events the student is registered for, published and **not yet ended** (ongoing events included), soonest first.
- `rating_prompts`: up to 5 events the student can still rate now (registered, published, ended within the last 7 days, not yet rated), expiring soonest first. `counts.events_to_rate` is the total. Open the rating widget from here.
- `suggested_clubs`: up to 5 clubs that share at least one interest with the student, **excluding** clubs the student already follows, has joined or has a pending request with. Order: most shared interests first, then most followers, then name.
- `has_interests: false` → `suggested_clubs` is empty; show the "Choose your interests" prompt. If `has_interests` is `true` but the list is empty, show "You're all caught up".
- `counts.unread_notifications` equals `GET /api/notifications/unread-count/`.

### `GET /api/dashboard/club/` — club operators only (anonymous `401`, student `403`)
```json
{ "club": {"id": "uuid", "name": "...", "slug": "..."},
  "counts": { "followers": 2, "members": 2, "pending_membership_requests": 1, "upcoming_events": 2,
              "draft_events": 0, "pending_collaboration_requests": 1, "unread_notifications": 4 },
  "ratings": { "average": 4.2, "count": 5 },
  "next_events": [ Event, ... ],
  "recent_events": [ Event, ... ],
  "registrations_last_7_days": 9 }
```
- `next_events`: up to 5 of the club's published events not yet ended, soonest first (drafts and cancelled events are excluded).
- `recent_events`: up to 5 of the club's most recently **ended** published events, latest first; each carries `average_rating` and `rating_count` (`null` / `0` when unrated).
- `ratings`: the club-wide average (1 decimal) and the total number of ratings; `average` is `null` when there are none.
- `pending_collaboration_requests`: requests **received** and still pending (links to the Week 6 collaboration page).
- `pending_membership_requests` links to the Week 3 membership-requests screen.
- `registrations_last_7_days`: registrations made in the last 7 days for any of the club's events (cancelled registrations excluded).

Individual ratings are never part of any dashboard (privacy rule from Week 6).

---

## 4. Demo data (after the seed command is run)
All passwords `Demo-Pass-12345`. The figures below are what the seed produces **right after a fresh re-seed**; dates drift (ongoing and rating windows expire), so ask the backend developer to re-seed to refresh them. The backend developer verifies them against the live API when seeding.

**Interests:** club interests — Robotics: Technology, Programming, Robotics; Debate: Debate, Literature; Photography: Photography, Cultural; Cultural Forum: Cultural, Music; Sports: Sports. Student interests — demo1: Photography, Cultural; demo3: Technology, Programming, Sports; demo5: Robotics, Technology, Debate, Music; demo2 and demo4: none.

**Student dashboard**
| Account | Shows |
|---|---|
| `demo1@demo.jnuverse.test` | followed 2, joined 2, pending 1, unread 8, upcoming registered 4, events to rate 2; interests set but **no suggestions** (all matches already followed/requested) |
| `demo3@demo.jnuverse.test` | one suggestion: `[DEMO] Sports Club` |
| `demo4@demo.jnuverse.test` | `has_interests: false` (interests prompt) |
| `demo5@demo.jnuverse.test` | three suggestions in order: `[DEMO] Robotics Club`, `[DEMO] Cultural Forum`, `[DEMO] Debate Society` |

**Club dashboard** — `democlub1@demo.jnuverse.test` (`[DEMO] Robotics Club`): followers 2, members 2, pending membership requests 1, upcoming events 2, drafts 0, pending collaboration requests 1, unread 4, ratings average 4.2 over 5 ratings, 3 recent events, 9 registrations in the last 7 days.

**Reports:** `demo1` has 3 reports — against `[DEMO] Sports Club` (spam, open), against the event `[DEMO] Research Workshop` (misleading, under review) and against `[DEMO] Cultural Forum` (inappropriate, resolved). `demo2` has 1 report against `[DEMO] Photography Club` (other, dismissed). Status changes happen in the admin area, so ask the backend developer to change one if you need to see a different status.

---

## 5. Testing evidence
- Automated backend tests (pytest, local PostgreSQL): **181 passing** (147 before this week + 9 interest tests + 15 report tests + 10 dashboard tests). Covered: interest lists, student and club interest selection with replace/clear/validation/permissions, interests on club list and detail; report creation for clubs and events, own-target and draft rules, validation, duplicates, own-report listing; both dashboards (counts, ordering and limits, rating prompts and the 7-day window, interest-based suggestions and exclusions, club isolation, recent events, registrations window, permissions).
- `python manage.py spectacular --validate` prints no warnings; `docs/api/openapi.yml` regenerated.
- **One database migration** this week: `clubs.0002_club_interests` (adds the club interests link table; nothing is removed).

## 6. Not built
Club categories beyond interests, interest limits (no maximum), report withdrawal/editing, report notifications, a public report count, dashboard charts or time series (the five analytical reports come in Week 8).

## 7. Status & Decisions
- **Status:** Week 7 backend **Completed & Verified**.
- **Decisions:** clubs and students share one interest list; suggestions come from shared interests (not popularity) and exclude clubs the student is already involved with; reports are stored for developer review only; one report per user per target; the dashboards are plain counts and lists (analytics come next week).
