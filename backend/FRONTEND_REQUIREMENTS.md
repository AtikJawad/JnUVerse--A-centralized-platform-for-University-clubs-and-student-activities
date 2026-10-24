# JnUVerse Backend — Frontend Integration Requirements & API Handoff

**Platform:** JnUVerse (Centralized Platform for University Clubs & Student Activities)  
**Target Audience:** Backend MVP Coder (Atik Jawad) & Development Team  
**Author:** Frontend MVP Coder (Anik Khondokar)  
**Stage:** Step 1 Foundation & Architecture Audit  
**Date:** October 2026  

---

## A. Purpose

This document formally specifies the API contracts, response payloads, role permissions, validation rules, and backend capabilities required by the React frontend for **JnUVerse**.

### Core Tenets:
1. **Separation of Concerns:** The React frontend is implemented independently of the Django backend. The frontend communicates exclusively via HTTP with the Django REST Framework (DRF) API (`/api/`) and **never connects directly to PostgreSQL or Supabase**.
2. **Handoff & Review:** This document acts as the contract bridge between frontend and backend. All requested endpoints, parameters, and behaviors must be reviewed, validated, and scheduled by the backend developer.
3. **No Assumptions:** This document clearly distinguishes between **endpoints that are already verified in code** and **endpoints that are currently missing, planned, or requiring confirmation**. Merely having a database model in Django does not mean an endpoint is operational.
4. **Verification Requirement:** All API contracts must be verified against actual code execution and DRF test suites.

---

## Weekly Handoff Documentation Index

Phase-by-phase requirements, acceptance criteria, and specific endpoint contracts are organized in:

- [Week 1: Project Foundation & Health Check](docs/frontend-handoff/WEEK_01_REPOSITORY_AUDIT_AND_DESIGN_FOUNDATION.md) (Status: **Completed & Verified**)
- [Week 2: Authentication, Registration & Student Verification](docs/frontend-handoff/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md) (Status: **Completed & Verified**)
- [Week 3: Club Discovery, Profiles & Memberships](docs/frontend-handoff/WEEK_03_CLUB_DISCOVERY_AND_MEMBERSHIP.md) (Status: **Backend Complete; Frontend Pending Step 2**)
- [Week 4: Events & RSVP Registration](docs/frontend-handoff/WEEK_04_EVENTS_AND_REGISTRATION.md) (Status: **Pending Backend Implementation**)
- [Week 5: Notices & Notifications](docs/frontend-handoff/WEEK_05_NOTICES_AND_NOTIFICATIONS.md) (Status: **Pending Backend Implementation**)
- [Week 6: Ratings (1–5 Stars Only) & Collaborations](docs/frontend-handoff/WEEK_06_RATINGS_AND_COLLABORATION.md) (Status: **Pending Backend Implementation**)
- [Week 7: Content Reports & Dashboards](docs/frontend-handoff/WEEK_07_REPORTS_AND_DASHBOARDS.md) (Status: **Pending Backend Implementation**)
- [Week 8: Five Analytical Reports](docs/frontend-handoff/WEEK_08_ANALYTICAL_REPORTS.md) (Status: **Pending Backend Implementation**)
- [Week 9: Cross-Module Integration & Comprehensive Testing](docs/frontend-handoff/WEEK_09_INTEGRATION_AND_TESTING.md) (Status: **Pending**)
- [Week 10: Finalization & Delivery](docs/frontend-handoff/WEEK_10_FINALIZATION_AND_DELIVERY.md) (Status: **Pending**)

---

## B. Existing API Inventory

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
| **Club Profile Update** | `PATCH` | `/api/clubs/<slug>/` | **Verified** | Bearer JWT (`IsClubOperator` + Owner) | Operator Club Settings | Permitted editable fields: `description`, `logo`, `contact_email`. Other fields rejected. |
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

| Feature | Proposed / Unverified Endpoint | Status in Backend Code | Required Confirmation from Backend Developer |
|:---|:---|:---|:---|
| **Student's Joined Clubs List ("My Clubs")** | Proposed: `GET /api/clubs/my/` or filter `GET /api/clubs/?joined=true` | Currently no explicit endpoint or filter parameter exists in `ClubListView`. | Can backend add a query parameter `?filter=my-clubs` to `ClubListView`, or a dedicated `GET /api/clubs/my/` endpoint for authenticated students? |
| **Club Category Filtering** | Proposed: `GET /api/clubs/?category=...` | Model has no explicit `category` field currently; `search_fields = ["name"]`. | Is a club category/genre taxonomy planned (e.g. cultural, research, tech, debate), or should frontend search by keyword/tag? |

### 3. Not Implemented & Required for Later Stages

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

Please verify that the following local development settings remain active in `backend/.env`:

- **Backend Base URL:** `http://127.0.0.1:8000`
- **Frontend Dev Origin:** `http://localhost:5173` and `http://127.0.0.1:5173`
- **CORS Configuration:** `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173` and `http://127.0.0.1:5173`
- **JWT Lifespan:**
  - Access Token: standard 15–60 minutes
  - Refresh Token: standard 1–7 days
- **Database Seed Command:**
  ```bash
  python manage.py import_student_records data/student_records_sample.csv
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
| **Week 3** | `clubs`: Student "My Clubs" filter query param | **Needs Confirmation** | Needed for student portal view |
| **Week 4** | `events`: Event list, detail, and filter endpoints | **Required Implementation** | Models exist; views pending |
| **Week 4** | `events`: Event creation & edit (Operator) | **Required Implementation** | Models exist; views pending |
| **Week 4** | `events`: Event RSVP / registration (Student) | **Required Implementation** | Models exist; views pending |
| **Week 5** | `notifications`: Notification list & mark-as-read | **Required Implementation** | Models exist; views pending |
| **Week 5** | `notifications`: Notice creation (Operator) | **Required Implementation** | Models exist; views pending |
| **Week 6** | `feedback`: Event rating submission (1-5 stars only) | **Required Implementation** | Models exist; views pending |
| **Week 6** | `collaborations`: Collaboration requests & approvals | **Required Implementation** | Models exist; views pending |
| **Week 7** | `reports`: Content report submission endpoint | **Required Implementation** | Models exist; views pending |
| **Week 8** | Analytical reports (5 specific reports) | **Scheduled** | Specifications pending Week 8 |
| **Week 9** | Integration defect fixes & validation | **Scheduled** | End-to-end testing |
| **Week 10** | Final documentation, deployment & security review | **Scheduled** | Course delivery |

---

## M. Change Log

- **2026-10-24 (Step 1 Foundation):** Initial creation of `FRONTEND_REQUIREMENTS.md`. Audited all 7 apps, recorded 20 verified endpoints from Week 1–3, documented privacy rules, and prioritized upcoming requirements for Weeks 4–10.
