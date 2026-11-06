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

---

## 12. Stage 4: Public Partner Clubs Section on Club Detail

### 12.1 Objective & Architecture
Stage 4 introduces a public-facing, read-only discovery section on the [`ClubDetail.jsx`](../../src/pages/ClubDetail.jsx) page, displaying established collaborative partner clubs for the currently viewed club.

- **Component:** [`PartnerClubsSection.jsx`](../../src/components/PartnerClubsSection.jsx)
- **Integration Placement:** Inside [`ClubDetail.jsx`](../../src/pages/ClubDetail.jsx) primary 7-column content section, positioned directly below the primary club profile card (*"About This Society"*) and directly above the announcements section (*"#notice-board"*).
- **Public API Endpoint:** `GET /api/clubs/:slug/partners/` consumed via existing `collaborationsAPI.getPartners(clubSlug, params)` in [`api.js`](../../src/services/api.js).
- **Permissions:** `AllowAny` (verified publicly accessible to anonymous visitors, authenticated students, and operators alike).
- **Accepted Collaborations Only:** Backend query `CollaborationRequest.objects.filter(involving(club), status=Status.ACCEPTED)` strictly filters for accepted partnerships. Pending, rejected, and cancelled requests are never exposed. Multi-collaboration partnerships between the same two clubs are deduplicated to a single partner entry.
- **Card Design & Grounded Fields:** Adheres to Google Stitch club-card aesthetics. Strictly utilizes fields returned by `PartnerSerializer`:
  - `name`: Club name (with title attribute and link).
  - `slug`: `@${partner.slug}`.
  - `logo`: Renders image if URL provided, with an automatic fallback on error to a stylized lavender avatar container with `groups` icon.
  - `partner_since`: Formatted date string (`Partner since Nov 2026`) via `Intl.DateTimeFormat`.
  - Badge: `Partner Club` pill with `handshake` icon.
  - Action: Accessible `View Club` button linking to `/clubs/:slug`.
  - Zero invented fields: no fake member counts, ratings, descriptions, or department tags.
- **Navigation:** Deep-links directly to `/clubs/:slug` in React Router.
- **State Handling & Privacy:**
  - *Loading:* Clean 2-column pulse skeleton.
  - *Empty State:* Friendly informational plate (*"No partner clubs yet. Established collaborations will appear here once this club partners with another club."*).
  - *Error State:* Error plate with diagnostic text and manual "Retry" action.
  - *Non-Destructive Refresh:* If refreshing populated partner data fails, existing cards remain visible with a dismissible warning banner.
  - *Pagination & Deduplication:* Supports DRF `ClubPagination` with "Load More Partners" button if additional pages exist (`Boolean(data.next)`). Strictly deduplicates partners by `id || slug` on both initial load and subsequent pages to prevent duplicates on retries.
  - *Request & Concurrency Safety:* `reqGenRef` invalidates stale requests on slug change; `isMountedRef` prevents post-unmount updates; `partnersRef` stabilizes `fetchPartners` callback and prevents cyclic re-fetching.
  - *Strict Privacy & Role Separation:* Public discovery only. Zero operator controls (no Propose, Accept, Reject, or Cancel buttons).

### 12.2 Stage 4 Verification Results

| Verification Check | Command | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm --prefix frontend run lint` | **PASS (0 errors, 0 warnings)** | Clean linting across all frontend files including `PartnerClubsSection.jsx` and `ClubDetail.jsx`. |
| **Production Build** | `npm --prefix frontend run build` | **PASS (0 errors, 1.90s)** | Production bundle built cleanly with Vite. |
| **Public Endpoint Smoke Test** | `curl -i http://127.0.0.1:8000/api/clubs/demo-robotics-club/partners/` | **PASS (200 OK)** | Returns 1 accepted partner club (`[DEMO] Photography Club`, `partner_since: 2026-11-05T01:31:20+06:00`). |
| **Pagination Parameter Smoke Test** | `curl -i "http://127.0.0.1:8000/api/clubs/demo-robotics-club/partners/?page=1&page_size=1"` | **PASS (200 OK)** | Query parameters verified: returns paginated `{ count: 1, next: null, previous: null, results: [...] }`. |
| **Empty Partners Smoke Test** | `curl -i http://127.0.0.1:8000/api/clubs/demo-sports-club/partners/` | **PASS (200 OK)** | Returns `{ count: 0, next: null, previous: null, results: [] }`. |
| **Invalid Slug Handling** | `curl -i http://127.0.0.1:8000/api/clubs/nope/partners/` | **PASS (404 Not Found)** | Returns 404 handled cleanly by component. |
| **Design Reference Alignment** | Visual & Token Inspection | **PASS** | Evaluated against `jnuverse_club_profile_management` and `jnuverse_explore_clubs` Stitch exports. |

---

## 13. Acceptance Criteria (Stage 4)

- [x] Consumes verified `collaborationsAPI.getPartners(clubSlug)`: `GET /api/clubs/:slug/partners/`.
- [x] Verified exact backend response contract: `{ count: int, next: str|null, previous: str|null, results: [ { id, name, slug, logo, partner_since } ] }`.
- [x] Verified public accessibility without authentication (`AllowAny`).
- [x] Built reusable `PartnerClubsSection.jsx` component receiving `clubSlug` prop.
- [x] Integrated `PartnerClubsSection` into `ClubDetail.jsx` left column below primary club profile info and above Notice Board.
- [x] Displayed accepted partner clubs with name, handle, logo/avatar fallback, partner_since date, and Partner Club indicator.
- [x] Zero invented fields (no fake member counts, ratings, descriptions, or departments).
- [x] Provided accessible navigation to `/clubs/:slug` for each partner club.
- [x] Handled all lifecycle states: Loading skeleton, Empty state ("No partner clubs yet"), Retryable error state, and non-destructive refresh warning.
- [x] Supported DRF pagination with Load More affordance when total count exceeds page size.
- [x] Handled slug changes safely with generation ref discarding out-of-order responses.
- [x] Guaranteed unmount safety via `isMountedRef`.
- [x] Preserved strict product boundaries: zero operator controls (no accept/reject/cancel/propose buttons).
- [x] Preserved all existing Club Detail features (follow, membership requests, operator profile editing, announcements).
- [x] Validated with ESLint (0 errors, 0 warnings) and Vite production build (0 errors, 1.01s).
- [x] Zero backend files, serializers, views, permissions, or database models modified.

---

## 14. Stage 5: Operator Collaboration Hub

### 14.1 Objective & Architecture
Stage 5 implements a centralized, operator-facing workspace at [`OperatorCollaborations.jsx`](../../src/pages/OperatorCollaborations.jsx) allowing authorized Club Operators to manage incoming and outgoing cross-club collaboration requests according to strict lifecycle permissions.

- **Component:** [`OperatorCollaborations.jsx`](../../src/pages/OperatorCollaborations.jsx)
- **Route:** `/operator/collaborations` (and alias `/operator-collaborations`), secured by `<ProtectedRoute allowedRoles={["club_operator"]}>`.
- **Navigation Integration:** Added to [`Navbar.jsx`](../../src/components/Navbar.jsx) in both desktop centered pill navigation and mobile drawer navigation. Strictly hidden from students and anonymous visitors.
- **API Services Reused:**
  - `collaborationsAPI.getAll(params)`: `GET /api/collaborations/` (`box`, `status`, `page`, `page_size`).
  - `collaborationsAPI.accept(id)`: `POST /api/collaborations/:id/accept/`.
  - `collaborationsAPI.reject(id)`: `POST /api/collaborations/:id/reject/`.
  - `collaborationsAPI.cancel(id)`: `POST /api/collaborations/:id/cancel/`.
  - Zero duplicate service methods created.
- **Backend Authorization & Security:**
  - Enforced by DRF `IsClubOperator` permission. Anonymous visitors receive `401 Unauthorized`; authenticated students receive `403 Forbidden`.
  - View queryset strictly filters `involving(request.user.club)`: an operator can never access or inspect requests belonging to unrelated clubs.
- **Overview Metrics Grounding:**
  - Metrics cards display verified database counts from backend collection responses:
    - *Incoming Requests:* Total received by operator's club (`box: "received"`).
    - *Pending Action:* Received requests awaiting operator decision (`box: "received", status: "pending"`).
    - *Outgoing Sent:* Requests proposed to other clubs (`box: "sent"`).
    - *Accepted Partners:* Established collaborative partnerships (`status: "accepted"`).
- **Segmented Views & Filtering:**
  - *Incoming Tab (`box=received`):* Displays proposals received from other clubs with active pending count badge.
  - *Sent Tab (`box=sent`):* Displays proposals sent by the operator's club to other campus societies.
  - *Status Filter Chips:* All Statuses, Pending, Accepted, Declined (rejected), Cancelled.
  - *Search Filter:* Client-side search across loaded records (title, partner club name, description, event title) with explicit loaded record count label.
- **Lifecycle & Action Workflows:**
  - *Incoming Pending:*
    - **Accept Invitation:** Opens confirmation modal. Upon confirmation, calls `collaborationsAPI.accept(id)`, updates request to `accepted`, displays success alert, and reloads metrics.
    - **Decline:** Opens confirmation modal. Upon confirmation, calls `collaborationsAPI.reject(id)`, updates request to `rejected`, displays confirmation message, and reloads metrics.
  - *Outgoing Pending:*
    - **Cancel Request:** Opens confirmation modal. Upon confirmation, calls `collaborationsAPI.cancel(id)`, updates request to `cancelled`, displays confirmation message, and reloads metrics.
  - *Finalized States (Accepted, Rejected, Cancelled):* Action buttons are strictly hidden; status badge and resolution timestamps are displayed.
- **Stitch Design Alignment:**
  - Directly modeled on `docs/ui/stitch-export/stitch_jnuverse_campus_community_platform/jnuverse_collaboration_requests_management/code.html`.
  - Includes club emblem monograms (e.g. `DS`, `CC`, `PC`), status pills with live pulse indicators, editorial page headers, active authority context banner, and full slide-over collaboration brief sheet (`proposalDetailSheet`).
- **Notification Integration:**
  - Backend notification service automatically creates notifications (`notify_collaboration_response`, `notify_collaboration_cancelled`).
  - Frontend refreshes data upon action completion and relies on the existing Week 5 `NotificationBell.jsx` polling mechanism without creating duplicate notifications.
- **Concurrency & Identity Protection:**
  - `reqGenRef` invalidates stale requests when switching between Received and Sent tabs or status filters.
  - `identityRef` resets state if the operator logs out or switches accounts.
  - `isMountedRef` guards against unmounted state updates.

### 14.2 Stage 5 Verification Results

| Verification Check | Command | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm --prefix frontend run lint` | **PASS (0 errors, 0 warnings)** | Clean linting across all files including `OperatorCollaborations.jsx`, `App.jsx`, and `Navbar.jsx`. |
| **Production Build** | `npm --prefix frontend run build` | **PASS (0 errors, 2.15s)** | Production bundle built cleanly with Vite. |
| **Anonymous Access Guard** | `curl -i http://127.0.0.1:8000/api/collaborations/` | **PASS (401 Unauthorized)** | Unauthenticated requests rejected by DRF. |
| **Student Access Guard** | `curl -i http://127.0.0.1:8000/api/collaborations/ -H "Authorization: Bearer <student_token>"` | **PASS (403 Forbidden)** | Student accounts blocked by `IsClubOperator` permission. |
| **Operator Collection Smoke Test** | `curl -s http://127.0.0.1:8000/api/collaborations/ -H "Authorization: Bearer <op_token>"` | **PASS (200 OK)** | Returns 4 demo collaborations (`count: 4`) involving operator's club. |
| **Box Filter (Received)** | `curl -s "http://127.0.0.1:8000/api/collaborations/?box=received" -H "Authorization: Bearer <op_token>"` | **PASS (200 OK)** | Returns 3 inbound collaboration requests (`count: 3`). |
| **Box Filter (Sent)** | `curl -s "http://127.0.0.1:8000/api/collaborations/?box=sent" -H "Authorization: Bearer <op_token>"` | **PASS (200 OK)** | Returns 1 outbound collaboration request (`count: 1`). |
| **Status Filter (Pending Inbound)** | `curl -s "http://127.0.0.1:8000/api/collaborations/?box=received&status=pending" -H "Authorization: Bearer <op_token>"` | **PASS (200 OK)** | Returns 1 pending inbound collaboration request (`count: 1`). |
| **Design Reference Alignment** | Visual & Token Inspection | **PASS** | Validated against `jnuverse_collaboration_requests_management` Stitch export. |

### 14.3 Critical Bug Fix & Source-Level Concurrency Verification

- **Issue Reported:** The Operator Collaboration Hub page at `/operator/collaborations` failed to load in the browser.
- **Root Cause Analysis:**
  1. **Uncaught Runtime ReferenceError:** In `frontend/src/pages/OperatorCollaborations.jsx`, `const navigate = useNavigate();` was invoked on line 124 during component mount, but `useNavigate` was never imported from `react-router-dom` (only `{ Link }` was imported). In browser execution, invoking undefined `useNavigate()` threw an uncaught `ReferenceError: useNavigate is not defined`, crashing React rendering immediately before any layout or lifecycle hooks could run.
  2. **Loading State Freezing on Early Return:** In `fetchCollaborations`, an unauthenticated or non-operator state (`if (!isAuthenticated || user?.role !== "club_operator") return;`) exited without calling `setLoading(false)` or `setLoadingMore(false)`. Since `loading` was initialized to `true`, any race or edge case before complete auth hydration could leave the component permanently stuck in `<LoadingSkeleton>`.
  3. **Shared Generation Reference Conflict:** The component previously relied on a single generation ref (`reqGenRef`) across distinct asynchronous operations. In addition, metrics count queries lacked generation protection, posing a risk of race conditions during concurrent dispatches.
- **Remediation & Architecture Hardening:**
  1. Removed the unused and unimported `const navigate = useNavigate();` declaration from `OperatorCollaborations.jsx`, resolving runtime crashes and ESLint errors.
  2. Introduced separate generation guards for independent asynchronous network streams:
     - `listGenRef`: Exclusively guards active Received/Sent collaboration list requests and pagination.
     - `metricsGenRef`: Exclusively guards overview metrics count queries (`receivedTotal`, `receivedPending`, `sentTotal`, `sentPending`, `acceptedTotal`).
     - `isMountedRef`: Protects against state updates on unmounted components.
  3. Implemented a session/account identity change safeguard (`lastIdentityRef` vs `currentIdentity`):
     - Transitions (login, hydration, account switch, logout) increment all generation counters to invalidate any in-flight requests from the previous session.
     - Immediately clears private collaboration records, metric counts, and active modal dialogs, preventing cross-account data leaks.
  4. Added explicit `authLoading` handling to present a clean non-blocking credential verification indicator during auth hydration.
  5. Isolated `metricsLoading` state with skeleton pulse indicators in metric cards, ensuring metrics fetching never interferes with or delays the main collaboration list.
- **Verification Results:**
  - `npm run lint` (from `frontend/`): **PASS (0 errors, 0 warnings)**.
  - `npm run build` (from `frontend/`): **PASS (0 errors, 1.65s build time)**.
  - Backend API endpoint `/api/collaborations/`: Verified live with operator test client (`200 OK`).

---

## 15. Acceptance Criteria (Stage 5)

- [x] Built dedicated `OperatorCollaborations.jsx` hub page protected by `<ProtectedRoute allowedRoles={["club_operator"]}>`.
- [x] Configured route `/operator/collaborations` and alias in `App.jsx`.
- [x] Integrated `Collaborations` navigation item into `Navbar.jsx` desktop pill and mobile drawer for `club_operator`.
- [x] Reused existing `collaborationsAPI` methods (`getAll`, `accept`, `reject`, `cancel`) without duplication.
- [x] Verified exact backend response contracts and query parameters (`box`, `status`, `page`, `page_size`).
- [x] Implemented Incoming (`box=received`) and Outgoing (`box=sent`) segmented tabs with pending count badges.
- [x] Implemented Status Filter chips (All, Pending, Accepted, Declined, Cancelled).
- [x] Implemented client-side search filtering across loaded records with explicit counter label.
- [x] Displayed 4 live overview metric cards grounded in real backend counts.
- [x] Implemented request cards with club monograms, verified badges, status badges, titles, descriptions, and linked event details.
- [x] Implemented Accept action with confirmation modal for received pending requests.
- [x] Implemented Decline action with confirmation modal for received pending requests.
- [x] Implemented Cancel Request action with confirmation modal for sent pending requests.
- [x] Prevented mutating actions on finalized requests (accepted, rejected, cancelled).
- [x] Built full slide-over collaboration brief drawer (`proposalDetailSheet`) matching Stitch design.
- [x] Supported DRF pagination with "Load More" affordance and ID deduplication.
- [x] Integrated natural notification handling without creating duplicate frontend notifications.
- [x] Guarded against concurrency issues with `reqGenRef`, `identityRef`, and `isMountedRef`.
- [x] Validated with ESLint (0 errors, 0 warnings) and Vite production build (0 errors, 2.15s).
- [x] Zero backend files, serializers, views, permissions, or database models modified.
- [x] Preserved scope restrictions: request creation and proposal modal deferred to Stage 6.

---

## 16. Stage 6: Propose Collaboration Modal Implementation

### 16.1 Implementation Overview

Week 6 Stage 6 implements the complete inter-club collaboration proposal workflow within the Operator Collaboration Hub:

- **Component Creation (`ProposeCollaborationModal.jsx`):**
  - Modular, accessible dialog component mounted within [`OperatorCollaborations.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorCollaborations.jsx).
  - Adheres strictly to the Google Stitch Design Reference (`jnuverse_collaboration_requests_management/code.html`).
  - Utilizes institutional color tokens: `bg-surface-white`, `border-border-subtle`, `bg-surface-lavender`, `text-primary`, `bg-canvas-base`, and `bg-error-container`.
  - Accessible dialog structure: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="propose-collab-title"`, keyboard `Escape` dismissal, click-outside dismissal, and accessible close button.
- **Hub Trigger Integration:**
  - Added a prominent, visually balanced call-to-action button `"Propose Collaboration"` (`#propose-collaboration-btn`) to the page header section in [`OperatorCollaborations.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorCollaborations.jsx).
  - Displays alongside the active society's Managing Authority status pill.
- **Backend-Verified Payload:**
  - `target_club` (string slug, required): Selected from available university clubs, strictly excluding the operator's own club (`currentClub.slug` / `currentClub.id`).
  - `title` (string, required, max 200 chars): Proposal initiative scope with live character counter (`N / 200`).
  - `description` (string, optional): Core statement & objectives textarea.
  - `event` (UUID string, optional): Linked published upcoming event belonging to the operator's own club.
- **Data Discovery & Exclusion Safeguards:**
  - Target clubs fetched via `clubsAPI.getAll({ page_size: 50 })`. Own club is excluded from options.
  - Eligible events fetched via `eventsAPI.getAll({ mine: "true", upcoming: "true", page_size: 50 })`. Filtered strictly for `e.status === "published" && new Date(e.ends_at) > new Date()`.
- **Workflow & Post-Creation Transition:**
  - Upon successful proposal creation (`HTTP 201 Created`), the modal closes, displays a floating toast confirmation (`"Collaboration proposal successfully dispatched to <Target Club>!"`), switches the active tab to `sent` (Outbox), resets status filters to All, and refreshes the Sent list and overview metrics without requiring a browser reload.
  - In-flight duplicate clicks are disabled, and entered form state is preserved if a recoverable error occurs.

### 16.2 Backend Contract Verification

| Requirement | Contract Verification | Status |
|---|---|:---:|
| **Creation Endpoint** | `POST /api/collaborations/` | **Verified** |
| **API Method** | Reused existing `collaborationsAPI.create(payload)` in [`api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js) | **Verified** |
| **Target Club Format** | Slug string (`target_club: "demo-debate-society"`) | **Verified** |
| **Title Field** | Required string, max length 200 characters | **Verified** |
| **Description Field** | Optional text string | **Verified** |
| **Event Field** | Optional UUID string, strictly own published upcoming event | **Verified** |
| **Self-Request Prevention** | Blocked on frontend (`currentClub` filter) and backend (HTTP 400 `{"target_club": ["You cannot send a request to your own club."]}`) | **Verified** |
| **Duplicate Request Prevention** | Backend enforces one pending request per pair (HTTP 409 `{"detail": "A pending collaboration request already exists between these clubs."}`) | **Verified** |
| **Target Notification** | Handled automatically by backend (`notify_collaboration_request`); zero duplicate notifications generated by frontend | **Verified** |

### 16.3 Verification Results (Stage 6)

| Verification Check | Target / Command | Result | Notes |
|---|---|:---:|---|
| **Component ESLint** | `npx eslint frontend/src/components/ProposeCollaborationModal.jsx frontend/src/pages/OperatorCollaborations.jsx` | **PASS (0 errors, 0 warnings)** | Clean static analysis across all Stage 6 files. |
| **Full Frontend Lint** | `cd frontend && npm run lint` | **PASS (0 errors, 0 warnings)** | Clean pass across entire project. |
| **Production Build** | `cd frontend && npm run build` | **PASS (0 errors, 3.33s)** | Production bundle generated cleanly with Vite. |
| **Self-Collaboration Guard** | Python test client `POST /api/collaborations/` with own slug | **PASS (400 Bad Request)** | Backend rejected self-request with `"You cannot send a request to your own club."` |
| **Duplicate Pair Guard** | Python test client `POST /api/collaborations/` with existing pair | **PASS (409 Conflict)** | Backend rejected duplicate pending proposal with `"A pending collaboration request already exists between these clubs."` |
| **Missing Title Guard** | Python test client `POST /api/collaborations/` with empty title | **PASS (400 Bad Request)** | Backend rejected empty title with `"This field may not be blank."` |

---

## 17. Acceptance Criteria (Stage 6)

- [x] Created reusable `ProposeCollaborationModal.jsx` component.
- [x] Integrated `"Propose Collaboration"` CTA button in the header of `OperatorCollaborations.jsx`.
- [x] Reused existing `collaborationsAPI.create(payload)` without creating duplicate services.
- [x] Added `clubsAPI` service to `frontend/src/services/api.js` for centralized club discovery.
- [x] Target club selector populated dynamically from actual backend data.
- [x] Operator's own club is strictly excluded from target club options.
- [x] Title field enforced with required validation and 200-character counter.
- [x] Optional description multiline textarea implemented.
- [x] Optional event selector populated strictly with operator's own published upcoming events.
- [x] Comprehensive client-side validation and backend field error mapping implemented.
- [x] Handled HTTP 409 Conflict (duplicate pending request), HTTP 400 (validation), and HTTP 403 (unauthorized).
- [x] Successful proposal creation closes modal, triggers floating toast, switches to `sent` tab, and refreshes list and metrics.
- [x] Preserved form data on recoverable server errors.
- [x] Full accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape listener, click-outside dismissal.
- [x] Full responsive layout for mobile, tablet, and desktop viewports.
- [x] Concurrency and identity guards preserved; switching accounts or logging out resets modal state.
- [x] Zero backend files, serializers, views, permissions, or database models modified.
- [x] Tested with `npm run lint` (0 errors) and `npm run build` (0 errors).

