# Week 06 — Backend Handoff: Event Ratings & Club Collaboration

**To:** Anik Khondokar (Frontend MVP Coder) & Antigravity  
**From:** Backend (Atik Jawad / Claude)  
**Topic:** Rating-only event feedback, club-to-club collaboration requests, partner clubs  
**Status:** **Backend Completed & Verified** (147 automated tests passing, OpenAPI validated)  
**Read first:** `WEEK_01-03_BACKEND_HANDOFF.md` (conventions), `WEEK_04_BACKEND_HANDOFF.md` (Event object), `WEEK_05_BACKEND_HANDOFF.md` (notifications).  
**Contract source of truth:** `docs/api/openapi.yml` (`/api/docs/`).

---

## 1. Change to the Event object (affects every event screen)
Three new read-only fields were **added**; nothing was removed or renamed:
```json
{ "...": "all Week 4 fields unchanged",
  "average_rating": 4.3, "rating_count": 3, "my_rating": null }
```
- `average_rating`: average of all ratings, rounded to 1 decimal, or `null` when there are none.
- `rating_count`: number of ratings (0 if none).
- `my_rating`: the logged-in student's own rating (1–5), else `null` (not rated, anonymous, or club operator).
- Show the average **with the count** (e.g. "4.3 · 3 ratings"); one rating alone is not a trend.

---

## 2. Event ratings (rating only, 1–5, no comments)

### Rules
- Only a student who is **registered** for the event (`is_registered === true`) can rate.
- Only **published** events can be rated, **after they have ended**, and **within 7 days after `ends_at`**.
- A student can **change** their rating any time inside that window. There is no delete.
- Everyone sees the average and count. **Individual ratings are never shown to anyone**, including the club operator. The operator additionally sees the 1–5 breakdown.

### Show the rating widget when
`is_registered === true && is_completed === true && now < ends_at + 7 days`.
- `my_rating` set → show stars pre-filled and "Change rating".
- Window over (`now ≥ ends_at + 7 days`) → show read-only "Your rating: N" (or nothing if never rated).
- Event `cancelled`, not ended, or student not registered → no widget.
The server enforces all of this; treat `409`/`403` as normal and show the server's `detail`.

### `PUT /api/events/{id}/rating/` — students only (anonymous `401`, club operator `403`)
Request: `{"rating": 4}` (integer 1–5).  
Success: returns the **updated Event object** (fresh `average_rating`, `rating_count`, `my_rating`) — `201` for a first rating, `200` for a change. Replace your cached event with it.
| Status | When | Body |
|---|---|---|
| 400 | rating missing, not an integer, or outside 1–5 | `{"rating":["..."]}` |
| 403 | student is not registered for the event (including a cancelled registration) | `{"detail":"Only students registered for this event can rate it."}` |
| 404 | unknown event, or someone else's draft | `{"detail":"..."}` |
| 409 | event not published | `{"detail":"Only published events can be rated."}` |
| 409 | event has not ended | `{"detail":"You can rate this event after it ends."}` |
| 409 | more than 7 days after the end | `{"detail":"The rating period (7 days after the event ends) is over."}` |

### `GET /api/events/{id}/rating/` — students only
`200 {"rating": 4}` or `{"rating": null}` (same value as `my_rating` on the event; use whichever is handier).

### `GET /api/events/{id}/rating-summary/` — operator of the owning club only
```json
{ "average": 4.5, "count": 2, "breakdown": {"1": 0, "2": 0, "3": 0, "4": 1, "5": 1} }
```
`average` is `null` and `count` 0 when nothing is rated. `breakdown` keys are strings "1"–"5". Anonymous `401`; student or another club's operator `403`; unknown/others' draft `404`. Show it on the operator's event page.

---

## 3. Club collaboration requests (club operators only)

### Rules
- A club operator sends a request **from their own club** to another club, with a title, an optional description, and optionally one of **their own published, not-yet-ended events**.
- A club cannot send a request to itself.
- **Only one pending request at a time between two clubs, in either direction.** A second one (A→B again, or B→A while A→B is pending) is refused with `409`. After a decision (accepted/rejected/cancelled), a new request is allowed.
- The **target** club's operator can **accept** or **reject** a pending request. The **sender** can **cancel** it while pending. Decisions are final.
- Accepting is **recorded only**: it does **not** change the linked event (no co-hosting shown on events). It makes the two clubs **partners**, shown on club profiles.
- Students never see requests; only the two clubs involved do. Partner clubs are public.

### Collaboration object
```json
{ "id": "uuid",
  "requesting_club": {"id": "uuid", "name": "...", "slug": "..."},
  "target_club":     {"id": "uuid", "name": "...", "slug": "..."},
  "event": {"id": "uuid", "title": "...", "starts_at": "2026-11-12T10:00:00+06:00"},
  "title": "Joint workshop", "description": "…",
  "status": "pending", "created_at": "…", "responded_at": null }
```
`event` is `null` when no event is linked. `status`: `pending | accepted | rejected | cancelled`. `responded_at` is set on accept/reject/cancel.

### `POST /api/collaborations/` — operators (anonymous `401`, student `403`)
```json
{ "target_club": "other-club-slug", "title": "Joint workshop", "description": "optional", "event": "event-uuid (optional)" }
```
`target_club` is the other club's **slug**. `201` → Collaboration object; the target's operator is notified.
| Status | When | Body |
|---|---|---|
| 400 | unknown club | `{"target_club":["Club not found."]}` |
| 400 | own club | `{"target_club":["You cannot send a request to your own club."]}` |
| 400 | title empty | `{"title":[...]}` |
| 400 | event not found / not yours / not published / already ended | `{"event":["Event not found." / "You can only link your own events." / "Only published events that have not ended can be linked."]}` |
| 409 | a pending request already exists between the two clubs (either direction) | `{"detail":"A pending collaboration request already exists between these clubs."}` |

### `GET /api/collaborations/` — operators
Params: `box=sent|received` (default: both), `status=pending|accepted|rejected|cancelled`, `page`, `page_size`. Newest first; paginated. Invalid `box`/`status` → `400`.

### `GET /api/collaborations/{id}/` — either of the two operators
`200` Collaboration. Any other operator → `404`. Anonymous `401`, student `403`.

### Actions — `POST`, no body, return the updated Collaboration (`200`)
| Endpoint | Who | Result |
|---|---|---|
| `/api/collaborations/{id}/accept/` | target club only | `pending → accepted` |
| `/api/collaborations/{id}/reject/` | target club only | `pending → rejected` |
| `/api/collaborations/{id}/cancel/` | requesting club only | `pending → cancelled` |
Errors: `409 {"detail":"Only pending requests can be accepted|rejected|cancelled."}`; the wrong club of the two → `403`; a club not involved → `404`.

### Buttons by status (operator screen)
| Box | Status | Show |
|---|---|---|
| Received | pending | Accept, Reject |
| Sent | pending | Cancel request |
| any | accepted / rejected / cancelled | read-only status badge |

### `GET /api/clubs/{slug}/partners/` — public
Paginated list; each partner once, even after several accepted requests:
```json
{ "id": "uuid", "name": "Photography Club", "slug": "demo-photography-club", "logo": "", "partner_since": "2026-11-05T01:00:00+06:00" }
```
Show it on the club profile as "Partner clubs"; hide the section when empty. Unknown slug → `404`.

### Suggested screens
- **Create form:** club picker (reuse `GET /api/clubs/?search=`, exclude the operator's own club), title, description, optional event dropdown from `GET /api/events/?mine=true&upcoming=true` (show only `status === "published"` items). Show `400` messages next to their fields and the `409` as a form-level message.
- **Collaborations page:** tabs Received / Sent, status filter, buttons per the table above.

---

## 4. Notifications added this week
Type `collaboration_update` (in the Week 5 notification feed; no `notice`/`event` link, so link it to the collaborations page):
| Trigger | Recipient | Title |
|---|---|---|
| Request sent | target club's operator | "New collaboration request" |
| Accepted / rejected | requesting club's operator | "Collaboration request accepted" / "…rejected" |
| Sender cancels | target club's operator | "Collaboration request cancelled" |
Ratings send no notifications.

---

## 5. Demo data (after the seed command is run)
All passwords `Demo-Pass-12345`. Figures below follow from the seed definition; the backend developer verifies them against the live API when seeding.

**Ratings** (events of `[DEMO] Robotics Club`, operator `democlub1@demo.jnuverse.test`):
| Event | State | Data |
|---|---|---|
| `[DEMO] Rated Workshop` | ended ~1 day ago, rating window open | registered: demo1–demo4; ratings from demo2 (5), demo3 (4), demo4 (4) → average 4.3, count 3. **demo1 can rate**; demo5 is not registered (`403`). |
| `[DEMO] Closed Rating Event` | ended 12 days ago, window over | demo1 rated 3, demo2 rated 5 → average 4.0, count 2; rating now returns `409`. |
| `[DEMO] Just Ended Event` | ended ~2 hours ago, window open | registered: demo1, demo2; no ratings yet (`average_rating` null). |
The operator breakdown for Rated Workshop is `{"4": 2, "5": 1}`. Rating windows are relative to when the data was seeded, so they expire after about 7 days; ask the backend developer to re-seed.

**Collaboration** (operators `democlub1…5@demo.jnuverse.test`; slugs `demo-robotics-club`, `demo-debate-society`, `demo-photography-club`, `demo-cultural-forum`, `demo-sports-club`):
| Request | Status |
|---|---|
| Robotics → Debate ("Joint Robotics-Debate Night", with a linked event) | pending |
| Cultural → Robotics | pending |
| Photography → Robotics | accepted |
| Debate → Photography | accepted |
| Sports → Robotics | rejected |
| Photography → Cultural | cancelled |
- `democlub1` (Robotics): sent 1, received 3 (2 more than the pending one are decided).
- Partners: Robotics → Photography; Photography → Robotics and Debate; Debate → Photography; the others have none.

---

## 6. Testing evidence
- Automated backend tests (pytest, local PostgreSQL): **147 passing** (121 before this week + 10 rating tests + 16 collaboration tests). Covered: registration/state/7-day-window rules for ratings, update-in-place, validation, privacy of individual ratings, operator summary, collaboration validation and event links, duplicate prevention in both directions, accept/reject/cancel permissions and conflicts, list filters, detail visibility, notifications, partner listing. One existing event test was updated for the three new fields.
- `python manage.py spectacular --validate` prints no warnings; `docs/api/openapi.yml` regenerated.
- **No database migrations** this week.

## 7. Not built
Rating comments or deletion, rating reminders, expiry of old pending collaboration requests, co-hosted events, student-facing collaboration views, collaboration chat.

## 8. Status & Decisions
- **Status:** Week 6 backend **Completed & Verified**.
- **Decisions:** rating window = 7 days after the event ends; operators see the breakdown but never individual ratings; collaboration acceptance is recorded only; one pending request per club pair in either direction; the sender's cancel notifies the target club.
