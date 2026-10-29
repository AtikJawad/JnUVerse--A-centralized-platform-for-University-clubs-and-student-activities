# Week 04 — Backend Handoff: Events & Registration

**To:** Anik Khondokar (Frontend MVP Coder) & Antigravity  
**From:** Backend (Atik Jawad / Claude)  
**Topic:** Event discovery, operator event management, student registration, capacity rules  
**Status:** **Backend Completed & Verified** (86 automated tests passing, OpenAPI validated)  
**Read first:** `WEEK_01-03_BACKEND_HANDOFF.md` — conventions (trailing slashes, error shapes, pagination, UUIDs, dates, Bearer token) apply here too.  
**Contract source of truth:** `docs/api/openapi.yml`.

---

## 1. What changed from the frontend's Week 4 proposal
| Proposal | Actual backend |
|---|---|
| `start_time`, `end_time` | **`starts_at`, `ends_at`** |
| `banner_image` | **Not supported** (not in the approved database design) — do not build banner upload/display |
| `is_published` boolean | **`status`**: `"draft" \| "published" \| "cancelled"`, plus derived **`is_completed`** |
| Contact person | Use the **club's `contact_email`** (`GET /api/clubs/{event.club.slug}/`) |
| Full event / closed registration → 400 | **409** with `{"detail": "..."}` |
| `POST/PATCH /api/events/` | `POST /api/events/` creates; **`PATCH /api/events/{id}/`** edits |
| QR / check-in token | **None** (attendance tracking is out of scope) |
| Question: ratings eligibility | Planned for Week 6: registered students, after the event ends |

## 2. Event object
```json
{ "id": "uuid",
  "club": { "id": "uuid", "name": "JnU Research Society", "slug": "jnu-research-society" },
  "title": "Research Workshop", "description": "…", "venue": "Room 301",
  "starts_at": "2026-11-05T10:00:00+06:00", "ends_at": "2026-11-05T12:00:00+06:00",
  "capacity": 30, "registered_count": 12, "remaining_capacity": 18,
  "status": "published", "is_completed": false, "is_registered": false,
  "created_at": "2026-10-26T01:00:00+06:00" }
```
- `capacity` is `null` for unlimited; then `remaining_capacity` is also `null`.
- `registered_count` counts **currently registered** students only (cancelled registrations are not counted).
- `is_registered`: `true`/`false` for logged-in students; **`null`** for anonymous users and club operators (send the Bearer token on public requests so this is filled).
- `is_completed` is **derived**: `true` only when the event is published **and** has ended. It is never stored.

**Badge priority:** Cancelled (`status`) > Ended (`is_completed`) > Full (`remaining_capacity === 0`) > Draft (`status`) > Upcoming/Live.

## 3. Visibility rules
- Public lists and detail show **published and cancelled** events. Cancelled events stay visible and are clearly marked.
- **Drafts** are visible only to the owning club's operator. Anyone else gets `404` for a draft.

## 4. Public endpoints (anyone; token optional)
### `GET /api/events/`
Query params (all optional, combinable): `club=<slug>`, `upcoming=true|false`, `search=<title>`, `page`, `page_size`.
- `upcoming=true` → events that have **not yet ended** (includes ongoing), **soonest first**.
- `upcoming=false` → past events, **most recent first**.
- No `upcoming` param → all visible events, newest start first.
- Response: paginated list of Event objects.

### `GET /api/events/{id}/`
One Event object. `404` for an unknown id or someone else's draft.

## 5. Student endpoints (anonymous `401`, club operator `403`, unknown/invisible event `404`)
### `GET /api/events/?registered=true`
Events the student is currently registered for ("My events"). Anonymous `401`, operator `403`.

### `POST /api/events/{id}/register/`
- `201` + Event — newly registered (also when re-registering after a cancellation).
- `200` + Event — already registered; nothing changed.
- `409 {"detail": "..."}` when: the event is **full** ("This event is full."), the event is **not published** (cancelled), or the event **has already started/ended** (registration closes at `starts_at`).
- The response is the updated Event; **use its counts and `is_registered`**, do not compute them yourself.

### `DELETE /api/events/{id}/register/`
- `204` — registration cancelled (the seat is freed), **or** there was no active registration (idempotent).
- `409 {"detail": "..."}` — the event has already started (registration can no longer be cancelled).

### Register button states
| Situation | Show |
|---|---|
| Anonymous | Link "Log in to register" |
| `is_registered === true` | "Registered" + "Cancel registration" (disabled with a note once `starts_at` has passed) |
| `status === "cancelled"` | "Event cancelled" |
| `is_completed` or `ends_at` passed | "Event ended" |
| `starts_at` passed | "Registration closed" |
| `remaining_capacity === 0` | "Event full" |
| Otherwise | "Register" |
Club operators see no student buttons. Always show the server's `detail` if an action is refused (another student may have taken the last seat a moment earlier).

## 6. Club operator endpoints (own club only — anonymous `401`, student `403`, another club's operator `403`)
### `GET /api/events/?mine=true`
All of the operator's own events **including drafts**. Students get `403`, anonymous `401`. Combines with the other filters.

### `POST /api/events/` — create (always starts as a draft)
```json
{ "title": "Research Workshop", "description": "…", "venue": "Room 301",
  "starts_at": "2026-11-05T10:00:00+06:00", "ends_at": "2026-11-05T12:00:00+06:00", "capacity": 30 }
```
`description` and `capacity` are optional (`capacity: null` or omitted = unlimited). `201` → Event with `"status": "draft"`; the club is the operator's own club (never sent).
`400` field errors:
| Field | Rule |
|---|---|
| `starts_at` | must be in the future |
| `ends_at` | must be after `starts_at` |
| `capacity` | at least 1 (or null) |
| `title`, `venue` | required |

### `PATCH /api/events/{id}/` — edit
Any of `title, description, venue, starts_at, ends_at, capacity` → `200` Event.
- `status` cannot be changed here (silently ignored); use publish/cancel.
- Drafts are always editable. Published events are editable until they end.
- `starts_at` is only checked for "must be in the future" **when it is changed** (so an ongoing event's description can still be edited).
- `capacity` cannot be lower than the current `registered_count` → `400 {"capacity": ["Capacity cannot be lower than the current number of registrations (N)."]}`.
- **Cancelled or ended events cannot be edited** → `409 {"detail": "Cancelled or ended events cannot be edited."}`.
- `PUT` is not allowed (`405`).

### `POST /api/events/{id}/publish/`
`draft → published`, `200` Event. `409` if it is not a draft; `400 {"starts_at": [...]}` if the start time has already passed (edit the time first).

### `POST /api/events/{id}/cancel/`
`published → cancelled`, `200` Event. **Cancelled is final** (no un-cancel, no un-publish). `409` if the event is not published or has already ended. Existing registrations are kept as they are (students are not auto-removed; notifications for this come in Week 5).

### `GET /api/events/{id}/registrations/`
Paginated list of students **currently registered**, oldest registration first:
```json
{ "id": "uuid", "student_id": "B220305043", "name": "Atik Jawad",
  "department": "Computer Science and Engineering (CSE)", "batch": 22,
  "status": "registered", "registered_at": "2026-10-26T01:10:00+06:00" }
```
**Privacy (mandatory): no student emails are ever returned; do not display or ask for them.** Another club's operator gets `403`; a draft of another club is `404`.

### Operator action availability
| Event state | Edit | Publish | Cancel | Attendees |
|---|---|---|---|---|
| draft | yes | yes (if start is in the future) | no | yes (empty) |
| published, not ended | yes | no | yes | yes |
| published, ended | no | no | no | yes |
| cancelled | no | no | no | yes |

## 7. Rules worth knowing
- **Capacity is enforced on the server** under a database lock, so two students cannot take the last seat. The UI must treat `409` as normal and refresh.
- A student's cancelled registration can be re-registered later (if there is room and the event has not started).
- Registration closes when the event **starts**; cancelling a registration is also only possible before the start.
- Club operators cannot register for events; students cannot create or edit them.

## 8. Testing evidence
- Automated backend tests (pytest on local PostgreSQL): **86 passing** — including event visibility, filters and ordering, create/edit validation, publish/cancel rules, registration idempotence, capacity limits, re-registration, closed-registration cases, permissions, and the attendee list.
- `python manage.py spectacular --validate` prints no warnings; `docs/api/openapi.yml` is up to date.
- No new database migrations were needed this week (the tables existed since Week 2).

## 9. Not built (do not design UI for these yet)
Event banner/image, categories, QR/check-in, notifications when an event is cancelled or changed (Week 5), event ratings (Week 6), co-organized events with another club (Week 6).

## 10. Status & Decisions
- **Status:** Week 4 backend **Completed & Verified**.
- **Decisions:** events use `status` (not a published boolean); completion is derived; no banner field; no QR/check-in; 409 for state conflicts; registration closes at the event's start time.
