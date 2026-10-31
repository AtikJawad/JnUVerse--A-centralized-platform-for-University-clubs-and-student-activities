# Week 05 — Backend Handoff: Notices & Notifications

**To:** Anik Khondokar (Frontend MVP Coder) & Antigravity  
**From:** Backend (Atik Jawad / Claude)  
**Topic:** Club notices (with audiences), in-app notifications, unread badge  
**Status:** **Backend Completed & Verified** (121 automated tests passing, OpenAPI validated)  
**Read first:** `WEEK_01-03_BACKEND_HANDOFF.md` (conventions: trailing slashes, error shapes, pagination, UUIDs, Bearer token) and `WEEK_04_BACKEND_HANDOFF.md`.  
**Contract source of truth:** `docs/api/openapi.yml` (`/api/docs/`).

---

## 1. Concepts
- A **notice** is an announcement posted by a club operator. It has an **audience** that controls who can *see* it.
- A **notification** is a personal inbox item (the bell). The backend creates notifications automatically; the frontend only reads them.
- Notifications are **in-app only** (no email/push). Poll `unread-count` (e.g. on page load and every 30–60 s) to update the badge.

## 2. Notice object
```json
{ "id": "uuid", "club": {"id": "uuid", "name": "JnU Research Society", "slug": "jnu-research-society"},
  "title": "Meeting moved", "body": "Full text…",
  "audience": "public", "department": null,
  "created_at": "2026-10-31T12:00:00+06:00", "updated_at": "2026-10-31T12:00:00+06:00" }
```
`audience`: `public | followers | members | department`. `department` is a department string (from `GET /api/auth/departments/`) only when `audience === "department"`, otherwise `null`.

### Who can SEE a notice
| Audience | Visible to |
|---|---|
| `public` | everyone, including anonymous visitors |
| `followers` | followers of the club **and** approved members |
| `members` | approved members only (pending/rejected/left/removed do not count) |
| `department` | students of that department |
| any | the posting club's own operator sees all of its notices |

Notices you cannot see return `404` on detail and are simply absent from lists. Other clubs' operators see only `public` notices of other clubs.

## 3. Notice endpoints
### `GET /api/notices/` — token optional (send it so you get the right feed)
Params: `club=<slug>`, `mine=true` (operators only: own club's notices incl. all audiences; anonymous `401`, student `403`), `page`, `page_size`. Newest first. Paginated list of Notice objects.

### `GET /api/notices/{id}/` — `200` Notice, or `404`.

### `POST /api/notices/` — club operator (anonymous `401`, student `403`)
```json
{ "title": "Meeting moved", "body": "Full text", "audience": "department",
  "department": "Computer Science and Engineering (CSE)" }
```
`201` → Notice (club is always the operator's own). `400` field errors:
| Case | Body |
|---|---|
| title/body empty | `{"title":[...]}` / `{"body":[...]}` |
| unknown audience | `{"audience":[...]}` |
| audience `department` without department | `{"department":["Required when audience is 'department'."]}` |
| department sent with another audience | `{"department":["Only allowed when audience is 'department'."]}` |
| department not in the list | `{"department":[...]}` |

Posting a notice immediately creates notifications (see §5). There are no drafts.

### `PATCH /api/notices/{id}/` — owning operator only
Only `title` and `body` can change; `audience`/`department` are **ignored** (read-only after posting). `200` Notice. Editing sends **no** new notification. Another club's operator on a visible notice → `403`; student `403`; anonymous `401`; `PUT` → `405`.

### `DELETE /api/notices/{id}/` — owning operator only
`204`. Related notifications are deleted too. Others: `403`/`401`; unknown → `404`.

**UI notes:** the notice form needs an audience selector; show the department dropdown only for `department`. Warn the operator that audience cannot be changed later.

## 4. Notification endpoints (any logged-in user — students and club operators; anonymous `401`)
### Notification object
```json
{ "id": "uuid", "type": "event_published", "title": "New event: Research Workshop",
  "message": "JnU Research Society published an event at Room 301.",
  "notice": null, "event": "uuid", "is_read": false, "read_at": null,
  "created_at": "2026-10-31T12:00:00+06:00" }
```
`type`: `notice | event_published | event_cancelled | event_updated | membership_update | collaboration_update` (the last is reserved for Week 6).
Deep links: `notice` → `/notices/{id}`, `event` → `/events/{id}`; both are `null` for `membership_update` (just show the text).

| Endpoint | Result |
|---|---|
| `GET /api/notifications/?unread=true&page=&page_size=` | paginated list, newest first, own notifications only |
| `GET /api/notifications/unread-count/` | `{"unread_count": 3}` (bell badge) |
| `POST /api/notifications/{id}/read/` | `200` Notification; idempotent (second call keeps the first `read_at`); someone else's id → `404` |
| `POST /api/notifications/read-all/` | `200 {"updated": n}` |

Notifications cannot be deleted. Opening a notification should call `read/` for it.

## 5. When notifications are created (automatic)
| Trigger | Who is notified | Type |
|---|---|---|
| Notice posted, `public` or `followers` | club's followers + approved members | `notice` |
| Notice posted, `members` | approved members | `notice` |
| Notice posted, `department` | all students of that department (follower or not) | `notice` |
| Event **published** | club's followers + approved members | `event_published` |
| Event **cancelled** | students currently registered | `event_cancelled` |
| Published event's **time or venue** changed | students currently registered; **once per event** per student | `event_updated` |
| Membership approved / rejected / removed | the student | `membership_update` |
| Student requests to join (also re-request) | the club's operator (student name + ID only, never email) | `membership_update` |

Rules: recipients are fixed at the moment of the action (someone who follows later does not get old notifications, but can still read visible notices in the feed). Editing a notice, editing other event fields (title, description, capacity), and creating drafts send nothing. The posting operator is not notified about their own notice.

## 6. Demo data
Demo notices and notifications are seeded (the Robotics Club is `democlub1`). All passwords are `Demo-Pass-12345`.

- **Notices:** 4 notices from `[DEMO] Robotics Club`, one per audience (public, followers, members, department).
- **`demo1@demo.jnuverse.test`:** 9 notifications (8 unread, 1 read): 4 notices, 2 "event published", 1 "event cancelled", 1 "event updated", 1 "membership approved". Follows and is an approved member of the Robotics Club, so this account sees every notice.
- **`demo2@demo.jnuverse.test`:** approved Robotics member with a "membership rejected" notification from the Debate Society. Gets all 4 notices.
- **`demo4@demo.jnuverse.test`:** follower only, so it does not see the `members` notice.
- **`demo5@demo.jnuverse.test`:** only the department notice, which makes it a near-empty inbox for testing.
- **`democlub1@demo.jnuverse.test`:** operator inbox with one "new membership request".
- **Live data:** log in as `club1@example.com` (`Str0ng-Pass-123`) to post a notice or publish or cancel an event, then check a demo student's bell.

## 7. Testing evidence
- Automated backend tests (pytest, local PostgreSQL): **121 passing** (86 before this week + 21 notice tests + 14 notification tests): audience visibility matrix, create/edit/delete permissions and validation, recipients per audience, publish/cancel/update triggers, one-per-event update rule, membership notifications, inbox isolation, unread count, mark read/all.
- `python manage.py spectacular --validate` prints no warnings; `docs/api/openapi.yml` regenerated.
- One new migration (`notifications`): adds the `event_updated` type; no database schema change.

## 8. Not built
Email/push notifications, real-time (WebSocket) delivery, notification deletion, per-user notification settings, notice attachments, multi-department targeting (one department per notice).

## 9. Status & Decisions
- **Status:** Week 5 backend **Completed & Verified**.
- **Decisions:** notices publish immediately; audience fixed after posting; `followers` notices are also visible to approved members; "event updated" is sent at most once per student per event; operators have an inbox too.
