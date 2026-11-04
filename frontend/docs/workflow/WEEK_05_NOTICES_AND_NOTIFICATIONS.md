# Week 05 — Notices & Notifications

**Focus:** Club announcements/notices, audience targeting, in-app personal notifications, unread indicators, and notification interactions  
**Status:** **Completed** (Stage 6 Audited, Verified & Quality Gates Passed)  
**Assigned:** Anik Khondokar (Frontend MVP Coder)  
**Backend Reference:** Atik Jawad / Claude (`WEEK_05_BACKEND_HANDOFF.md`, 121 backend tests passing, OpenAPI validated)  
**Target:** November 2026  

---

## 1. Objectives

- Implement club notice board and announcements with server-enforced audience scoping (`public`, `followers`, `members`, `department`).
- Implement club operator notice management (create, update title/body, delete).
- Implement personal in-app notification inbox for students and club operators.
- Implement header notification bell badge with periodic unread count polling (30–60s) and quick-action dropdown.
- Implement mark-single-read and mark-all-read operations.
- Deep link notifications to associated events (`/events/:id`) or club notices (`/clubs/:slug`).

---

## 2. Scope & Exclusions

- **In Scope:** `noticesAPI` and `notificationsAPI` in `frontend/src/services/api.js`, header notification bell with badge and dropdown, full notifications view (`/notifications`), club notice board tab on `ClubDetail.jsx`, operator notice manager and compose modal.
- **Exclusions:** Email/push notifications (in-app only per backend contract), real-time WebSockets (polling is the approved contract), notice drafts (notices publish immediately upon creation), notice attachments/images, multi-department targeting (one department per notice).

---

## 3. Implementation Stages & Progress

1. [x] **Stage 1: API Services Foundation (`noticesAPI` & `notificationsAPI`)**
   - Implemented `noticesAPI` in `frontend/src/services/api.js` consuming `GET /api/notices/`, `GET /api/notices/:id/`, `POST /api/notices/`, `PATCH /api/notices/:id/`, and `DELETE /api/notices/:id/`.
   - Implemented `notificationsAPI` in `frontend/src/services/api.js` consuming `GET /api/notifications/`, `GET /api/notifications/unread-count/`, `POST /api/notifications/:id/read/`, and `POST /api/notifications/read-all/`.
   - Inherits shared Axios client, JWT authorization interceptor, and 401 token refresh queue.
   - Verified notice creation payload (`department` key for department targeting).
   - Validated against ESLint (0 errors, 0 warnings) and Vite production build.
2. [x] **Stage 2: Header Notification Bell & Polling Component**
   - Built `NotificationBell.jsx` in `frontend/src/components/` and integrated into `Navbar.jsx`.
   - Dynamic unread count pill badge (capped at `99+`, hidden when `0`).
   - Polls `GET /api/notifications/unread-count/` on mount and every 45s when authenticated.
   - Pauses polling when browser tab is hidden (`document.visibilityState === 'hidden'`) and immediately resumes on visible.
   - Prevents overlapping network requests via `isPollingRef` in-flight guard.
   - User identity & generation tracking via `currentIdentity` (`${id/email}:${role}`) and `generationRef`; drops stale in-flight responses across account/role switches and prevents older requests from clearing newer in-flight guards.
   - Compact preview dropdown popover showing latest 5 notifications (`GET /api/notifications/?page_size=5`).
   - Comprehensive UI states: loading pulse skeleton, empty state ("You're all caught up!"), and retryable error state.
   - Optimistic mark-as-read with strict failure rollback (restoring previous unread count and `is_read: false` state with error alert banner if `POST /api/notifications/:id/read/` fails).
   - Validated canonical deep navigation destination (`/events/:id` from `App.jsx`, `/operator/members`, `/my-clubs`, `/clubs`).
   - Deep link at dropdown footer navigating to `/notifications`.
3. [x] **Stage 3: Full Notifications Inbox View (`/notifications`)**
   - Built `Notifications.jsx` in `frontend/src/pages/` and registered route `/notifications` protected by `ProtectedRoute` (`allowedRoles: ["student", "club_operator"]`).
   - Server-side filtering with `All` and `Unread` (`unread=true`) tabs and real-time backend counts.
   - Server-side pagination (15 items/page) with Previous/Next controls, total count tracking, and page resets on filter change.
   - "Mark all as read" one-click action calling `POST /api/notifications/read-all/`, disabling during execution, and updating counts immediately.
   - Card click and separate accessible inline button for individual mark-as-read (`POST /api/notifications/<id>/read/`) with optimistic updates and error rollback.
   - Navbar bell synchronization via custom `notifications:updated` event, triggering instant counter refresh without polling delay or full page reload.
   - Shared synchronous in-flight guard (`inFlightIdsRef`) across both card clicks and inline buttons, preventing duplicate mark-as-read requests and duplicate navigation.
   - Comprehensive request-generation & identity guard across all inbox operations (`fetchNotifications`, `fetchUnreadTotal`, `handleMarkSingleRead`, `handleCardClick`, `handleMarkAllRead`).
   - Strict backend-confirmation-first execution for `markAllRead` (no local state mutation prior to backend 200 OK).
   - Deep navigation mapping for `event_*` (`/events/:id`), `membership_update` (`/my-clubs` or `/operator/members`), `collaboration_update` (`/notifications`), and notice club slug resolution via `noticesAPI.getById(id)` to `/clubs/:slug` (fallback `/clubs`).
   - Comprehensive Stitch design system states: loading skeleton cards, empty states for "All" and "Unread", and action error banners.
4. [x] **Stage 4: Club Notice Board Component**
   - Embedded Notice Board within `frontend/src/pages/ClubDetail.jsx` (`/clubs/:slug`) in the primary 7-column content section below the About card.
   - Header with `campaign` icon, title "Notice Board", live count badge, and subtitle "Stay informed with the latest announcements from this club."
   - Integrated `noticesAPI.getAll({ club: slug, page, page_size: 5 })` querying `GET /api/notices/?club=<slug>&page=...&page_size=5`.
   - Client-side audience badge mapping (`public` -> "Public", `followers` -> "Followers", `members` -> "Club Members", `department` -> "Department: [Dept]" or "Department"), strictly respecting backend DRF permissions with zero client bypass.
   - Timestamps formatted in `Asia/Dhaka` (+06:00 BST) using `Intl.DateTimeFormat`.
   - Dedicated `NoticeSkeletons` loading state, custom Empty state ("No announcements yet" / "This club hasn't published any notices yet. Check back later for updates."), and localized Error state with Retry button that preserves full functionality of the rest of ClubDetail.
   - Compact "Load More Announcements" pagination appending deduplicated notice records without duplicate keys, hidden when on a single page.
   - Integration with Notifications Inbox navigation: detects `location.state?.noticeId` or `?notice=<id>` / `?notice_id=<id>` and smoothly scrolls to and highlights the target notice card with a highlighted badge and ring.
   - Re-synchronizes notices reactively when follow status (`is_following`) or membership status (`membershipStatus`) toggles or user authenticates.
   - Read-only implementation: zero notice creation, editing, or deletion UI controls (reserved for Stage 5).
5. [x] **Stage 5: Club Operator Notice Management & Publishing**
   - Built `frontend/src/pages/OperatorNotices.jsx` and registered `/operator/notices` route protected by `ProtectedRoute` (`allowedRoles: ["club_operator"]`).
   - Notice retrieval using backend-verified `mine=true` parameter (`GET /api/notices/?mine=true&page=...&page_size=10`), retrieving only the authenticated operator's own club announcements.
   - 4-card metric ribbon (Total Notices, Public Notices, Member/Follower Notices, Department Notices), search bar, and audience filter pills.
   - Notice card presentation with title, formatted Asia/Dhaka timestamps, audience badges (`Public`, `Followers`, `Club Members`, `Department: [Dept]`), preview link to `/clubs/:slug`, and Edit/Delete controls.
   - Publish Notice Modal: validated title (max 200 chars) and body text, audience selector (`public`, `followers`, `members`, `department`), dynamic department dropdown populated from `authAPI.getDepartments()`, immediate-publication notice banner, and in-flight request locking.
   - Edit Notice Modal: title and body editing only; audience and department targeting strictly rendered as read-only immutable badges with governance warning banners.
   - Delete Confirmation Modal: identifying title and publication timestamp, warning of cascading student in-app notification deletion, and executing `DELETE /api/notices/:id/` with backend-confirmation-first list removal.
   - Integrated "Notice Management" link into `Navbar.jsx` (desktop and mobile) restricted to `club_operator`.
   - Exported `authAPI.getDepartments()` in `frontend/src/services/api.js`.
6. [x] **Stage 6: Final Verification, Quality Gates & Documentation**
   - Full end-to-end audit, static linting, and production build verification across student and operator workflows.
   - Verified backend queryset ordering (`order_by("-created_at", "-id")`) confirming newest-first delivery for notices and notifications.
   - Tested safe read-only API contracts against local server and live Render production backend.
   - Documented comprehensive manual QA matrix and production deployment guidelines.

---

## 4. Backend Dependencies & Endpoints

All endpoints consume and return standard JSON payloads using the configured Axios client with automatic Bearer token authentication:

### Notices API (`/api/notices/`)
| Method | Endpoint | Description | Query Params / Payload | Response Data |
|---|---|---|---|---|
| `GET` | `/api/notices/` | List visible notices (audience-scoped) | `params: { club, mine, page, page_size }` | Paginated `{ count, next, previous, results: [ Notice ] }` |
| `GET` | `/api/notices/<id>/` | Single notice details | None | `200 OK` `Notice` or `404 Not Found` |
| `POST`| `/api/notices/` | Create & publish notice (Operator only) | `{ title, body, audience, department? }` | `201 Created` with `Notice` |
| `PATCH`| `/api/notices/<id>/` | Edit notice title/body (Owning operator) | `{ title?, body? }` | `200 OK` with updated `Notice` |
| `DELETE`| `/api/notices/<id>/` | Delete notice (Owning operator) | None | `204 No Content` |

### Notifications API (`/api/notifications/`)
| Method | Endpoint | Description | Query Params / Payload | Response Data |
|---|---|---|---|---|
| `GET` | `/api/notifications/` | List user's notifications (newest first) | `params: { unread: "true", page, page_size }` | Paginated `{ count, next, previous, results: [ Notification ] }` |
| `GET` | `/api/notifications/unread-count/` | Lightweight counter for badge | None | `200 OK` `{"unread_count": N}` |
| `POST`| `/api/notifications/<id>/read/` | Mark single notification as read | None | `200 OK` with updated `Notification` |
| `POST`| `/api/notifications/read-all/` | Mark all unread notifications read | None | `200 OK` `{"updated": N}` |

---

## 5. Contract Specifications & Business Logic

### 1. Notice Audience Scoping
| Audience Value | Description & Target Visibility |
|---|---|
| `public` | Everyone, including anonymous visitors. |
| `followers` | Followers of the club **and** approved club members. |
| `members` | Approved members only (pending, rejected, left, or removed do not have access). |
| `department` | Students currently enrolled in the designated `target_department`. |
| *any* | The posting club's own operator can see all of its notices (`mine=true`). |

- **Notice Creation Payload:**  
  The payload key for department targeting is strictly `department` (e.g. `{"title": "...", "body": "...", "audience": "department", "department": "Computer Science and Engineering (CSE)"}`).
- **Audience Immutability:**  
  `audience` and `department` are read-only after creation; `PATCH` requests accept only `title` and `body`.

### 2. Notification Types & Deep Links
| Notification `type` | Meaning & Context | Deep Link Target |
|---|---|---|
| `notice` | New club notice posted for eligible audience. | Associated notice / club page (`notice` UUID). |
| `event_published` | Club published a new campus event. | `/events/:id` (`event` UUID). |
| `event_cancelled` | Event for which the student registered was cancelled. | `/events/:id` (`event` UUID). |
| `event_updated` | Date, time, or venue was updated for a registered event. | `/events/:id` (`event` UUID). |
| `membership_update` | Membership request submitted, approved, rejected, or removed. | `/my-clubs` (student) or `/operator/members` (operator). |
| `collaboration_update` | Reserved for Week 6 club collaboration features. | TBD |

---

## 6. Verification Results

### Stage 1 Verification (`noticesAPI` & `notificationsAPI`)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (119 modules transformed, built in 1.50s)
```
- Both `noticesAPI` and `notificationsAPI` exported and cleanly structured.
- Endpoints verified against live DRF backend and validated OpenAPI 3.0.3 specification.

### Stage 2 Verification (`NotificationBell` & Navbar Poller)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (120 modules transformed, built in 1.75s)
```
- Built `frontend/src/components/NotificationBell.jsx` with real-time badge, 45s poller, visibility listener, and 5-item preview popover.
- Integrated cleanly into `frontend/src/components/Navbar.jsx` with zero bundle regressions.
- Verified mark-as-read click handler: includes snapshot-based rollback for both `notifications` and `unreadCount`, preventing badge inconsistency on request failure, and displays an inline action error banner.
- Verified account switching resilience & concurrency: `currentIdentity` tracking (`${id/email}:${role}`) paired with monotonic `generationRef` completely purges previous user notifications on session/account change, drops out-of-order responses from prior accounts, and prevents stale requests from resetting active polling guards.
- Confirmed route compatibility: `/events/:id` matches the canonical `<Route path="/events/:id" element={<EventDetail />} />` in `App.jsx`.
- Verified `api.js`: untouched in Stage 2; all Stage 1 endpoints and auth interceptors remain intact.

### Stage 3 Verification (`Notifications.jsx` Full Inbox)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (121 modules transformed, built in 1.70s)
```
- Built `frontend/src/pages/Notifications.jsx` and registered `/notifications` route in `App.jsx` with `ProtectedRoute`.
- Verified server-side filtering (`All` vs `Unread` via `unread=true`) and server-side pagination (15 items/page with Previous/Next controls and count indicators).
- Verified single and bulk mark-as-read operations with error rollbacks, shared synchronous in-flight guards (`inFlightIdsRef`), and confirmation-first bulk execution.
- Implemented immediate Navbar notification bell synchronization via `notifications:updated` event.
- Verified deep navigation mapping: `event_*` to `/events/:id`, `membership_update` to `/my-clubs` or `/operator/members`, `collaboration_update` to `/notifications`, and async resolution of notice club slugs via `noticesAPI.getById(id)` to `/clubs/:slug`.
- Validated Stitch system loading skeleton, customized empty states ("You're all caught up" / "No unread notifications"), and error retry handling.
- Calibrated layout vertical spacing on `Notifications.jsx`: added `pt-28 sm:pt-[120px] pb-12 sm:pb-16` on the main container to account for the fixed 80px Navbar (`h-20`), creating exactly 32px (mobile) and 40px (tablet/desktop) of clear vertical breathing room before the heading.

### Stage 4 Verification (`ClubDetail.jsx` Notice Board)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (121 modules transformed, built in 1.53s)
```
- Embedded read-only Notice Board inside `ClubDetail.jsx` (`/clubs/:slug`).
- Query verified: `GET /api/notices/?club=<slug>&page=1&page_size=5`.
- Audience visibility completely preserved by DRF backend; no client-side security bypass or local leakage.
- Formatted timestamps in `Asia/Dhaka` (`+06:00 BST`).
- Skeletons, empty state, isolated retryable error state, and deduplicated Load More pagination verified.
- Seamless deep link highlight support from Notification Inbox via `location.state?.noticeId` or `?notice=<id>`.
- Verified & hardened notification navigation flow across both `Notifications.jsx` and `NotificationBell.jsx`: asynchronously resolves club slug via `noticesAPI.getById(id)` to `/clubs/:slug` and passes `state: { noticeId }`.
- In `ClubDetail.jsx`: on initial load with `targetNoticeId`, if the notice is not on page 1, gracefully fetches the single notice via `noticesAPI.getById(targetNoticeId)`. Strictly validates that `notice.club.slug` matches the active route slug, that the request still belongs to the active page generation and authenticated identity, and re-validates club ownership prior to DOM highlight. Missing, inaccessible, or mismatched notices are ignored gracefully without breaking the page.
- In `NotificationBell.jsx` and `Notifications.jsx`: verified airtight request-generation and authenticated-identity checks immediately following all asynchronous `markRead` and `resolveNotificationTarget`/`resolveDestination` lookups before closing dropdowns or executing navigation.
- No backend modifications, zero commits or pushes.

### Stage 5 Verification & Final Corrections (`OperatorNotices.jsx` Console)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (122 modules transformed, built in 2.19s)
```
- Built `frontend/src/pages/OperatorNotices.jsx` and registered `/operator/notices` route in `App.jsx`.
- Verified role protection: only `club_operator` can access; unauthenticated users redirect to login, students denied access via `ProtectedRoute`.
- Query verified: `GET /api/notices/?mine=true` strictly retrieves the operator's own club notices, enforcing backend tenant isolation.
- **Department API Failure Handling & Validation**:
  - Removed hardcoded `DEFAULT_DEPARTMENTS` fallback.
  - Department options are loaded dynamically from `authAPI.getDepartments()`.
  - When the department fetch succeeds, displays the actual returned department strings (matching `DEPARTMENT_CHOICES` from `apps.accounts.constants` required by `NoticeCreateSerializer`).
  - When the fetch fails, displays an explicit error alert with an interactive "Retry" button.
  - Department-targeted notice submission is disabled until valid department data has loaded (`disabled={createLoading || (createForm.audience === "department" && (departmentsLoading || departments.length === 0 || !createForm.department))}`).
  - Switching away from the "department" audience immediately resets `department: ""` to prevent sending stale or unverified department values.
  - Create payload strictly includes `department` only when `audience === "department"`.
- **Search & Audience Filter Accuracy Across Full Operator Dataset**:
  - Inspected backend `NoticeListCreateView` in `backend/apps/notifications/views.py`: confirmed backend supports `club` and `mine` query parameters, but does NOT support `search` or `audience` filtering.
  - Implemented multi-page fetch loop (`page_size: 50`, `mine: true`) consistent with `OperatorEvents.jsx` to load all operator notices into `allNotices` with ID deduplication and monotonic generation/identity concurrency guards (`isRequestCurrent`).
  - Filter pills (`All`, `Public`, `Followers`, `Members`, `Department`) and text search (title, body, department) operate across the complete operator notices dataset without dropping records on subsequent pages.
  - Clean empty state with "Clear Filters" action displayed when no announcements match active search or audience filters.
- **Summary Metrics Accuracy**:
  - All 4 summary cards (Total Notices, Public Notices, Member/Follower Notices, Department Targeted Notices) compute exact counts over the complete operator dataset (`allNotices`).
  - Zero fabricated, estimated, or single-page partial counts.
  - Local pagination (10 per page) slices the filtered notices with responsive Previous/Next controls and explicit item ranges ("Showing 1–10 of X announcements (filtered from Y total)").
- **Audience & Edit Governance**:
  - Edit mode strictly sends only `title` and `body` adhering to `NoticeUpdateSerializer`. Audience and department remain read-only immutable badges with policy notices.
  - Delete operation waits for backend HTTP 204 confirmation before removing the notice from local state.
  - Navbar operator navigation link for desktop and mobile remains fully functional.
  - Zero backend modifications, zero commits or pushes.

### Stage 5 Visual Refinement (`OperatorNotices.jsx` Stitch-Inspired Redesign)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (122 modules transformed, built in 993ms)
```
- Executed Stitch-inspired visual refinement based on `DESIGN.md`, `jnuverse_member_management_redesigned/code.html`, `jnuverse_club_operator_dashboard_minimal_redesign/code.html`, and `jnuverse_collaboration_requests_management/code.html`.
- **Page Header**: Editorial uppercase tracking-wider eyebrow (`YOUR CLUB COMMUNITY · OFFICIAL BROADCASTS`), dual-style headline (`Manage your <span class="font-normal italic text-primary">announcements</span>`), dynamic authenticated club context badge (`[Club Name] · Official Dispatch`) with live pulsing blue beacon, and compact pill action buttons (`Refresh` with spinning icon, `Create New Notice`).
- **Linear Metric Ribbon**: Replaced 4 bulky, disconnected dashboard cards with a single cohesive white ribbon (`p-4 sm:p-5`, `rounded-2xl`, hairline dividers `divide-x divide-border-subtle/70` on desktop, 2x2 grid on mobile). Displays 20-24px figures, 11px uppercase labels, and 10x10 soft lavender icon boxes for Total Announcements, Public Dispatches, Members & Followers, and Department Targeted notices, calculated 100% across the complete operator dataset.
- **Unified Search & Segmented Filter Toolbar**: Search input with leading icon and instant clear button paired with 5 distinct audience filter pills (`All`, `Public`, `Followers`, `Members`, `Department`), each showing live item count chips (`All (N)`, `Public (N)`, etc.) computed from the full deduplicated dataset.
- **Notice Cards & Quiet Empty States**: Compact `rounded-2xl p-4 sm:p-5` cards with subtle hover shadow, audience badges (`Public`, `Followers`, `Club Members`, `Department: [Dept]`), formatted Asia/Dhaka timestamps, direct preview links to public club board, and compact Edit/Delete actions. Removed noisy technical `UUID: ...` strings and replaced with informative audience scope metadata. Implemented quiet Stitch zero-state (`py-10 text-center`) and filter-mismatch state with a "Clear Filters" action.
- **Compact Modal Dialogs**: Refined Create, Edit, and Delete modals to compact `max-w-lg` (`max-w-md` for delete), `rounded-2xl p-6` structures. Replaced harsh alert boxes with subtle Stitch policy strips. In Edit modal, audience and department scope are presented as a compact badge row.
- **Navbar Operator Navigation Alignment**:
  - Updated operator center navigation pill to: `Overview` (`/dashboard`), `Explore Clubs` (`/clubs`), `Members` (`/operator/members`), `Events` (`/operator/events`), `Notices` (`/operator/notices`).
  - Added secondary `Explore Events` link (`/events`) on desktop right-side controls and mobile drawer menu to preserve public campus event calendar access for operators.
  - Kept student navigation links completely untouched (`Overview`, `Explore Clubs`, `My Clubs`, `Events`).
- **Multi-Page Pagination Safety Cap Findings**: Confirmed multi-page loop safety cap at `pageNum >= 20` (1,000 notices max). Normal campus clubs (10-100 notices) fetch 100% of data and exit cleanly on `!data.next` or `accumulated.length >= count`. Clubs exceeding 1,000 notices will be stopped at 1,000 notices without hanging.

### Stage 5 Final Correction (Pagination Completeness & Honest Metrics)
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (122 modules transformed, built in 1.01s)
```
- **Incomplete Retrieval Detection**:
  - Dynamically captures backend `data.count` into `totalBackendCount`.
  - Determines `isPartiallyLoaded` when the 20-page safety cap is activated (`pageNum >= 20`) while backend `data.next` exists and `allNotices.length < totalBackendCount`.
  - Preserves UUID deduplication and monotonic `generationRef` / `currentIdentity` request guards.
- **Clear & Unobtrusive Warning**:
  - Renders visible notice banner when incomplete: *"Showing the latest {loadedCount} of {totalBackendCount} notices. Some older notices are not loaded."*
  - Populates actual unique loaded count and actual backend count dynamically without hardcoded values.
- **Honest Metric Ribbon Labels**:
  - Automatically switches ribbon metric labels from total to loaded when incomplete:
    - *"Loaded Notices"* (with `{loaded} / {total}` indicator)
    - *"Loaded Public"*
    - *"Loaded Members & Followers"*
    - *"Loaded Department"*
  - Restores *"Total Notices"*, *"Public Notices"*, *"Members & Followers"*, and *"Department Targeted"* when complete dataset is retrieved.
- **Search & Filter Disclosure**:
  - Discloses that search and audience filters operate strictly over the loaded dataset.
  - Updates search placeholder: *"Search within {loaded} loaded notices..."*.
  - Adds contextual disclosure notice: *"Search and audience filters apply to the {loaded} loaded notices only. Older notices might not appear in search results."*
  - Provides Filter Mismatch empty state continuation option to load older records.
- **Safe Continuation**:
  - Adds user-controlled *"Load More Records"* action continuing from `nextBackendPage`.
  - Fetches up to `BATCH_PAGE_CAP = 10` pages (500 notices) per click with `loadingMore` concurrency lock.
  - Preserves active search queries and audience tab selections.
  - Automatically transitions to complete state when all pages are exhausted, clearing the warning banner and restoring standard total metric labels.

### Stage 6 Verification & Integration Quality Gates
```bash
# 1. ESLint Static Analysis
npm --prefix frontend run lint
# Output: Exit code 0 (0 errors, 0 warnings)

# 2. Vite Production Build
npm --prefix frontend run build
# Output: Exit code 0 (122 modules transformed, built in 975ms)
```

#### Final Week 5 Production Readiness Status
> **Implementation complete; authenticated runtime QA, backend automated tests and owner-side deployment remain pending.**

#### Workflow Verification Classifications
Verification definitions:
- **PASS – Runtime Verified:** Actually executed successfully against a running environment.
- **PASS – Source/Contract Verified:** Verified through code and backend API contract inspection (props, routes, logic, serializers, view contracts, query parameters).
- **NOT TESTED:** Requires interactive manual testing or an authenticated workflow that has not been executed.
- **BLOCKED:** Could not be executed due to a specific dependency or access restriction.

##### Student Workflow Audit (15 Steps)
| Step | Workflow Action | Route / Component | Classification | Verification Detail |
|:---:|:---|:---|:---:|:---|
| 1 | Student Login | `/login` (`Login.jsx`) | **NOT TESTED** | Source and contract verified (`POST /api/auth/login/`); authenticated interactive login requires manual QA. |
| 2 | Dashboard Access | `/` or `/dashboard` | **NOT TESTED** | Protected route and role checks verified in source; authenticated runtime session requires manual QA. |
| 3 | Explore Clubs | `/clubs` (`ExploreClubs.jsx`) | **PASS – Runtime Verified** | `GET /api/clubs/` executed successfully (200 OK, 6 clubs); directory layout verified. |
| 4 | Club Detail | `/clubs/:slug` (`ClubDetail.jsx`) | **PASS – Runtime Verified** | `GET /api/notices/?club=:slug` executed successfully (200 OK); profile layout verified. |
| 5 | Follow / Unfollow | `/clubs/:slug` | **NOT TESTED** | Source verified (`POST`/`DELETE /api/clubs/:slug/follow/`); authenticated write action requires manual QA. |
| 6 | Membership Request | `/clubs/:slug` | **NOT TESTED** | Source verified (`POST /api/clubs/:slug/membership/`); authenticated write action requires manual QA. |
| 7 | View My Clubs | `/my-clubs` (`MyClubs.jsx`) | **NOT TESTED** | Protected route (`student` role) verified in source; authenticated runtime view requires manual QA. |
| 8 | Explore Events | `/events` (`ExploreEvents.jsx`) | **PASS – Runtime Verified** | `GET /api/events/` executed successfully (200 OK, 12 events); spotlight and filters verified. |
| 9 | Event Detail | `/events/:id` (`EventDetail.jsx`) | **PASS – Source/Contract Verified** | Route, component logic, and DRF serializer contract verified; interactive display requires manual QA. |
| 10 | RSVP / Cancel RSVP | `/events/:id` | **NOT TESTED** | Source verified (`POST`/`DELETE /api/events/:id/register/`); authenticated write action requires manual QA. |
| 11 | Notification Bell Poller | `Navbar.jsx` (`NotificationBell.jsx`) | **NOT TESTED** | Polling architecture (45s, tab visibility, in-flight lock) verified in source; authenticated live polling requires manual QA. |
| 12 | Notifications Inbox | `/notifications` (`Notifications.jsx`) | **NOT TESTED** | Server filtering and pagination verified in source; authenticated inbox view requires manual QA. |
| 13 | Open Event Notifications | `Notifications.jsx` & `NotificationBell.jsx` | **PASS – Source/Contract Verified** | Direct route resolution to `/events/:id` verified in component source. |
| 14 | Open Club Notice Deep Link | `Notifications.jsx` & `NotificationBell.jsx` | **PASS – Source/Contract Verified** | Async notice club slug resolution via `noticesAPI.getById` and notice UUID state handoff verified in code. |
| 15 | Read Audience-Targeted Notices | `/clubs/:slug` Notice Board | **PASS – Runtime Verified** | Public notices verified live via `GET /api/notices/` (200 OK, ordered newest first); audience filtering verified in backend queryset code. |

##### Operator Workflow Audit (19 Steps)
| Step | Workflow Action | Route / Component | Classification | Verification Detail |
|:---:|:---|:---|:---:|:---|
| 1 | Operator Login | `/operator/login` (`OperatorLogin.jsx`) | **NOT TESTED** | Dedicated login route and operator role enforcement verified in source; interactive sign-in requires manual QA. |
| 2 | Operator Dashboard | `/` or `/dashboard` | **NOT TESTED** | Protected route and role checks verified in source; authenticated runtime session requires manual QA. |
| 3 | Explore Clubs | `/clubs` | **PASS – Runtime Verified** | Public directory access preserved for operators; `GET /api/clubs/` returns 200 OK. |
| 4 | Manage Members | `/operator/members` (`OperatorMembers.jsx`) | **NOT TESTED** | Protected route (`club_operator` role) verified in source; authenticated runtime view requires manual QA. |
| 5 | Membership Review | `/operator/members` | **NOT TESTED** | Source verified (`POST /api/clubs/:slug/memberships/:id/approve/` or `reject/`); authenticated write action requires manual QA. |
| 6 | Manage Events | `/operator/events` (`OperatorEvents.jsx`) | **NOT TESTED** | Multi-page loop verified in source; authenticated operator event list requires manual QA. |
| 7 | Create & Edit Events | `/operator/events/new` & `/:id/edit` | **NOT TESTED** | Form validation and Asia/Dhaka schedule inputs verified in source; authenticated submission requires manual QA. |
| 8 | Publish & Cancel Events | `/operator/events` | **NOT TESTED** | Publish/cancel modal actions verified in source; authenticated lifecycle transitions require manual QA. |
| 9 | Attendee Roster | `/operator/events/:id/attendees` | **PASS – Source/Contract Verified** | Student privacy rules verified in source: student email addresses strictly excluded from serializer and UI. |
| 10 | Operator Notification Bell | `Navbar.jsx` | **NOT TESTED** | Bell unread count and preview dropdown verified in source; authenticated polling requires manual QA. |
| 11 | Operator Notifications Inbox | `/notifications` | **NOT TESTED** | Full inbox accessibility for operators verified in source; authenticated runtime view requires manual QA. |
| 12 | Notice Management Console | `/operator/notices` (`OperatorNotices.jsx`) | **PASS – Source/Contract Verified** | Stitch UI, linear ribbon, pagination loops, and concurrency guards verified via code inspection and build. |
| 13 | Create Public Notice | `/operator/notices` | **NOT TESTED** | Creation modal and `NoticeCreateSerializer` contract verified in source; authenticated creation requires manual QA. |
| 14 | Create Follower Notice | `/operator/notices` | **NOT TESTED** | Audience selector verified in source; authenticated creation requires manual QA. |
| 15 | Create Member Notice | `/operator/notices` | **NOT TESTED** | Audience selector verified in source; authenticated creation requires manual QA. |
| 16 | Create Department Notice | `/operator/notices` | **PASS – Runtime Verified (Choices)** | Department options fetched live from `GET /api/auth/departments/` (200 OK, 38 departments); submission action **NOT TESTED**. |
| 17 | Edit Title & Body | `/operator/notices` | **NOT TESTED** | Edit modal and `NoticeUpdateSerializer` contract verified in source; authenticated update requires manual QA. |
| 18 | Delete Notice | `/operator/notices` | **NOT TESTED** | Delete modal and HTTP 204 confirmation flow verified in source; authenticated deletion requires manual QA. |
| 19 | Public Board Preview | `/clubs/:slug` | **PASS – Runtime Verified** | Preview link (`open_in_new`) navigates to public Club Notice Board; public notice board verified live. |

#### Backend Test Environment Status
- **Backend Test Suite:** `backend/tests/test_notices.py` and `backend/tests/test_notifications.py` exist in repository.
- **Execution Status:** **BLOCKED**. Running tests via `python3 backend/manage.py test` fails with `ModuleNotFoundError: No module named 'pytest'` because pytest is not installed in the global system Python environment. In accordance with project policy against global package installations, backend test suite execution cannot proceed locally until the backend developer configures and runs the suite within the dedicated project virtual environment. Zero backend tests claimed as passed.

#### Safe Read-Only API Smoke Tests (Executed & Verified)
| Endpoint | Method | Result | Verification Notes |
|:---|:---:|:---:|:---|
| `/api/health/` | `GET` | **PASS (200 OK)** | Actually executed on `http://127.0.0.1:8000` and live Render production service (`https://jnuverse-a-centralized-platform-for.onrender.com`). |
| `/api/auth/departments/` | `GET` | **PASS (200 OK)** | Actually executed; returns all 38 official Jagannath University academic departments. |
| `/api/notices/` | `GET` | **PASS (200 OK)** | Actually executed; returns audience-scoped public notices; verified queryset ordering `-created_at`, `-id` (newest first). |
| `/api/notices/?mine=true` | `GET` | **PASS (401 Unauthorized)** | Actually executed; confirmed unauthenticated requests are strictly rejected by DRF backend. |
| `/api/notifications/` | `GET` | **PASS (401 Unauthorized)** | Actually executed; confirmed unauthenticated inbox access is strictly rejected. |
| `/api/notifications/unread-count/` | `GET` | **PASS (401 Unauthorized)** | Actually executed; confirmed unauthenticated counter access is strictly rejected. |
| `/api/clubs/` | `GET` | **PASS (200 OK)** | Actually executed; verified public club directory listing (6 clubs returned). |
| `/api/events/` | `GET` | **PASS (200 OK)** | Actually executed; verified public campus events listing (12 events returned). |

#### Manual QA Test Matrix (Unchecked — Pending Manual Execution)
A practical manual verification matrix for subsequent authenticated runtime execution:

##### Student Manual QA Checklist
- [ ] Sign in via `/login` as verified student (`student` role).
- [ ] Verify `Navbar` displays student links: `Overview`, `Explore Clubs`, `My Clubs`, `Events`.
- [ ] Verify unread notification bell badge in Navbar; verify preview popover on bell click.
- [ ] Click "Mark as read" checkmark on an unread notification; verify count decrements immediately.
- [ ] Click "View All Notifications" in dropdown footer; verify `/notifications` inbox opens with proper top spacing.
- [ ] Switch between `All` and `Unread` filter tabs; verify item list filters accordingly.
- [ ] Click an unread event notification; verify navigation to `/events/:id`.
- [ ] Click an unread notice notification; verify navigation to `/clubs/:slug` with target notice highlighted.
- [ ] Click "Mark all as read"; verify prompt confirmation, counter update, and Navbar bell sync.
- [ ] Navigate to `/clubs/:slug`; inspect embedded Notice Board; test "Load More Announcements".
- [ ] Verify notices outside student's audience/department are not displayed.

##### Club Operator Manual QA Checklist
- [ ] Sign in via `/operator/login` as club operator (`club_operator` role).
- [ ] Verify `Navbar` displays operator links: `Overview`, `Explore Clubs`, `Members`, `Events`, `Notices`, plus secondary `Explore Events`.
- [ ] Navigate to `/operator/notices`; verify Stitch editorial header, club badge with live pulsing beacon, and linear metric ribbon.
- [ ] Test Search bar: type keyword, verify live filtering, click "X" to clear.
- [ ] Test Segmented Audience tabs (`All`, `Public`, `Followers`, `Members`, `Department`) with live count chips.
- [ ] Click "Create New Notice"; verify dialog opens with Stitch policy strip.
- [ ] Select `Department` audience; verify university academic departments dropdown loads dynamically.
- [ ] Fill title and body, submit form; verify notice appears at the top of the list.
- [ ] Click "Edit" on a notice card; verify title and body are editable, audience and department scope remain immutable badges.
- [ ] Update title and save; verify updated text renders immediately.
- [ ] Click "Delete" on a notice card; verify modal warns that student in-app notifications will be cascaded and deleted.
- [ ] Confirm deletion; verify notice is removed from list upon HTTP 204.
- [ ] Verify student email addresses are nowhere visible on operator screens.
- [ ] If operator account has >1,000 notices, verify amber warning banner and test "Load More Records" continuation button.

#### Production Deployment Status
- **Local Production Build:** **PASS** (`dist/index.html`, `dist/assets/` built cleanly via `vite build`).
- **Client-Side SPA Routing:** **PASS** (Configured in `frontend/vercel.json` with `rewrites` to `/index.html`).
- **Live Render Public Backend:** **PASS** (Active and healthy at `https://jnuverse-a-centralized-platform-for.onrender.com`).
- **Vercel Production Deployment:** **PENDING OWNER ACTION** (The GitHub repository is private and the Vercel project is on the Hobby plan; collaborator commits cannot deploy automatically via Vercel GitHub integration. Owner must trigger deployment directly via Vercel dashboard or CLI).
- **Production Availability of Latest Changes:** **NOT VERIFIED** (Changes remain uncommitted locally; zero commits or pushes performed).
