# Week 04 — Events & Registration

**Focus:** Campus events discovery, event details, student RSVP/registration workflow, operator event creation/lifecycle, and attendee rosters  
**Status:** **In Progress** (Stage 5 Completed: Club Operator Event Creation & Editing Implemented & Verified)  
**Assigned:** Anik Khondokar (Frontend MVP Coder)  
**Backend Reference:** Atik Jawad / Claude (`WEEK_04_BACKEND_HANDOFF.md`, 86 backend tests passing)  
**Target:** October 2026  

---

## 1. Objectives

- Implement campus events discovery explorer matching the official Stitch `jnuverse_events` design.
- Implement detailed event page (`EventDetail.jsx`) showing venue, schedule, host club, capacity metrics, and RSVP status.
- Implement student event RSVP/registration button with real-time capacity and deadline tracking.
- Implement event creation and editing interface for authorized club operators.
- Implement operator event lifecycle controls (publish draft, cancel event) and attendee roster inspection.
- Enforce university student privacy: strictly exclude student emails from attendee rosters.

---

## 2. Scope & Exclusions

- **In Scope:** `eventsAPI` service layer, event listing page (`/events`), event detail view (`/events/:id`), operator event management, attendee roster, capacity enforcement, 409 conflict handling.
- **Exclusions:** Event banner/image upload (not in approved database schema), category taxonomy (handled via search and status filters), QR/check-in venue scanning (out of scope for Week 4), post-event student ratings (Week 6), notices/announcements (Week 5).

---

## 3. Implementation Stages & Progress

1. [x] **Stage 1: Research & Planning**
   - Inspected Stitch design references (`jnuverse_events/code.html`, `jnuverse_art_directed_typography_layout_refinement/code.html`, `jnuverse_student_event_feedback/code.html`).
   - Verified backend DRF contracts (`Event`, `EventRegistration`, serializers, views, permissions, tests).
   - Formulated 7-stage implementation roadmap.
2. [x] **Stage 2: Events API Service Foundation**
   - Implemented `eventsAPI` in `frontend/src/services/api.js` reusing the core Axios client with JWT refresh interceptors and standard `params` serialization.
3. [x] **Stage 3: Events Discovery Page**
   - Built `ExploreEvents.jsx` matching the official Stitch `jnuverse_events` design reference.
   - Integrated public route `/events` in `App.jsx` linked directly from the global navigation bar (`Navbar.jsx`).
   - Integrated with `eventsAPI.getAll()` consuming verified DRF query parameters (`search`, `upcoming=true|false`, `page`, `page_size`).
   - **Filter Accuracy & Pagination:**
     - Upcoming tab strictly shows published events where `starts_at > now` (ongoing events excluded).
     - Ongoing tab retrieves the complete active dataset (`upcoming=true` across pages) and strictly filters published events where `starts_at <= now && ends_at > now`, accurately paginating without partial page count claims.
     - Featured "UP NEXT" spotlight strictly selects the earliest published event where `starts_at > now`. Already-started events are never labeled "UP NEXT". Gracefully omitted if no future event exists.
     - Standardized capacity wording to `"Unlimited Capacity"` when `capacity` is null.
   - Implemented `Intl.DateTimeFormat` with `Asia/Dhaka` (+06:00 BST) timezone handling for schedules and dates.
   - Handled responsive 3-column event grid, loading skeletons, empty zero-state with reset, API error retry, and pagination.
4. [x] **Stage 4: Event Details & Student RSVP Workflow**
   - Built `EventDetail.jsx` consuming `GET /api/events/:id/`, `POST /api/events/:id/register/`, and `DELETE /api/events/:id/register/`.
   - Registered public route `/events/:id` in `App.jsx`.
   - Integrated navigation in `ExploreEvents.jsx` (featured "View Event" and card "View Details" linking directly to `/events/:id`, quick-view modal retired).
   - Designed 12-column editorial layout with host club insignia, neutral "Organized by" attribution without unsupported verification claims, schedule, venue, capacity tracking, and status badges.
   - Handled all RSVP states: anonymous prompt with login redirection, student registration with confirmation modal, registered confirmation card with cancel modal, and club operator advisory.
   - Authoritative state refresh via `eventsAPI.getById(id)` following registration and cancellation with graceful fallback, standardized confirmation notice ("Your registration has been confirmed. We look forward to seeing you!"), and 409 Conflict messages (full capacity, event started, cancellation prohibited).
5. [x] **Stage 5: Club Operator Event Creation & Editing**
   - Built `OperatorEventForm.jsx` supporting both create (`POST /api/events/`) and edit (`PATCH /api/events/:id/`) modes.
   - Registered protected routes `/operator/events/new` and `/operator/events/:id/edit` restricted to `club_operator` role.
   - Implemented strict Asia/Dhaka (+06:00 BST) wall-clock conversion helpers (`isoToDhakaInput` and `dhakaInputToIso`).
   - Implemented 12-column Stitch layout with real-time "Live Public Preview" mirror card in the right column.
   - Handled client-side validation for required fields, future start time, end-after-start constraints, positive capacity integer, and registered attendee minimum.
   - Mapped backend `400` field validation errors, `409` conflict notices (cancelled or ended events read-only), and `403` permissions.
6. [ ] **Stage 6: Operator Event Management & Attendee Roster**
   - Build operator event dashboard (`?mine=true`), publish/cancel actions, and attendee list (`GET /api/events/:id/registrations/`).
7. [ ] **Stage 7: Integration Review, Quality Gates & Documentation**
   - Full end-to-end audit, static linting, and production build verification.

---

## 4. Files Created & Modified

### Created Files
- [`frontend/src/pages/ExploreEvents.jsx`](../../src/pages/ExploreEvents.jsx): Campus events discovery and listing page implementing Stitch `jnuverse_events` specifications.
- [`frontend/src/pages/EventDetail.jsx`](../../src/pages/EventDetail.jsx): Public event detail view with schedule, venue, live capacity metrics, and student RSVP registration/cancellation workflow.
- [`frontend/src/pages/OperatorEventForm.jsx`](../../src/pages/OperatorEventForm.jsx): Unified club operator event creation and editing workspace with real-time public preview and Asia/Dhaka timezone handling.

### Modified Files
- [`frontend/src/App.jsx`](../../src/App.jsx): Registered protected routes `/operator/events/new` and `/operator/events/:id/edit` for `club_operator`.
- [`frontend/src/pages/ExploreEvents.jsx`](../../src/pages/ExploreEvents.jsx): Added operator "Create Event" CTA button in header section.
- [`frontend/src/pages/EventDetail.jsx`](../../src/pages/EventDetail.jsx): Added "Edit Event Details" button for club operators when event is editable.
- [`frontend/src/services/api.js`](../../src/services/api.js): Added and exported `eventsAPI` encapsulating all backend-verified event operations.
- [`frontend/FRONTEND_README.md`](../../FRONTEND_README.md): Documented `eventsAPI`, `ExploreEvents.jsx`, `EventDetail.jsx`, `OperatorEventForm.jsx`, design features, and updated status matrix.
- [`frontend/docs/workflow/WEEK_04_EVENTS_AND_REGISTRATION.md`](WEEK_04_EVENTS_AND_REGISTRATION.md): Maintained workflow tracking document.

---

## 5. Backend Dependencies & Endpoints (`eventsAPI`)

All endpoints consume and return standard JSON payloads using the configured Axios client with automatic Bearer token authentication:

| Method | Endpoint | Description | Request Payload / Params | Response Data |
|---|---|---|---|---|
| `eventsAPI.getAll(params)` | `GET /api/events/` | List visible events | `params: { club, upcoming, mine, registered, search, page, page_size }` | Paginated `{ count, next, previous, results: [ Event ] }` |
| `eventsAPI.getById(id)` | `GET /api/events/<id>/` | Single event details | None | Single `Event` object |
| `eventsAPI.create(payload)` | `POST /api/events/` | Create draft event (Operator only) | `{ title, description, venue, starts_at, ends_at, capacity }` | `201 Created` with draft `Event` |
| `eventsAPI.update(id, payload)` | `PATCH /api/events/<id>/` | Edit event (Operator only) | `{ title, description, venue, starts_at, ends_at, capacity }` | `200 OK` with updated `Event` |
| `eventsAPI.publish(id)` | `POST /api/events/<id>/publish/` | Publish draft event | None | `200 OK` with published `Event` |
| `eventsAPI.cancel(id)` | `POST /api/events/<id>/cancel/` | Cancel event | None | `200 OK` with cancelled `Event` |
| `eventsAPI.register(id)` | `POST /api/events/<id>/register/` | Student RSVP | None | `201/200` with updated `Event` |
| `eventsAPI.unregister(id)` | `DELETE /api/events/<id>/register/` | Cancel Student RSVP | None | `204 No Content` |
| `eventsAPI.getRegistrations(id, params)` | `GET /api/events/<id>/registrations/` | List registered students (Operator only) | `params: { page, page_size }` | Paginated `{ count, results: [ Registration ] }` |

---

## 6. Contract Specifications & Business Logic

1. **Date & Time Fields:**
   - Field names are strictly `starts_at` and `ends_at` (ISO 8601 format).
2. **Event Status Lifecycle:**
   - `"draft"` $\rightarrow$ `"published"` $\rightarrow$ `"cancelled"`.
   - `is_completed` is a derived property computed by the backend when `status === "published"` and `ends_at < now`.
3. **Capacity & Deadlines:**
   - `capacity: null` indicates unlimited capacity.
   - `remaining_capacity` indicates remaining seats (`max(capacity - registered_count, 0)`).
   - Capacity full or registration after `starts_at` returns **`409 Conflict`** with a descriptive `detail` message.
4. **Student Privacy:**
   - Registrations strictly expose `id`, `student_id`, `name`, `department`, `batch`, `status`, `registered_at`.
   - Student email addresses are never returned.

---

## 7. Verification Results

### Stage 2 Verification
```bash
# 1. ESLint Static Analysis
npm run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm run build
# Output: Exit code 0 (built in 854ms)
```

### Stage 3 Final Verification & Accuracy Correction
```bash
# 1. ESLint Static Analysis
npm run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm run build
# Output: Exit code 0 (built in 799ms, 113 modules transformed)
```

### Stage 4 Verification (Event Details & Student RSVP)
```bash
# 1. ESLint Static Analysis
npm run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm run build
# Output: Exit code 0 (114 modules transformed, built in ~878ms)
```

### Stage 5 Verification (Club Operator Event Creation & Editing)
```bash
# 1. ESLint Static Analysis
npm run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm run build
# Output: Exit code 0 (116 modules transformed, built in ~868ms)
```



