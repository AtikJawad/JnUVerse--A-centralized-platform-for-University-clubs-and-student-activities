# Week 05 — Notices & Notifications

**Focus:** Club announcements/notices, audience targeting, in-app personal notifications, unread indicators, and notification interactions  
**Status:** **In Progress** (Stage 3 Completed: Full Notifications Inbox Verified)  
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
4. [ ] **Stage 4: Club Notice Board Component**
   - Embed notice board on `ClubDetail.jsx` (`/clubs/:slug`).
   - Display audience status badges (`Public`, `Followers`, `Members`, `Department`).
   - Format timestamps in `Asia/Dhaka` (+06:00 BST).
5. [ ] **Stage 5: Club Operator Notice Management & Publishing**
   - Build operator notice workspace at `/operator/notices` and notice compose modal.
   - Audience selector (`public`, `followers`, `members`, `department`) with conditional department dropdown from `authAPI.getDepartments()`.
   - Warning banner: audience and department are immutable post-creation.
   - Edit mode (restricting edits to `title` and `body` only).
   - Delete confirmation with cascading notification cleanup.
6. [ ] **Stage 6: Final Verification, Quality Gates & Documentation**
   - Full end-to-end audit, static linting, and production build verification.

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
