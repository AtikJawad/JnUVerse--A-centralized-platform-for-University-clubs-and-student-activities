# Weeks 01–03 — Backend Handoff: Foundation, Authentication, Clubs & Memberships

**To:** Anik Khondokar (Frontend MVP Coder) & Antigravity  
**From:** Backend (Atik Jawad / Claude)  
**Topic:** API conventions, authentication & student verification, club discovery, follow, membership workflow  
**Status:** **Backend Completed & Verified** (automated tests passing, OpenAPI validated)  
**Contract source of truth:** `docs/api/openapi.yml` (also live at `/api/docs/`). If this file and `openapi.yml` ever disagree, `openapi.yml` wins — tell the backend team.

---

## 1. Week 01 — Foundation & API Conventions (applies to every endpoint)

### 1.1 Base URLs
| Environment | Backend | Frontend |
|---|---|---|
| Local | `http://127.0.0.1:8000` | `http://localhost:5173` |
| Deployed | Render web service URL (ask the backend team for the exact address) | `https://jnuverse.vercel.app` |

- Set `VITE_API_BASE_URL` to the backend base URL (no trailing slash). Vite bakes it in at build time, so a Vercel redeploy is needed after changing it.
- The Render free tier sleeps after ~15 minutes idle; the **first request can take about a minute**. Show loading states and retry-friendly errors.
- CORS allows only the origins configured on the backend (`localhost:5173` and `https://jnuverse.vercel.app`). Vercel preview URLs are **not** allowed; test on the production domain or ask for the origin to be added.
- Health check: `GET /api/health/` → `{"status":"ok","project":"JnUVerse backend"}`.

### 1.2 URL rules
- **Every endpoint ends with a trailing slash** (`/api/auth/login/`, not `/api/auth/login`). Requests without it fail.
- All request and response bodies are JSON (`Content-Type: application/json`).

### 1.3 Identifiers, dates, roles
- All ids are **UUID strings**. Never parse them as numbers.
- All timestamps are ISO 8601 strings with a timezone offset (e.g. `2026-10-21T12:45:17.099384+06:00`). Display in local time; send with `new Date(value).toISOString()`.
- Exactly two roles: `"student"` and `"club_operator"`. There is **no admin role** in the product (`is_staff` exists only for developers using Django's `/admin/`).

### 1.4 Authentication header
Protected endpoints need `Authorization: Bearer <access_token>`. Access token lifetime **30 minutes**, refresh token **7 days** (see Week 02).

### 1.5 Status codes and error shapes
| Code | Meaning | Body |
|---|---|---|
| 200 / 201 | Success / created | the resource |
| 204 | Success, no body | — |
| 400 | Validation error | field-keyed arrays: `{"password":["..."]}` and/or `{"non_field_errors":["..."]}` |
| 401 | Not logged in or token invalid/expired | `{"detail": "..."}` |
| 403 | Logged in but the role/ownership is wrong | `{"detail": "..."}` |
| 404 | Unknown id/slug, or a resource you are not allowed to see | `{"detail": "..."}` |
| 409 | The action is not allowed in the current state (e.g. approving a non-pending request) | `{"detail": "..."}` |

- Show the server's message; do not invent your own. Anonymous users calling a protected endpoint get **401**; logged-in users with the wrong role get **403**.
- Some endpoints return `detail` only; others return field errors. Handle both.

### 1.6 Pagination
List endpoints return:
```json
{ "count": 42, "next": "<url or null>", "previous": "<url or null>", "results": [ ... ] }
```
Query params: `?page=1&page_size=20` (default 20, maximum 50).

---

## 2. Week 02 — Authentication, Registration & Student Verification

### 2.1 Rules
- Student registration is accepted **only** if **Student ID + email both match** one imported valid JnU student record (case-insensitive) and that student has not already registered.
- The student's **name comes from the record**, not from the form. Department and batch are entered by the student.
- Club accounts are **verified automatically** when created — no approval step.
- Login accepts **email or Student ID** in one field.
- Student ID is stored upper-case; emails lower-case.

### 2.2 `GET /api/auth/departments/` — public
`200`: `{"departments": ["Bangla", "English", ..., "Computer Science and Engineering (CSE)", ...]}` (38 fixed names). Use it to fill the department dropdown; send the **exact string** back.

### 2.3 `POST /api/auth/register/student/` — public
Request:
```json
{ "student_id": "B220305047", "email": "anik12@gmail.com",
  "department": "Computer Science and Engineering (CSE)", "batch": 22,
  "password": "Str0ng-Pass-123", "password_confirm": "Str0ng-Pass-123" }
```
`batch` is a whole number ≥ 1 (e.g. `22`). `201`:
```json
{ "id": "uuid", "email": "anik12@gmail.com", "student_id": "B220305047", "name": "Anik Khondokar",
  "department": "Computer Science and Engineering (CSE)", "batch": 22, "role": "student" }
```
No tokens are returned — send the user to the login page.

`400` cases:
| Situation | Body |
|---|---|
| ID/email do not match a valid record (or record inactive) | `{"non_field_errors":["Student ID and email do not match a valid JnU student record."]}` |
| Already registered | `{"non_field_errors":["An account already exists for this student."]}` |
| Passwords differ | `{"password_confirm":["Passwords do not match."]}` |
| Weak password (too short, too common, all digits) | `{"password":["..."]}` (one or more messages) |
| Department not in the list | `{"department":["..."]}` |
| Batch missing / < 1 | `{"batch":["..."]}` |

### 2.3b `POST /api/auth/register/club/` — public
Request:
```json
{ "club_name": "JnU Research Society", "description": "Research club", "contact_email": "contact@example.com",
  "email": "club1@example.com", "password": "Str0ng-Pass-123", "password_confirm": "Str0ng-Pass-123" }
```
`description` and `contact_email` are optional. The login `email` can be **any** email address. `201`:
```json
{ "user": { "id": "uuid", "email": "club1@example.com", "student_id": null, "name": "JnU Research Society",
            "department": null, "batch": null, "role": "club_operator" },
  "club": { "id": "uuid", "name": "JnU Research Society", "slug": "jnu-research-society", "description": "Research club",
            "logo": "", "contact_email": "contact@example.com", "is_verified": true } }
```
`400` field errors: `{"email":[...]}` (already used), `{"club_name":[...]}` (name already taken — compared case-insensitively), `{"contact_email":[...]}`, `{"password":[...]}`, `{"password_confirm":[...]}`.

The club **slug** is generated from the name (e.g. `jnu-research-society`; a clash gets a suffix such as `-2`) and never changes.

### 2.4 `POST /api/auth/login/` — public
Request: `{"identifier": "B220305043", "password": "Str0ng-Pass-123"}` (`identifier` = email **or** Student ID). `200`:
```json
{ "access": "eyJ...", "refresh": "eyJ...",
  "user": { "id": "uuid", "email": "atikjawad@gmail.com", "student_id": "B220305043", "name": "Atik Jawad",
            "department": "Computer Science and Engineering (CSE)", "batch": 22, "role": "student" } }
```
`400`: `{"non_field_errors":["Invalid credentials."]}` (wrong password, unknown identifier and deactivated accounts all give this same message).

### 2.5 `POST /api/auth/refresh/` — public
Request `{"refresh": "<refresh_token>"}` → `200 {"access": "<new access token>"}`. `401` if the refresh token is invalid or expired — then log the user out.

### 2.6 `GET /api/auth/me/` — Bearer token
`200`: the user object (same shape as `user` above). For a **club operator** it also contains `"club": { id, name, slug, description, logo, contact_email, is_verified }`. `401` without a valid token.

### 2.7 User object (used everywhere)
`{ id, email, student_id|null, name, department|null, batch|null, role }`. For club operators, `student_id/department/batch` are `null` and `name` is the club name.

### 2.8 Privacy
- The imported student-record table is **reference data only** and is never exposed by any endpoint.
- Passwords/hashes are never returned.

---

## 3. Week 03 — Club Discovery, Follow & Membership

### 3.1 Club object
```json
{ "id": "uuid", "name": "JnU Research Society", "slug": "jnu-research-society", "description": "Research club",
  "logo": "", "contact_email": "", "is_verified": true,
  "follower_count": 2, "member_count": 1,
  "is_following": true, "my_membership": "approved", "created_at": "2026-10-21T12:45:17.099384+06:00" }
```
- `is_verified` is always `true` (clubs are verified when created).
- **`member_count` counts approved members only** — pending requests are never included. `follower_count` counts followers.
- `is_following` is `true`/`false` for logged-in **students**, `null` for anonymous users and club operators.
- `my_membership` is the student's membership status — `"pending" | "approved" | "rejected" | "left" | "removed"` — or `null` (no membership, or the viewer is not a student). **Handle all five values.**
- `logo` is a **URL string** (no file upload yet); empty string if none.

### 3.2 Public endpoints (send the Bearer token when logged in so `is_following` / `my_membership` are filled)
- `GET /api/clubs/?search=<name>&page=&page_size=` → paginated list, sorted by name. `search` matches the club name (case-insensitive, partial).
- `GET /api/clubs/{slug}/` → one club (`404` if the slug does not exist).

### 3.3 "My clubs" filters — students only
- `GET /api/clubs/?joined=true` → clubs where the student is an **approved** member.
- `GET /api/clubs/?following=true` → clubs the student follows.
- Both together = AND. They combine with `search` and paging. Anonymous → `401`, club operator → `403`. `joined=false` or a missing param means no filter.

### 3.4 Club profile update — the club's own operator only
`PATCH /api/clubs/{slug}/` with any of `{ "description", "logo", "contact_email" }` → `200` club object.
- `name` and `slug` **cannot be changed**: if sent, they are silently **ignored** (not an error).
- `400` field errors, e.g. `{"contact_email":["Enter a valid email address."]}`.
- `PUT` is not allowed (`405`). Anonymous → `401`; a student or another club's operator → `403`.

### 3.5 Follow / unfollow — students only (anonymous `401`, operator `403`, unknown slug `404`)
- `POST /api/clubs/{slug}/follow/` → `201 {"following": true, "follower_count": n}` (new) or `200` (already following).
- `DELETE /api/clubs/{slug}/follow/` → `204` (also when not following).
- Following is independent of membership.

### 3.6 Student membership — students only
- `GET /api/clubs/{slug}/membership/` → `{"status": "pending"|"approved"|"rejected"|"left"|"removed"|null, "requested_at": "<iso>"|null}`
- `POST /api/clubs/{slug}/membership/` → request to join. `201 {"status":"pending","requested_at":...}` for a new request or a re-request; `200` with the current state if already `pending` or `approved` (no change).
- `DELETE /api/clubs/{slug}/membership/` → `204`. An `approved` member becomes `left`; a `pending` request becomes `left` (cancel); anything else is a no-op (still `204`).

**What the student can do, by current status**
| `my_membership` | Show | Action |
|---|---|---|
| `null`, `left`, `rejected`, `removed` | "Request to join" (for `rejected`/`removed`, a short note) | `POST` → `pending` |
| `pending` | "Request pending" + "Cancel request" | `DELETE` → `left` |
| `approved` | "Member" + "Leave club" (confirm first) | `DELETE` → `left` |

There is no cooldown: a student can request again immediately after a rejection, leave or removal (the same record is reset to `pending`). Becoming a member does not auto-follow.

### 3.7 Operator member management — the club's own operator only
Anonymous `401`, student `403`, another club's operator `403`, unknown slug `404`.
- `GET /api/clubs/{slug}/membership-requests/` → paginated **pending** requests, oldest first.
- `GET /api/clubs/{slug}/members/` → paginated **approved** members, sorted by name.
- `POST /api/clubs/{slug}/memberships/{id}/approve/` → `200` membership (`pending` → `approved`).
- `POST /api/clubs/{slug}/memberships/{id}/reject/` → `200` membership (`pending` → `rejected`).
- `DELETE /api/clubs/{slug}/memberships/{id}/` → `204` (`approved` → `removed`).
- Acting on the wrong status → `409 {"detail": "..."}` (e.g. approving an already-approved request). An `id` that belongs to another club → `404`.

Membership object (the **only** shape operators ever receive):
```json
{ "id": "uuid", "student_id": "B220305043", "name": "Atik Jawad",
  "department": "Computer Science and Engineering (CSE)", "batch": 22,
  "status": "approved", "requested_at": "2026-10-21T...", "reviewed_at": "2026-10-22T..." }
```
**Privacy (mandatory): never request, display or store student email addresses on operator screens — the API does not send them.**

---

## 4. Answers to the earlier open questions
1. **Student "My Clubs":** done via `?joined=true` and `?following=true` (see 3.3).
2. **Club categories:** not part of the approved database design; use name search for now. Adding a category would be a team decision.

## 5. Testing evidence
- Automated backend tests (pytest on a local PostgreSQL): **62 passing** at the end of Week 3 (auth, registration, clubs, club filters, follow, membership, operator review, database constraints). The whole suite is 86 tests as of Week 4.
- `python manage.py spectacular --validate` prints no warnings; `docs/api/openapi.yml` is regenerated after every change.
- Deployed backend: `/api/health/`, `/api/docs/` and `/admin/` were checked on Render. The registration/login flows were verified locally and by automated tests.

## 6. Not built (do not design UI for these yet)
Club categories, club logo upload, student emails for operators, rate limiting, password reset, email verification.

## 7. Status & Decisions
- **Status:** Backend for Weeks 1–3 **Completed & Verified**.
- **Decisions:** no University Admin role; clubs verified on creation; students verified by Student ID + email against imported records; one operator account per club; the club name/slug are fixed after creation.
