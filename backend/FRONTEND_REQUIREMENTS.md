# JnUVerse Backend — Frontend Integration Requirements & API Handoff

**Platform:** JnUVerse (Centralized Platform for University Clubs & Student Activities)  
**Target Audience:** Backend MVP Coder (Atik Jawad) & Development Team  
**Author:** Frontend MVP Coder (Anik Khondokar)  
**Stage:** Week 9 — Integration & Testing (originally Step 1 Foundation & Architecture Audit)  
**Date:** October 2026 · **Last updated:** 2026-11-28  

---

## A. Purpose

This document formally specifies the API contracts, response payloads, role permissions, validation rules, and backend capabilities required by the React frontend for **JnUVerse**.

### Core Tenets:
1. **Separation of Concerns:** The React frontend is implemented independently of the Django backend. The frontend communicates exclusively via HTTP with the Django REST Framework (DRF) API (`/api/`) and **never connects directly to PostgreSQL or Supabase**.
2. **Handoff & Review:** This document acts as the contract bridge between frontend and backend. All requested endpoints, parameters, and behaviors must be reviewed, validated, and scheduled by the backend developer.
3. **No Assumptions:** This document clearly distinguishes between **endpoints that are already verified in code** and **endpoints that are currently missing, planned, or requiring confirmation**. Merely having a database model in Django does not mean an endpoint is operational.
4. **Verification Requirement:** All API contracts must be verified against actual code execution and DRF test suites.

---

## Current Status at a Glance (2026-11-28)

- **Backend:** Weeks 1–8 delivered (see `frontend/docs/backend-handoff/`). **Frontend:** Weeks 1–8 integrated; Week 9 integration and testing in progress (Stages 1–3 done).
- **Contract:** every frontend API call matches `docs/api/openapi.yml`, and **all 64 backend operations are used by the frontend** (`npm run audit:api`, Week 9 Stage 1). The committed spec matches a spec regenerated from the current code.
- **What the frontend needs from the backend now:** the open requests below.

## Open Requests for the Backend (consolidated)

| # | Request | Why | Priority | Details |
|:---:|---|---|:---:|---|
| 1 | **Test database for Week 9** (local PostgreSQL or a separate Supabase project) | `backend/.env` points at the shared Supabase database used by the deployed app, so the frontend's automated tests are limited to read-only checks. | High | [Week 9 handoff §4.2](docs/frontend-handoff/WEEK_09_INTEGRATION_AND_TESTING.md) |
| 2 | **Re-seed the demo data** (`seed_demo_events --reset --allow-remote`, then `seed_demo_events --allow-remote`) | Time-based figures expired (dashboards show 0 upcoming / 0 to rate / 0 weekly registrations); also restores demo data changed during frontend QA (see below). | High — before the demo | [Week 7 follow-ups](docs/frontend-handoff/WEEK_07_REPORTS_AND_DASHBOARDS.md) |
| 3 | **Seed attendance** for ended `[DEMO]` events | Attendance is never seeded, so reports 1, 3, 4 and 5 show 0 % attendance and "—" response rates. | High — before the demo | [Week 8 follow-ups](docs/frontend-handoff/WEEK_08_ANALYTICAL_REPORTS.md) |
| 4 | **Spread demo students across several departments** | All five demo students are in Bangla; the department chart shows one bar. | Medium | [Week 8 follow-ups](docs/frontend-handoff/WEEK_08_ANALYTICAL_REPORTS.md) |
| 5 | *(Cosmetic)* Regenerate the committed `docs/api/openapi.yml` | It uses `api_`-prefixed `operationId`s and one `api` tag; the current code generates per-app tags, which group Swagger UI better. | Low | [Week 9 handoff §4.2](docs/frontend-handoff/WEEK_09_INTEGRATION_AND_TESTING.md) |
| 6 | *(Optional)* Include `club` in the `user` object returned by `POST /api/auth/login/` for operators | Only `/api/auth/me/` has `club`; the frontend makes one extra `/me` call after operator login. | Low | [Week 7 follow-ups](docs/frontend-handoff/WEEK_07_REPORTS_AND_DASHBOARDS.md) |

## Checking Frontend Compatibility After an API Change

1. Regenerate the spec: `python manage.py spectacular --file ../docs/api/openapi.yml` (from `backend/`).
2. Run the contract audit: `cd frontend && npm run audit:api`. It lists frontend calls to paths or methods the spec no longer has, missing trailing slashes, and backend operations no screen uses; it exits 1 on a mismatch.
3. Optional end-to-end checks against a running dev server and backend (read-only): `npm run test:resilience`.

## Changes Made on the Shared Database During Frontend Testing

The frontend keeps automated checks read-only. Known writes so far (all on `[DEMO]` data, restored by a re-seed):
- 2026-11-28, Week 7 Stage 1: a test logo was uploaded to `[DEMO] Robotics Club` and removed immediately (logo back to `null`).
- Week 7 manual QA by the frontend developer: `[DEMO] Robotics Club` interests now include Entrepreneurship and Environment (seed: Technology, Programming, Robotics). Other manual QA steps (uploads, approvals, reports, attendance) may also have changed `[DEMO]` data.

---

## Weekly Handoff Documentation Index

Phase-by-phase requirements, acceptance criteria, and specific endpoint contracts are organized in:

- [Week 1: Project Foundation & Health Check](docs/frontend-handoff/WEEK_01_REPOSITORY_AUDIT_AND_DESIGN_FOUNDATION.md) (Status: **Completed & Verified**)
- [Week 2: Authentication, Registration & Student Verification](docs/frontend-handoff/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md) (Status: **Completed & Verified**)
- [Week 3: Club Discovery, Profiles & Memberships](docs/frontend-handoff/WEEK_03_CLUB_DISCOVERY_AND_MEMBERSHIP.md) (Status: **Delivered & Integrated**)
- [Week 4: Events & RSVP Registration](docs/frontend-handoff/WEEK_04_EVENTS_AND_REGISTRATION.md) (Status: **Delivered & Integrated**)
- [Week 5: Notices & Notifications](docs/frontend-handoff/WEEK_05_NOTICES_AND_NOTIFICATIONS.md) (Status: **Delivered & Integrated**)
- [Week 6: Ratings (1–5 Stars Only) & Collaborations](docs/frontend-handoff/WEEK_06_RATINGS_AND_COLLABORATION.md) (Status: **Delivered & Integrated**)
- [Week 7: Content Reports & Dashboards](docs/frontend-handoff/WEEK_07_REPORTS_AND_DASHBOARDS.md) (Status: **Delivered & Integrated**)
- [Week 8: Five Analytical Reports](docs/frontend-handoff/WEEK_08_ANALYTICAL_REPORTS.md) (Status: **Delivered & Integrated**)
- [Week 9: Cross-Module Integration & Comprehensive Testing](docs/frontend-handoff/WEEK_09_INTEGRATION_AND_TESTING.md) (Status: **In Progress — frontend Stages 1–3 done; see §4 for findings and requests**)
- [Week 10: Finalization & Delivery](docs/frontend-handoff/WEEK_10_FINALIZATION_AND_DELIVERY.md) (Status: **Pending**)

---

## B. Existing API Inventory

> **Update 2026-11-28:** The backend now exposes **64 operations** (see `docs/api/openapi.yml`), all used by the frontend. The table below is the original Week 1–3 inventory; the "Partially Implemented" and "Not Implemented" tables (B.2, B.3) were all resolved by the Week 3–8 backend handoffs.

Based on an audit of `backend/config/urls.py`, `backend/apps/accounts/`, `backend/apps/clubs/`, and open apps:

### 1. Implemented and Verified in Code

| Feature | HTTP Method | Endpoint Path | Implementation Status | Auth Required | Frontend Usage | Notes & Limitations |
|:---|:---|:---|:---|:---|:---|:---|
| **Health Check** | `GET` | `/api/health/` | **Verified** | None (`AllowAny`) | App initialization check | Returns `{"status": "ok", "project": "JnUVerse backend"}`. |
| **Student Registration** | `POST` | `/api/auth/register/student/` | **Verified** | None (`AllowAny`) | Student Registration Page (`/register`) | Requires `student_id`, `email`, `department`, `batch`, `password`, `password_confirm`. Validated against `ValidStudentRecord`. Returns 201 with `User` data. |
| **Club Registration** | `POST` | `/api/auth/register/club/` | **Verified** | None (`AllowAny`) | Operator Registration Page | Requires `club_name`, `email`, `password`, `password_confirm`, optional `description`, `contact_email`. Creates operator account with role `club_operator` and verified `Club`. |
| **User Login** | `POST` | `/api/auth/login/` | **Verified** | None (`AllowAny`) | Login Page (`/login`) | Body: `{ "identifier": "...", "password": "..." }`. Accepts student ID or email. Returns `{ "access", "refresh", "user" }`. |
| **Token Refresh** | `POST` | `/api/auth/refresh/` | **Verified** | None (`AllowAny`) | Axios Response Interceptor (`api.js`) | SimpleJWT refresh endpoint. Body: `{ "refresh": "..." }`. Returns `{ "access" }`. |
| **Current User Session** | `GET` | `/api/auth/me/` | **Verified** | Bearer JWT (`IsAuthenticated`) | Session restore on mount (`AuthContext.jsx`) | Returns `{ "id", "email", "student_id", "name", "department", "batch", "role", "club" }`. |
| **Department List** | `GET` | `/api/auth/departments/` | **Verified** | None (`AllowAny`) | Registration department selector dropdown | Returns `{ "departments": [...] }` with 38 JnU departments. |
| **Club Discovery & Search** | `GET` | `/api/clubs/` | **Verified** | None (`AllowAny`) | Explore Clubs screen | Paginated (`page`, `page_size`, max 50). Supports `?search=<name>`. Annotates `follower_count`, `member_count`, `is_following`, `my_membership`. |
| **Club Detail** | `GET` | `/api/clubs/<slug>/` | **Verified** | None (`AllowAny`) | Club Profile screen | Returns detailed club profile annotated with follower and member counts, following status, and membership state. |
| **Club Profile Update** | `PATCH` | `/api/clubs/<slug>/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator Club Settings | Editable fields: `description`, `contact_email`, `interests` (Week 7). **`logo` is no longer accepted here** — use `PUT/DELETE /api/clubs/<slug>/logo/` (Week 7 image addendum). |
| **Follow Club** | `POST` | `/api/clubs/<slug>/follow/` | **Verified** | Bearer JWT (`IsStudent`) | Club Profile "Follow" toggle | Creates `ClubFollow` for student. Returns `{"following": true, "follower_count": int}` (201 or 200). |
| **Unfollow Club** | `DELETE` | `/api/clubs/<slug>/follow/` | **Verified** | Bearer JWT (`IsStudent`) | Club Profile "Unfollow" toggle | Deletes `ClubFollow` for student. Returns 204 No Content. |
| **Check My Membership** | `GET` | `/api/clubs/<slug>/membership/` | **Verified** | Bearer JWT (`IsStudent`) | Club Profile membership badge | Returns `{ "status": "pending"|"approved"|null, "requested_at": "..."|null }`. |
| **Request Membership** | `POST` | `/api/clubs/<slug>/membership/` | **Verified** | Bearer JWT (`IsStudent`) | Club Profile "Join Club" action | Submits join request. Returns 201/200 `{ "status": "pending", "requested_at": "..." }`. |
| **Leave Club / Cancel Request** | `DELETE` | `/api/clubs/<slug>/membership/` | **Verified** | Bearer JWT (`IsStudent`) | Club Profile "Leave Club" action | Sets status to `left`. Returns 204 No Content. |
| **List Approved Members** | `GET` | `/api/clubs/<slug>/members/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator Member Management | Returns paginated list of approved members. **Note: Student emails are withheld for privacy.** |
| **List Membership Requests** | `GET` | `/api/clubs/<slug>/membership-requests/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator Request Review queue | Returns paginated list of pending membership requests. |
| **Approve Membership** | `POST` | `/api/clubs/<slug>/memberships/<uuid>/approve/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator review action | Updates status from `pending` to `approved`. Returns 200 with updated membership record. Returns 409 if not pending. |
| **Reject Membership** | `POST` | `/api/clubs/<slug>/memberships/<uuid>/reject/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator review action | Updates status from `pending` to `rejected`. Returns 200 with updated membership record. Returns 409 if not pending. |
| **Remove Member** | `DELETE` | `/api/clubs/<slug>/memberships/<uuid>/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator remove member action | Updates status from `approved` to `removed`. Returns 204 No Content. Returns 409 if not approved. |

### 2. Partially Implemented or Requiring Confirmation

> **Resolved:** "My Clubs" is served by `GET /api/clubs/?joined=true` / `?following=true` (Week 3); club categories were replaced by the shared interests list (Week 7).

| Feature | Proposed / Unverified Endpoint | Status in Backend Code | Required Confirmation from Backend Developer |
|:---|:---|:---|:---|
| **Student's Joined Clubs List ("My Clubs")** | Proposed: `GET /api/clubs/my/` or filter `GET /api/clubs/?joined=true` | Currently no explicit endpoint or filter parameter exists in `ClubListView`. | Can backend add a query parameter `?filter=my-clubs` to `ClubListView`, or a dedicated `GET /api/clubs/my/` endpoint for authenticated students? |
| **Club Category Filtering** | Proposed: `GET /api/clubs/?category=...` | Model has no explicit `category` field currently; `search_fields = ["name"]`. | Is a club category/genre taxonomy planned (e.g. cultural, research, tech, debate), or should frontend search by keyword/tag? |

### 3. Not Implemented & Required for Later Stages

> **Resolved:** everything below was delivered in Weeks 4–7 (final paths differ from these proposals, e.g. ratings use `PUT /api/events/<id>/rating/`, notices use `/api/notices/`). See the weekly backend handoffs and `openapi.yml`.

| Feature | Target Week | Proposed Path | Model Status | Endpoints Status | Notes |
|:---|:---:|:---|:---|:---|:---|
| **Event Listing & Search** | Week 4 | `GET /api/events/` | Model `Event` exists in `apps/events/` | **No views or routes wired** | Needs filter by status (`published`), club slug, upcoming vs past dates. |
| **Event Detail** | Week 4 | `GET /api/events/<uuid>/` | Model `Event` exists | **No views or routes wired** | Public details, venue, start/end dates, remaining capacity. |
| **Event Create / Update** | Week 4 | `POST/PATCH /api/events/` | Model `Event` exists | **No views or routes wired** | Restricted to `IsClubOperator` for their own club. |
| **Event RSVP / Registration** | Week 4 | `POST /api/events/<uuid>/register/` | Model `EventRegistration` exists | **No views or routes wired** | Restricted to `IsStudent`. Enforces capacity limit & unique student registration constraint. |
| **Cancel Event RSVP** | Week 4 | `DELETE /api/events/<uuid>/register/` | Model `EventRegistration` exists | **No views or routes wired** | Sets status to `cancelled`. |
| **Student Notifications List** | Week 5 | `GET /api/notifications/` | Model `Notification` exists in `apps/notifications/` | **No views or routes wired** | Restricted to `IsAuthenticated`. Ordered by `-created_at`. Needs unread indicator. |
| **Mark Notification as Read** | Week 5 | `PATCH /api/notifications/<uuid>/read/` | Model `Notification` exists | **No views or routes wired** | Sets `read_at = timezone.now()`. |
| **Club Notice Creation** | Week 5 | `POST /api/clubs/<slug>/notices/` | Model `Notice` exists | **No views or routes wired** | Restricted to `IsClubOperator`. Audience: `public`, `followers`, `members`, or `department`. |
| **Post-Event Rating Submission** | Week 6 | `POST /api/events/<uuid>/ratings/` | Model `EventRating` exists in `apps/feedback/` | **No views or routes wired** | Restricted to `IsStudent` who attended/registered. **Numeric rating 1 to 5 only. No written comments.** |
| **Event Rating Aggregate** | Week 6 | `GET /api/events/<uuid>/ratings/summary/` | Model `EventRating` exists | **No views or routes wired** | Average star rating and count. |
| **Collaboration Request Create** | Week 6 | `POST /api/collaborations/` | Model `CollaborationRequest` exists | **No views or routes wired** | Restricted to `IsClubOperator`. Prohibits requesting own club. Unique pending per pair. |
| **Collaboration List & Review** | Week 6 | `GET/POST /api/collaborations/...` | Model `CollaborationRequest` exists | **No views or routes wired** | List sent/received requests; accept or reject. |
| **Content Report Submission** | Week 7 | `POST /api/reports/` | Model `ContentReport` exists in `apps/reports/` | **No views or routes wired** | Allows students to flag inappropriate club or event. Note: Resolution is via Django Admin. |

---

## C. Authentication Requirements

### 1. Role-Based Access Control (RBAC)
The system supports **exactly two roles**:
- `student` (Student)
- `club_operator` (Club Operator)

*(Note: The previously considered university admin role was removed. Clubs are verified upon account creation).*

### 2. Student Registration Contract
- **Endpoint:** `POST /api/auth/register/student/`
- **Request Body (JSON):**
  ```json
  {
    "student_id": "B220305047",
    "email": "anik12@gmail.com",
    "department": "Computer Science and Engineering (CSE)",
    "batch": 22,
    "password": "Str0ng-Pass-123",
    "password_confirm": "Str0ng-Pass-123"
  }
  ```
- **Backend Rules Verified:**
  - `student_id` is automatically uppercased and trimmed.
  - `email` is lowercased and trimmed.
  - Must match an active `ValidStudentRecord` pre-seeded by the university.
  - Password validated against Django core validators.
  - Returns `201 Created` with `UserSerializer` object.
  - Returns `400 Bad Request` with `{"non_field_errors": ["Student ID and email do not match a valid JnU student record."]}` if not matching registrar data.

### 3. Login Contract
- **Endpoint:** `POST /api/auth/login/`
- **Request Body (JSON):**
  ```json
  {
    "identifier": "B220305043",
    "password": "Str0ng-Pass-123"
  }
  ```
- **Backend Rules Verified:**
  - `identifier` accepts either the student's email OR their JnU Student ID.
  - Returns `200 OK`:
    ```json
    {
      "access": "<JWT access token>",
      "refresh": "<JWT refresh token>",
      "user": {
        "id": "uuid",
        "email": "atikjawad@gmail.com",
        "student_id": "B220305043",
        "name": "Atik Jawad",
        "department": "Computer Science and Engineering (CSE)",
        "batch": 22,
        "role": "student"
      }
    }
    ```

### 4. Authenticated Session Retrieval
- **Endpoint:** `GET /api/auth/me/`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response:** Current user details. If user is a `club_operator`, includes nested `club` object:
  ```json
  {
    "id": "uuid",
    "email": "club1@example.com",
    "student_id": null,
    "name": "JnU Research Society",
    "department": null,
    "batch": null,
    "role": "club_operator",
    "club": {
      "id": "uuid",
      "name": "JnU Research Society",
      "slug": "jnu-research-society",
      "description": "...",
      "logo": null,
      "contact_email": "club1@example.com",
      "is_verified": true
    }
  }
  ```

---

## D. Club & Membership Requirements

### 1. Privacy & Domain Rules
- **One Operator per Club:** Each club has exactly one authorized operator account.
- **Student Privacy:** Club operators **must never** receive student email addresses. The `MembershipSerializer` intentionally restricts exposed fields to: `id`, `student_id`, `name`, `department`, `batch`, `status`, `requested_at`, and `reviewed_at`.
- **Automatic Club Verification:** `is_verified` is hardcoded to `true` on creation.

### 2. Follow / Unfollow Workflow
- `POST /api/clubs/<slug>/follow/` creates follow link and returns updated `follower_count`.
- `DELETE /api/clubs/<slug>/follow/` removes follow link and returns `204 No Content`.

### 3. Membership Lifecycle
- `POST /api/clubs/<slug>/membership/` submits a join request (`status: "pending"`).
- `GET /api/clubs/<slug>/membership-requests/` returns pending requests for the operator.
- `POST /api/clubs/<slug>/memberships/<uuid>/approve/` moves request to `approved`.
- `POST /api/clubs/<slug>/memberships/<uuid>/reject/` moves request to `rejected`.
- `DELETE /api/clubs/<slug>/memberships/<uuid>/` removes an approved member (`status: "removed"`).
- `DELETE /api/clubs/<slug>/membership/` allows a student to leave a club (`status: "left"`).

---

## E. Events & Registration Requirements (Week 4 Focus)

The database models `Event` and `EventRegistration` are implemented, but API endpoints remain unexposed. The frontend will require:

1. **`GET /api/events/`**:
   - Query parameters: `?club=<slug>`, `?upcoming=true`, `?search=<keyword>`, `?page=1`.
   - Response: List of published events with title, venue, starts_at, ends_at, capacity, attendee_count, is_registered.
2. **`GET /api/events/<uuid>/`**:
   - Full event description, club details, registration availability.
3. **`POST /api/events/`** *(Operator Only)*:
   - Body: `title`, `description`, `venue`, `starts_at`, `ends_at`, `capacity`, `status` (`draft` or `published`).
4. **`POST /api/events/<uuid>/register/`** *(Student Only)*:
   - Enforces capacity limit. Returns 400 if event is full or ends_at is in the past.

---

## F. Notices & Notifications Requirements (Week 5 Focus)

1. **`GET /api/notifications/`**:
   - Paginated notifications for the authenticated user, indicating `type`, `title`, `message`, `read_at`, `created_at`.
2. **`PATCH /api/notifications/<uuid>/read/`**:
   - Marks a single notification as read.
3. **`POST /api/notifications/mark-all-read/`**:
   - Optional convenience endpoint to mark all notifications as read.
4. **`POST /api/clubs/<slug>/notices/`** *(Operator Only)*:
   - Body: `title`, `body`, `audience` (`public`, `followers`, `members`, `department`), `target_department`.

---

## G. Feedback & Ratings Requirements (Week 6 Focus)

1. **Rating-Only Rule:**
   - Feedback is **strictly rating-only (1 to 5 stars)**.
   - There are **no written comments, reviews, or text fields** in the `EventRating` model.
2. **Submission Constraint:**
   - `UniqueConstraint(fields=["event", "student"])` prevents duplicate submissions.
   - Student must have registered for the event.
3. **Proposed Endpoints:**
   - `POST /api/events/<uuid>/ratings/`: Body: `{"rating": 5}`.
   - `GET /api/events/<uuid>/ratings/summary/`: Returns `{"average": 4.8, "total_ratings": 42}`.

---

## H. Collaborations & Content Reports Requirements

1. **Collaborations (Week 6):**
   - Between two distinct clubs.
   - Unique pending constraint per pair.
   - Endpoints needed: `POST /api/collaborations/` (send request), `GET /api/collaborations/` (list sent & received), `POST /api/collaborations/<uuid>/respond/` (accept/reject).
2. **Content Reports (Week 7):**
   - The model `ContentReport` exists to flag inappropriate clubs or events.
   - Endpoint needed: `POST /api/reports/` with fields: `club_slug` OR `event_id`, `reason` (`inappropriate`, `spam`, `misleading`, `harassment`, `other`), `details`.
   - Resolution is handled through Django Admin by developers.

---

## I. Dashboard Data Requirements

To avoid unnecessary analytical endpoints, the frontend can derive most metrics from existing annotated queries:

| Metric | Source / Approach | Backend Action Required? |
|:---|:---|:---|
| **Club Follower Count** | Already provided in `ClubPublicSerializer.follower_count` | None (Operational) |
| **Club Member Count** | Already provided in `ClubPublicSerializer.member_count` | None (Operational) |
| **Pending Request Count** | Can be retrieved from `ClubMembershipRequestListView.count` | None (Operational) |
| **Student's Joined Clubs Count** | Currently requires a dedicated filter or endpoint | **Recommended:** Add `?my_clubs=true` to `ClubListView` |
| **Unread Notification Count** | Will be needed for header notification badge | Add `unread_count` header or summary field |

---

## J. Contract Details Required for Integration

For all upcoming endpoints, please maintain the standard DRF error response structure:
- **Validation Errors (400):** `{"<field_name>": ["Error message 1", "..."]}` or `{"non_field_errors": ["..."]}`
- **Authentication Errors (401):** `{"detail": "Authentication credentials were not provided."}`
- **Permission Errors (403):** `{"detail": "You do not have permission to perform this action."}`
- **Conflict Errors (409):** `{"detail": "Only pending requests can be approved."}`
- **Not Found (404):** `{"detail": "Not found."}`
- **Pagination Format:**
  ```json
  {
    "count": 45,
    "next": "http://127.0.0.1:8000/api/clubs/?page=2",
    "previous": null,
    "results": [...]
  }
  ```

---

## K. CORS & Local Development Configuration

Current settings as used by the frontend (updated 2026-11-28):

- **Backend Base URL:** local `http://127.0.0.1:8000`; deployed `https://jnuverse-a-centralized-platform-for.onrender.com` (Render free tier — the first request after idling can take about a minute; the frontend shows a "waking up the server" notice after 4 s).
- **Frontend Origins:** `http://localhost:5173` (dev) and `https://jnuverse.vercel.app` (production). Vercel preview URLs and other local ports (e.g. `vite preview`) are not in `CORS_ALLOWED_ORIGINS`.
- **JWT Lifespan:** access token 30 minutes, refresh token 7 days (Week 2 handoff). When refresh fails the frontend signs the user out with a "session expired" message.
- **Database:** `backend/.env` currently points at the **shared Supabase database** (also used by the deployed app). See Open Request 1.
- **Seed Commands:**
  ```bash
  python manage.py import_student_records data/student_records_sample.csv
  python manage.py seed_demo_events --reset --allow-remote   # removes [DEMO] data only
  python manage.py seed_demo_events --allow-remote           # recreates demo data with fresh dates
  ```

---

## L. Prioritized Backend Task Checklist

| Plan Week | Module / Capability | Status | Notes |
|:---:|:---|:---|:---|
| **Week 1** | Foundation, project settings, `/api/health/` | **Completed & Tested** | Verified operational |
| **Week 2** | `accounts`: User roles (Student, Operator) | **Completed & Tested** | Verified operational |
| **Week 2** | `accounts`: Student & Club registration | **Completed & Tested** | Validated against registrar DB |
| **Week 2** | `accounts`: JWT login, refresh, `/api/auth/me/` | **Completed & Tested** | Verified operational |
| **Week 2** | `accounts`: Department list endpoint | **Completed & Tested** | 38 JnU departments |
| **Week 3** | `clubs`: Club list with search & pagination | **Completed & Tested** | Verified operational |
| **Week 3** | `clubs`: Follow & Unfollow endpoints | **Completed & Tested** | Verified operational |
| **Week 3** | `clubs`: Membership request, approve, reject, leave, remove | **Completed & Tested** | Verified operational |
| **Week 3** | `clubs`: Student "My Clubs" filter query param | **Completed & Integrated** | `?joined=true` / `?following=true` |
| **Week 4** | `events`: list, detail, filters, create/edit, publish/cancel, registration | **Completed & Integrated** | Week 4 handoff |
| **Week 5** | `notifications` and `notices` | **Completed & Integrated** | Week 5 handoff |
| **Week 6** | `feedback` ratings and `collaborations` | **Completed & Integrated** | Week 6 handoff |
| **Week 7** | `reports`, dashboards, interests, logo/banner uploads | **Completed & Integrated** | Week 7 handoff + addendum |
| **Week 8** | Attendance and the five analytical reports | **Completed & Integrated** | Week 8 handoff |
| **Week 9** | Integration defect fixes & validation | **In Progress** | Open Requests 1–6 above |
| **Week 10** | Final documentation, deployment & security review | **Scheduled** | [Week 10 handoff](docs/frontend-handoff/WEEK_10_FINALIZATION_AND_DELIVERY.md) |

---

## M. Change Log

- **2026-10-24 (Step 1 Foundation):** Initial creation of `FRONTEND_REQUIREMENTS.md`. Audited all 7 apps, recorded 20 verified endpoints from Week 1–3, documented privacy rules, and prioritized upcoming requirements for Weeks 4–10.
- **2026-11-28 (Week 9):** Added "Current Status", consolidated "Open Requests", "Checking Frontend Compatibility", and "Changes Made on the Shared Database"; marked Weeks 3–8 delivered and integrated; updated the club `PATCH` row (no `logo`), CORS/JWT/database/seed settings, and the task checklist.
