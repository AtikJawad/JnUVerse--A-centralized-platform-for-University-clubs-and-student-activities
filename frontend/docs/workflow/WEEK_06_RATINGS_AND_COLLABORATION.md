# Week 06 — Ratings & Collaboration

**Focus:** Post-event attendee ratings (numeric 1–5 stars only) and inter-club collaboration requests  
**Status:** **In Progress — Stage 2 (Student Event Rating Widget & Event Detail Integration) Completed & Verified**  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  
**Backend Reference:** Atik Jawad / Claude (`WEEK_06_BACKEND_HANDOFF.md`, 147 automated backend tests passing, OpenAPI validated in `docs/api/openapi.yml`)  
**Design Reference:** Google Stitch `jnuverse_student_event_feedback/code.html`  
**Target:** November 2026  

---

## 1. Objectives

- Implement post-event rating submission dialog for verified event attendees.
- **Strict Requirement:** Ratings are numeric only (1 to 5 stars). Zero written comments or qualitative text review fields (eliminates harassment and moderation backlogs).
- Display aggregated event rating average (`average_rating`) and total count (`rating_count`) on event cards and detail pages.
- Provide club operators with aggregated rating summaries and 1–5 star distribution breakdowns, preserving individual student rating anonymity.
- Implement inter-club collaboration requests management for club operators (Incoming and Outgoing requests with status filters and accept/reject/cancel lifecycle actions).
- Expose accepted collaboration partners publicly as "Partner Clubs" on club profiles.
- Integrate in-app notification routing for `collaboration_update` dispatches.

---

## 2. Scope & Exclusions

- **In Scope:**
  - `ratingsAPI` and `collaborationsAPI` service layer in `frontend/src/services/api.js`.
  - Accessible 5-star interactive rating component with hover, selection, and keyboard states (`StarRating.jsx`).
  - Event Detail page rating widget displayed conditionally for registered attendees within the 7-day post-event window (`EventDetail.jsx`).
  - Compact aggregate rating chip on event discovery cards in `ExploreEvents.jsx`.
  - Academic Policy Card ("Strict Single-Dimension Governance") on Event Detail.
  - Operator Event Rating breakdown modal/card displaying 1–5 distribution bars (Stage 3).
  - Public "Partner Clubs" listing on `ClubDetail.jsx` (Stage 4).
  - Operator Collaborations management console (`/operator/collaborations`) with `Incoming` and `Outgoing` segmented tabs (Stage 5).
  - Propose Collaboration modal with searchable club selector and published upcoming event dropdown (Stage 6).
- **Exclusions:**
  - Written text reviews, qualitative comments, or review moderation (prohibited by system architecture).
  - Rating deletion (ratings can only be updated within the 7-day window; no delete endpoint exists).
  - Rating reminders or automated rating notification prompts.
  - Expiry automation for pending collaboration requests.
  - Co-hosted event badge updates (collaboration acceptance records partnership only; event ownership is not co-assigned).
  - Student-facing collaboration request visibility or live collaboration chat.

---

## 3. Implementation Stages & Progress

1. [x] **Stage 1: API Services Foundation (`ratingsAPI` & `collaborationsAPI`)**
   - Added `ratingsAPI` to `frontend/src/services/api.js`:
     - `submitRating(eventId, rating)`: `PUT /api/events/:id/rating/`
     - `getMyRating(eventId)`: `GET /api/events/:id/rating/`
     - `getRatingSummary(eventId)`: `GET /api/events/:id/rating-summary/`
   - Added `collaborationsAPI` to `frontend/src/services/api.js`:
     - `getAll(params)`: `GET /api/collaborations/` (`box`, `status`, `page`, `page_size`)
     - `getById(id)`: `GET /api/collaborations/:id/`
     - `create(payload)`: `POST /api/collaborations/` (`target_club`, `title`, `description`, `event`)
     - `accept(id)`: `POST /api/collaborations/:id/accept/`
     - `reject(id)`: `POST /api/collaborations/:id/reject/`
     - `cancel(id)`: `POST /api/collaborations/:id/cancel/`
     - `getPartners(clubSlug, params)`: `GET /api/clubs/:slug/partners/`
   - Preserves shared Axios instance (`api`), automatic Bearer token injection, 401 token refresh queue, and trailing-slash URL convention.
   - Validated against ESLint (0 errors, 0 warnings) and Vite production build (0 errors).
2. [x] **Stage 2: Accessible 5-Star Rating Component & Event Detail Integration (Audited & Refined)**
   - Built `StarRating.jsx` in `frontend/src/components/` based on Stitch reference `jnuverse_student_event_feedback/code.html`:
     - 5 selectable stars with exact Stitch SVG vector paths, hover previews, active selection scale effects, and touch-friendly targets.
     - Dual mode: interactive student rating mode vs. read-only aggregate score presentation mode.
     - Strict WAI-ARIA radio group semantics (`role="radiogroup"`, `role="radio"`, `aria-checked`, `aria-label`).
     - Enhanced roving `tabIndex`: selected or initial star has `tabIndex={0}`, non-selected stars have `tabIndex={-1}`.
     - Keyboard navigation: ArrowLeft/ArrowDown to decrement, ArrowRight/ArrowUp to increment, Home to 1, End to 5, Enter/Space to select, with dynamic DOM focus shift using `requestAnimationFrame`.
     - Read-only mode formatted screen reader announcement: `role="img"` with `aria-label="${formattedScore} out of 5 stars"`, and inner SVG paths marked `aria-hidden="true"`.
     - Standard rating labels (`1: Poor`, `2: Fair`, `3: Good`, `4: Very Good`, `5: Excellent`).
   - Integrated into `frontend/src/pages/EventDetail.jsx`:
     - Embedded Academic Policy Card ("Strict Single-Dimension Governance") in 7-column primary section.
     - Embedded Student Rating Card (`#feedback-card`) in 5-column sticky logistics section.
     - Added aggregate rating indicator (`★ 4.3 (3 ratings)`) to top Header Summary Bar.
     - Verified and tightened eligibility: authenticated, `role === "student"`, `is_registered === true`, `status === "published"`, and completed (`is_completed === true` or `ends_at <= now`), within 7-day post-event window. Draft and cancelled events are strictly non-rateable.
     - Pre-fills saved rating if `event.my_rating` exists, allowing updates ("Update Rating") or initial submission ("Submit Rating").
     - Renders read-only recorded rating if student rated and the 7-day window has expired.
     - Renders clean aggregate consensus summary for non-attendees / anonymous / operators when ratings exist.
     - Submission Response Integrity: backend `PUT /api/events/:id/rating/` returns full annotated `EventSerializer` payload (`average_rating`, `rating_count`, `my_rating`). Frontend updates state with `setEvent(res.data)` cleanly without needing a secondary request.
     - Privacy Language: Clarified that individual ratings and attendee identities remain strictly confidential from club operators, who only see aggregate statistics and distributions.
     - Aggregate Rating Validation: Enforced strict numeric verification (`Number.isInteger(event.rating_count) && event.rating_count > 0 && typeof event.average_rating === "number" && Number.isFinite(event.average_rating)`) across all rating displays to prevent null, undefined, NaN, or 0 from generating badges.
     - Concurrency and identity safety: `generationRef` and composite identity token check prevent state contamination across account switches or event navigation.
     - Zero comments, textareas, or written review inputs.
   - Integrated into `frontend/src/pages/ExploreEvents.jsx`:
     - Added compact read-only aggregate rating chips (`★ 4.3 (3)`) to featured event spotlight and event cards when verified by strict numeric guards.
   - Validated with ESLint (0 errors, 0 warnings) and Vite production build (0 errors).
3. [x] **Stage 3: Operator Event Rating Summary & Distribution Breakdown**
   - Built `EventRatingBreakdown.jsx` in `frontend/src/components/`:
     - Prominent numerical average rating with one decimal place (`4.5 / 5`) and consensus tier label.
     - Read-only 5-star visual representation using existing `StarRating.jsx` component.
     - Total submitted rating count using verified backend `count` (distinct from RSVP attendee counts).
     - 5-Star distribution tier breakdown (5 down to 1 stars): star label, rating count, percentage calculation (`Math.round((levelCount / total) * 100)`), and accessible horizontal distribution bars (`role="progressbar"`).
     - Loading skeleton state while fetching backend summary.
     - Empty state: Clean "No student ratings yet" when `count === 0` or `average === null`, displaying explanation that ratings open after event completion, with zero fake metrics or misleading bars.
     - Error handling: Detailed handling for 401 Unauthorized, 403 Forbidden (operator ownership required), 404 Not Found, and network/5xx with interactive Retry.
     - Manual Refresh interaction with in-flight spinner that preserves existing data on refresh error.
     - Strict Privacy Guarantee: Aggregate statistics only. Student names, emails, IDs, timestamps, and individual rating records are never fetched or displayed.
     - Identity & Concurrency Safety: `generationRef` and composite `identityRef` discard stale responses and reset state immediately on account switch or logout.
   - Integrated into `frontend/src/pages/OperatorEvents.jsx`:
     - Added "Ratings" action button in each published event's action ribbon with dynamic rating count chip (`★ Ratings (N)`).
     - Renders an expandable, inline `<EventRatingBreakdown>` directly underneath the selected event row without navigating away.
     - Collapses on click or via close button, and resets on tab, search, or pagination changes.
   - Integrated into `frontend/src/pages/OperatorEventAttendees.jsx`:
     - Added "Rating Performance" toggle button in the top action ribbon of the attendee management view for published events.
     - Renders expandable `<EventRatingBreakdown>` right above the registered student roster.
   - Validated with ESLint (0 errors, 0 warnings) and Vite production build (0 errors, 982ms).
4. [ ] **Stage 4: Public Partner Clubs Section on Club Detail**
   - Query `collaborationsAPI.getPartners(clubSlug)` on `ClubDetail.jsx`.
   - Render Stitch-styled "Partner Clubs" card with club logos, names, and partnership dates.
5. [ ] **Stage 5: Club Operator Collaboration Hub (`OperatorCollaborations.jsx`)**
   - Build `/operator/collaborations` workspace with `Incoming` and `Outgoing` segmented tabs.
   - Render collaboration request cards, detail slide-over sheet, and action buttons (`Accept`, `Reject`, `Cancel`).
   - Route `collaboration_update` notifications in `/notifications` directly to `/operator/collaborations`.
6. [ ] **Stage 6: Propose Collaboration Modal Dialog**
   - Build modal with target club search/picker (excluding operator's own club), proposal title, description, and published upcoming event selector.
   - Handle 400 validation and 409 conflict responses.
7. [ ] **Stage 7: Quality Gates, Stitch Alignment & Final Documentation**
   - End-to-end lint, build, manual QA matrix, and workflow sign-off.

---

## 4. Backend Dependencies & Endpoint Contracts

All endpoints consume and return standard JSON payloads using the shared Axios client with automatic Bearer token authentication:

### 4.1 Event Ratings API (`ratingsAPI`)

| Method | Endpoint | HTTP | Description | Request Body / Params | Response Data | Status Codes | Permissions |
|---|---|:---:|---|---|---|:---:|:---:|
| `submitRating` | `/api/events/:id/rating/` | `PUT` | Submit or update attendee rating (1–5) | `{ "rating": 4 }` (integer 1–5) | Updated `Event` object with fresh `average_rating`, `rating_count`, `my_rating` | `201` (first)<br>`200` (update)<br>`400` (invalid)<br>`403` (unregistered)<br>`409` (conflict) | Student attendee only |
| `getMyRating` | `/api/events/:id/rating/` | `GET` | Retrieve student's own rating | None | `{ "rating": 4 }` or `{ "rating": null }` | `200 OK`<br>`401` (anon)<br>`403` (operator)<br>`404` (not found) | Student only |
| `getRatingSummary` | `/api/events/:id/rating-summary/` | `GET` | Retrieve rating average, count & 1–5 breakdown | None | `{ "average": 4.5, "count": 2, "breakdown": { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 } }` | `200 OK`<br>`401` (anon)<br>`403` (not owner)<br>`404` (not found) | Owning Club Operator only |

#### Rating Conflict (`409 Conflict`) Error Conditions:
- Event status is not `published`: `{"detail": "Only published events can be rated."}`
- Event has not yet ended (`ends_at > now`): `{"detail": "You can rate this event after it ends."}`
- Rating window expired (`now > ends_at + 7 days`): `{"detail": "The rating period (7 days after the event ends) is over."}`

---

### 4.2 Cross-Club Collaborations API (`collaborationsAPI`)

| Method | Endpoint | HTTP | Description | Request Body / Params | Response Data | Status Codes | Permissions |
|---|---|:---:|---|---|---|:---:|:---:|
| `getAll` | `/api/collaborations/` | `GET` | List sent / received collaboration requests | `params: { box, status, page, page_size }`<br>- `box`: `"sent"` \| `"received"`<br>- `status`: `"pending"` \| `"accepted"` \| `"rejected"` \| `"cancelled"` | Paginated `{ count, next, previous, results: [ Collaboration ] }` | `200 OK`<br>`400` (invalid param)<br>`401` (anon)<br>`403` (student) | Club Operator only |
| `getById` | `/api/collaborations/:id/` | `GET` | Retrieve single collaboration request | None | `Collaboration` object | `200 OK`<br>`401` (anon)<br>`403` (student)<br>`404` (uninvolved) | Requesting or Target Club Operator |
| `create` | `/api/collaborations/` | `POST` | Propose collaboration to another club | `{ "target_club": "slug", "title": "...", "description": "...", "event": "uuid (optional)" }` | `201 Created` with `Collaboration` object | `201 Created`<br>`400` (validation)<br>`409` (duplicate pending) | Club Operator only |
| `accept` | `/api/collaborations/:id/accept/` | `POST` | Accept pending collaboration request | None (empty body) | Updated `Collaboration` (`status: "accepted"`) | `200 OK`<br>`403` (not target)<br>`409` (not pending) | Target Club Operator only |
| `reject` | `/api/collaborations/:id/reject/` | `POST` | Reject pending collaboration request | None (empty body) | Updated `Collaboration` (`status: "rejected"`) | `200 OK`<br>`403` (not target)<br>`409` (not pending) | Target Club Operator only |
| `cancel` | `/api/collaborations/:id/cancel/` | `POST` | Cancel outgoing pending request | None (empty body) | Updated `Collaboration` (`status: "cancelled"`) | `200 OK`<br>`403` (not sender)<br>`409` (not pending) | Requesting Club Operator only |
| `getPartners` | `/api/clubs/:slug/partners/` | `GET` | List public accepted partner clubs | `params: { page, page_size }` | Paginated `{ count, next, previous, results: [ Partner ] }` | `200 OK`<br>`404` (unknown slug) | Public (`AllowAny`) |

#### Collaboration Object Structure:
```json
{
  "id": "e9b2512f-98c3-4d78-bcf6-e069fa4e27f1",
  "requesting_club": { "id": "uuid", "name": "JnU Robotics Club", "slug": "demo-robotics-club" },
  "target_club": { "id": "uuid", "name": "JnU Debating Society", "slug": "demo-debate-society" },
  "event": { "id": "uuid", "title": "Robotics Gala 2026", "starts_at": "2026-11-12T10:00:00+06:00" },
  "title": "Joint Tech-Debate Gala",
  "description": "Collaborative workshop and technical panel session.",
  "status": "pending",
  "created_at": "2026-11-05T01:30:00+06:00",
  "responded_at": null
}
```

#### Partner Club Object Structure (`GET /api/clubs/:slug/partners/`):
```json
{
  "id": "8006c036-8e56-4f03-b17e-97680ce47b70",
  "name": "[DEMO] Photography Club",
  "slug": "demo-photography-club",
  "logo": "",
  "partner_since": "2026-11-05T01:31:20.126271+06:00"
}
```

---

## 5. Backend Business Rules & Enforcement

### Event Ratings
1. **Student Registration Required:** Only students with active registration (`EventRegistration.status === "registered"`) can submit a rating (`403 Forbidden` otherwise).
2. **Post-Event Window (7 Days):** Ratings are open only after `ends_at` has passed and strictly before `ends_at + 7 days`. Outside this window, returns `409 Conflict`.
3. **Rating Updates Allowed:** Inside the 7-day window, a student can update their rating via `PUT`. There is no deletion endpoint.
4. **Strict Rating Scale (1 to 5):** Validated by `RatingInputSerializer` (`min_value=1, max_value=5`). Zero qualitative comments allowed.
5. **Operator Anonymity:** Individual ratings are strictly private. The owning operator can only see aggregate average, total count, and 1–5 distribution (`GET /api/events/:id/rating-summary/`).

### Cross-Club Collaborations
1. **Operator Role Only:** Only authenticated club operators can initiate or manage requests.
2. **No Self-Collaboration:** Requesting club cannot be the target club (`400 Validation Error`).
3. **Single Pending Constraint:** Only one pending request is permitted between any two clubs in either direction at a time. A duplicate attempt returns `409 Conflict` (`"A pending collaboration request already exists between these clubs."`).
4. **Strict Role Separation on Responses:**
   - Only the **target** club operator can `accept` or `reject`.
   - Only the **requesting** club operator can `cancel`.
5. **Partnership Formation:** Accepting a request establishes public partnership exposed at `/api/clubs/:slug/partners/`.
6. **In-App Notifications:** Life-cycle state changes trigger `collaboration_update` notifications to the other club's operator.

---

## 6. Stage 1 Verification Results

| Verification Check | Command | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm --prefix frontend run lint` | **PASS (0 errors, 0 warnings)** | Clean linting across all service files. |
| **Production Build** | `npm --prefix frontend run build` | **PASS (0 errors, 987ms)** | Clean production bundle generated in `dist/`. |
| **Public Partners Endpoint** | `curl http://127.0.0.1:8000/api/clubs/demo-robotics-club/partners/` | **PASS (200 OK)** | Returns 1 partner club (`[DEMO] Photography Club`). |
| **Events With Rating Fields** | `curl http://127.0.0.1:8000/api/events/` | **PASS (200 OK)** | Returns events with `average_rating: 4.3`, `rating_count: 3`, `my_rating: null`. |
| **Unauthenticated Rating Guard** | `curl -X PUT http://127.0.0.1:8000/api/events/<uuid>/rating/` | **PASS (401 Unauthorized)** | Anonymous submissions rejected by DRF. |
| **Unauthenticated Collaboration Guard** | `curl http://127.0.0.1:8000/api/collaborations/` | **PASS (401 Unauthorized)** | Anonymous requests rejected by DRF. |

---

## 7. Acceptance Criteria (Stage 1)

- [x] `ratingsAPI` implemented in `frontend/src/services/api.js` matching backend endpoints.
- [x] `collaborationsAPI` implemented in `frontend/src/services/api.js` matching backend endpoints.
- [x] Uses existing shared Axios instance with Bearer token injection and 401 refresh queue.
- [x] Trailing-slash URL conventions respected.
- [x] No changes made to backend files, models, views, serializers, or migrations.
- [x] Zero package installations or unapproved dependency additions.
- [x] Verification completed cleanly via ESLint and Vite production build.
- [x] Stage 1 documentation completed in `WEEK_06_RATINGS_AND_COLLABORATION.md`.

---

## 8. Stage 2 Verification Results

### 8.1 Frontend Quality Gates

| Verification Check | Command | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm --prefix frontend run lint` | **PASS (0 errors, 0 warnings)** | Clean linting across all components and pages. |
| **Production Build** | `npm --prefix frontend run build` | **PASS (0 errors, 975ms)** | Clean production bundle generated in `dist/`. |
| **WAI-ARIA Radio Group Semantics** | Manual Code Inspection | **PASS** | `role="radiogroup"`, `role="radio"`, `aria-checked`, `aria-label`, roving `tabIndex`. |
| **Keyboard Navigation** | Manual Code Inspection | **PASS** | ArrowRight/ArrowDown move to next star (wrap 5->1); ArrowLeft/ArrowUp move to previous star (wrap 1->5); Home selects 1; End selects 5; Space/Enter selects focused star; `requestAnimationFrame` shifts DOM focus. |
| **Event Lifecycle Audit** | Manual Code Inspection | **PASS** | Strict verification in `EventDetail.jsx`. Draft and cancelled events are never treated as completed or rateable. Substate B1 dedicated to draft events. |
| **Aggregate Rating Validation** | Manual Code Inspection | **PASS** | Strict numeric check `Number.isInteger(rating_count) && rating_count > 0 && typeof average_rating === "number" && Number.isFinite(average_rating)`. |

### 8.2 Backend Automated Test Suite Execution Status

| Test Suite / Target | Command Attempted | Result | Detailed Execution Status |
|---|---|:---:|---|
| **Backend Feedback Tests** | `python3 backend/manage.py test apps.feedback` | **BLOCKED (0 tests ran)** | Django test runner found 0 tests because tests are structured for `pytest`. |
| **Backend Pytest Suite** | `pytest backend/tests/test_ratings.py` | **BLOCKED (`pytest: command not found`)** | Global environment lacks pytest CLI executable. |
| **Python Module Pytest** | `python3 -m pytest backend/tests/test_ratings.py` | **BLOCKED (`No module named pytest`)** | System Python 3.13 environment does not have pytest module installed. |
| **Virtual Environment Pytest** | `backend/venv/bin/pytest` | **BLOCKED (No venv path)** | No local virtualenv directory (`backend/venv`) exists in repository. |
| **Source & Contract Verification** | Source code & API audit | **PASS (Contract Verified)** | Reviewed `apps/feedback/views.py`, `apps/events/models.py`, `apps/events/serializers.py`, and `backend/tests/test_ratings.py`. All contract expectations verified via source inspection. |

> [!NOTE]
> Backend tests were attempted but could not be executed locally due to the absence of `pytest` in the local test runner environment. Backend automated tests are therefore **not reported as passing runtime tests**. Frontend quality gates (lint and build) pass cleanly with zero errors.

---

## 9. Acceptance Criteria (Stage 2)

- [x] Built accessible `StarRating.jsx` component conforming to Google Stitch design tokens and WAI-ARIA radio group patterns.
- [x] Integrated student event rating into `EventDetail.jsx` with strict eligibility guards: student role, registered status, published status, completed status, and 7-day post-event window.
- [x] Ensured zero comment, textarea, or written review inputs to eliminate moderation overhead.
- [x] Verified response contract from backend `PUT /api/events/:id/rating/` returning updated `EventSerializer` payload and updating local event state safely.
- [x] Corrected privacy wording to accurately disclose that individual ratings and attendee identities remain strictly confidential from club operators.
- [x] Audited every use of `isEnded` and `isCompleted` in `EventDetail.jsx` to ensure draft and cancelled events cannot be registered for or rated.
- [x] Frontend linting and production build validated with 0 errors and 0 warnings.
- [x] Zero backend files or database models modified.

---

## 10. Stage 3 Verification Results

### 10.1 Frontend Quality Gates

| Verification Check | Command | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm --prefix frontend run lint` | **PASS (0 errors, 0 warnings)** | Clean linting across all files including `EventRatingBreakdown.jsx`. |
| **Production Build** | `npm --prefix frontend run build` | **PASS (0 errors, 1.01s)** | Production bundle built cleanly with Vite. |
| **Response Validation Hardening** | Unit/Logic Audit | **PASS** | `validateRatingSummary(data)` strictly verifies 3 distinct states: valid empty (`count === 0 && average === null`), valid populated (`count > 0 && average >= 1.0 && average <= 5.0 && breakdown sum === count`), and invalid/inconsistent data plate. |
| **Privacy Safeguards** | Code Inspection | **PASS** | Only aggregates (`average`, `count`, `breakdown`) are fetched and rendered. No student IDs, names, emails, or individual ratings are accessible. |
| **Concurrency & Account Switching** | Code Inspection | **PASS** | `generationRef` and composite `identityRef` prevent race conditions and cross-account data leaks. |

---

## 11. Acceptance Criteria (Stage 3)

- [x] Consumes verified `ratingsAPI.getRatingSummary(eventId)`: `GET /api/events/:id/rating-summary/`.
- [x] Verified exact backend response contract: `{ average: float | null, count: int, breakdown: { "1": int, ... "5": int } }`.
- [x] Built reusable `EventRatingBreakdown.jsx` component adhering to Google Stitch design tokens.
- [x] Hardened response validation with 3 distinct UI states: valid empty, valid populated, and retryable data-inconsistency error state.
- [x] Displayed prominent average rating with one decimal place (`4.5 / 5`) and read-only `StarRating.jsx` component.
- [x] Displayed total rating count from backend `count` (distinct from registered attendee count).
- [x] Displayed all 5 rating distribution tiers (5 down to 1 stars) with counts, calculated percentages, and horizontal progressbars.
- [x] Handled all lifecycle and feedback states cleanly: Loading skeleton, Empty state ("No student ratings yet"), Error states (401, 403, 404, 5xx), Data Inconsistency state, and manual Refresh.
- [x] Preserved strict privacy guarantees: zero individual student rating records, names, emails, IDs, or timestamps rendered.
- [x] Integrated expandable rating section in `OperatorEvents.jsx` without navigating away or causing N+1 requests.
- [x] Integrated expandable rating performance section in `OperatorEventAttendees.jsx`.
- [x] Implemented identity and concurrency safety: `generationRef` and composite `identityRef` reset state on account switch or logout.
- [x] Validated with ESLint (0 errors, 0 warnings) and Vite production build (0 errors, 1.01s).
- [x] Zero backend files, serializers, views, permissions, or database models modified.
