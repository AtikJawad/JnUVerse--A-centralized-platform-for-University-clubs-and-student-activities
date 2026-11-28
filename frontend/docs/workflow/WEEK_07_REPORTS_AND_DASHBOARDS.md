# Week 07 — Reports & Dashboards

**Focus:** Interest selection, club logos and event banners, inappropriate club/event reporting, and Student / Club Operator dashboards  
**Status:** **In Progress — Stages 1–3 Completed (Stages 2–3 Source, Build & API Verified; Browser QA Pending)**  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  
**Backend Reference:** Atik Jawad / Claude (`WEEK_07_BACKEND_HANDOFF.md`, 181 automated backend tests passing, OpenAPI validated in `docs/api/openapi.yml`)  
**Design Reference:** Google Stitch `jnuverse_student_dashboard_living_campus_experience/code.html`, `jnuverse_club_operator_dashboard_minimal_redesign/code.html`, `jnuverse_reports_interface/code.html`, `jnuverse_club_profile_management/code.html`  
**Target:** December 2026  

---

## 1. Objectives

- Let students and clubs choose interests from the fixed list of 13; use student interests for club suggestions.
- Let club operators upload and remove a club logo and event banners; display them (or a placeholder) on every club and event screen.
- Let any logged-in user report an inappropriate club or event, and view the status of their own reports.
- Replace the static dashboard with a data-driven **Student Dashboard** and add a **Club Operator Dashboard**.

---

## 2. Scope & Exclusions

- **In Scope:**
  - `interestsAPI`, `dashboardAPI`, `reportsAPI` and logo/banner upload methods in `frontend/src/services/api.js`.
  - Shared `ClubLogo` and `InterestPicker` components.
  - Logo upload/remove and interest selection in the Club Detail operator edit form (the obsolete logo URL field is removed).
  - Banner upload/remove in `OperatorEventForm.jsx`; banner display on event pages and cards.
  - Student `/profile` page with editable interests and a dashboard onboarding prompt.
  - Student Dashboard (`Dashboard.jsx`) and Club Operator Dashboard (`OperatorDashboard.jsx`).
  - `ReportModal` on Club Detail and Event Detail; `/my-reports` page.
- **Exclusions:**
  - Report editing, withdrawal or notifications; public report counts (not built by backend).
  - Report review UI — reports are reviewed by developers in Django Admin `/admin/`.
  - Reporting notices (backend accepts only `club` and `event` targets).
  - Dashboard charts and time series (Week 8 analytical reports).
  - Server-side filtering of clubs by interest (not provided by the API).

---

## 3. Implementation Stages & Progress

1. [x] **Stage 1: API Services Foundation (`interestsAPI`, `dashboardAPI`, `reportsAPI`, image uploads)**
   - `interestsAPI.getAll()` → `GET /api/auth/interests/`; `getMine()` / `setMine(ids)` → `GET` / `PUT /api/auth/me/interests/`.
   - `clubsAPI.update(slug, payload)` → `PATCH /api/clubs/:slug/`; `uploadLogo(slug, file)` / `deleteLogo(slug)` → `PUT` / `DELETE /api/clubs/:slug/logo/`.
   - `eventsAPI.uploadBanner(id, file)` / `deleteBanner(id)` → `PUT` / `DELETE /api/events/:id/banner/`.
   - `reportsAPI.create(payload)` / `getMine(params)` → `POST` / `GET /api/reports/`.
   - `dashboardAPI.student()` / `club()` → `GET /api/dashboard/student/` and `/api/dashboard/club/`.
   - Upload methods send `FormData` with `headers: { "Content-Type": "multipart/form-data" }` through a private `putImage(url, field, file)` helper (see §5.2).
   - Shared constants `REPORT_REASONS` (value/label pairs) and `REPORT_STATUS_LABELS` (`open` → "Received", etc.) for report UI.
   - Validated against ESLint (0 errors, 0 warnings), Vite production build and live API smoke tests (Section 8).

2. [x] **Stage 2: Club Logos, Event Banners & Club Interests**
   - `ClubLogo.jsx`: renders `club.logo` (`object-cover`) inside the caller's container, or the caller's existing fallback (category icon or initials) when the logo is `null` or fails to load. Used in ExploreClubs (featured club and cards), ClubDetail (profile card), MyClubs and OperatorMembers (club badge from `user.club`).
     - PartnerClubsSection and ProposeCollaborationModal already rendered `logo` with a fallback and were left unchanged.
     - Collaboration and event objects carry only `{ id, name, slug }` for clubs (no `logo`), so OperatorCollaborations and EventDetail keep their icons.
   - `ImageUploadField.jsx`: reusable upload / replace / remove control with preview (square or 16:9), browser-side type (JPEG/PNG/WebP) and size checks, busy state and server error display.
   - `InterestPicker.jsx` (built here, reused for students in Stage 3): toggle chips over `GET /api/auth/interests/` with `aria-pressed`; `InterestTags.jsx`: read-only chips with optional `+N` overflow.
   - Club Detail edit form: removed the obsolete `logo` from the `PATCH` payload; logo upload/remove saves immediately via `clubsAPI.uploadLogo / deleteLogo`; club interests edited with `InterestPicker` and saved via `clubsAPI.update` (`description`, `contact_email`, `interests`); Cancel now resets unsaved edits.
   - Interest tags on Explore Clubs cards (max 3, `+N`) and in the Club Detail "About" view.
   - `AuthContext.refreshUser()`: re-fetches `/api/auth/me/` after a logo change so `user.club.logo` stays current.
   - `OperatorEventForm.jsx`: banner field (16:9, ≤ 5 MB). Edit mode uploads/removes immediately; create mode holds the file with a local preview and uploads it right after the draft is created (on upload failure the draft is kept and the operator is sent to its edit page). Disabled with a reason for cancelled/ended events. The live preview card shows the banner.
   - `utils/banner.js` `bannerStyle(url, tone)`: paints the banner with a readability tint over the existing gradient covers on EventDetail and ExploreEvents (spotlight and cards); the gradient remains the placeholder when `banner` is `null`.
   - OperatorEvents rows: 16:9 banner thumbnail with placeholder (hidden on mobile).
   - **Navbar — operator club profile access (found during browser QA):** operators had no route to their own club page (where the edit form lives). The operator's name/avatar in the navbar now links to `/clubs/:slug` ("View club profile", avatar shows the club logo), the mobile menu has a "Club Profile" link, and on the own club page that link is highlighted instead of "Explore Clubs".
   - **AuthContext login fix (found during browser QA):** `POST /api/auth/login/` returns the user without `club`; only `/api/auth/me/` includes it. Operators now load `/api/auth/me/` after login, so `user.club` is available immediately (previously the Edit Profile button, the navbar club link, OperatorMembers and the collaboration modal's own-club exclusion only worked after a page reload).

3. [x] **Stage 3: Student Interests & Profile**
   - `InterestPicker.jsx` (built in Stage 2) reused for students.
   - `Profile.jsx` at `/profile` (student only, `ProtectedRoute allowedRoles={["student"]}`): read-only account details from `/api/auth/me/` (name, Student ID, email, department, batch) and an interests editor loaded with `interestsAPI.getMine()` and saved with `interestsAPI.setMine()`; selected count, "Clear all", "Discard changes", Save enabled only when the selection changed, success/error messages, retry on load failure.
   - `InterestsPrompt.jsx`: skippable "Choose your interests" card. `Dashboard.jsx` calls `dashboardAPI.student()` for students and shows it when `has_interests` is `false`; "Skip for now" is remembered per student in `localStorage` (`jnuverse:interests-prompt-dismissed:<user id>`); saving shows a confirmation with a link back to the profile.
   - Navbar: a student's name/avatar links to `/profile` (highlighted there); mobile menu "My Profile" link. Operators keep the club profile link from Stage 2.

4. [ ] **Stage 4: Student Dashboard (`Dashboard.jsx`)**
   - Rebuilt on `GET /api/dashboard/student/` following the Stitch "Living Campus" design.
   - Six count cards: clubs followed, clubs joined, pending membership requests, unread notifications, upcoming registered events, events to rate.
   - Sections: "Your next events" (up to 5), "Rate your recent events" (opens the existing `StarRating` flow), "Suggested clubs" (with Follow).
   - Empty states: interests prompt when `has_interests` is `false`; "You're all caught up" when there are interests but no suggestions.

5. [ ] **Stage 5: Club Operator Dashboard (`OperatorDashboard.jsx`)**
   - Built on `GET /api/dashboard/club/` following the Stitch operator dashboard design.
   - Count cards linking to management screens: members and pending requests → `/operator/members`; upcoming and draft events → `/operator/events`; pending collaborations → `/operator/collaborations`; followers; unread notifications.
   - Club rating (average + count), registrations in the last 7 days, next events and recent ended events with ratings.
   - `/` and `/dashboard` render the student or operator dashboard by role.

6. [ ] **Stage 6: Content Reports (`ReportModal`, `/my-reports`)**
   - `ReportModal.jsx`: reason selector, details textarea (required for `other`, 1000-character counter), focus trap, Escape to close.
   - "Report" action on ClubDetail and EventDetail for logged-in users; hidden for the operator's own club and its events.
   - `409` shown as "You have already reported this."; `400` field errors shown next to their fields.
   - `MyReports.jsx` at `/my-reports` (both roles) with status badges and a Navbar link.

7. [ ] **Stage 7: Final Quality Gates & Regression Audit**
   - `npm run lint`, `npm run build`, non-mutating API smoke tests, demo-account verification (Section 14).
   - Update `FRONTEND_README.md` (Week 7 section and status matrix) and this document's verification and readiness sections.

---

## 4. Backend Dependencies & Endpoint Contracts

All endpoints use the shared Axios client with automatic Bearer token authentication and trailing-slash URLs.

### 4.1 Interests API (`interestsAPI`)

| Method | Endpoint | HTTP | Description | Request Body / Params | Response Data | Status Codes | Permissions |
|---|---|:---:|---|---|---|:---:|:---:|
| `getAll` | `/api/auth/interests/` | `GET` | List the 13 interests (sorted by name) | None | `{ "interests": [ { "id", "name" } ] }` | `200 OK` | Public (`AllowAny`) |
| `getMine` | `/api/auth/me/interests/` | `GET` | Student's current interests | None | `{ "interests": [ ... ] }` | `200 OK`<br>`401` (anon)<br>`403` (operator) | Student only |
| `setMine` | `/api/auth/me/interests/` | `PUT` | Replace the whole selection (`[]` clears) | `{ "interests": ["uuid", ...] }` | `{ "interests": [ ... ] }` | `200 OK`<br>`400` (unknown id / not a list)<br>`401`<br>`403` | Student only |

### 4.2 Club Profile & Image APIs (`clubsAPI`, `eventsAPI`)

| Method | Endpoint | HTTP | Description | Request Body / Params | Response Data | Status Codes | Permissions |
|---|---|:---:|---|---|---|:---:|:---:|
| `clubsAPI.update` | `/api/clubs/:slug/` | `PATCH` | Update description, contact email, interests | `{ "description", "contact_email", "interests": ["uuid"] }` (`logo` is **ignored**) | `Club` object | `200 OK`<br>`400` (validation)<br>`401`<br>`403` | Owning Club Operator only |
| `clubsAPI.uploadLogo` | `/api/clubs/:slug/logo/` | `PUT` | Upload or replace club logo | `multipart/form-data`, field `logo` (JPEG/PNG/WebP, ≤ 2 MB) | `Club` object with new `logo` URL | `200 OK`<br>`400` (invalid file)<br>`401`<br>`403`<br>`404` | Owning Club Operator only |
| `clubsAPI.deleteLogo` | `/api/clubs/:slug/logo/` | `DELETE` | Remove club logo (idempotent) | None | No content | `204`<br>`401`<br>`403` | Owning Club Operator only |
| `eventsAPI.uploadBanner` | `/api/events/:id/banner/` | `PUT` | Upload or replace event banner | `multipart/form-data`, field `banner` (JPEG/PNG/WebP, ≤ 5 MB) | `Event` object with new `banner` URL | `200 OK`<br>`400`<br>`401`<br>`403`<br>`404`<br>`409` (cancelled/ended) | Owning Club Operator only |
| `eventsAPI.deleteBanner` | `/api/events/:id/banner/` | `DELETE` | Remove event banner | None | No content | `204`<br>`401`<br>`403`<br>`404` | Owning Club Operator only |

#### Object Changes (affect every club and event screen):
- `Club.interests`: `[ { "id", "name" } ]` (empty list when none).
- `Club.logo`: `string | null` (was `""` when empty). `Event.banner`: `string | null`.
- Replacing an image changes its URL — always use the URL from the response.

### 4.3 Content Reports API (`reportsAPI`)

| Method | Endpoint | HTTP | Description | Request Body / Params | Response Data | Status Codes | Permissions |
|---|---|:---:|---|---|---|:---:|:---:|
| `create` | `/api/reports/` | `POST` | Report a club or an event | `{ "target_type": "club" \| "event", "target": "slug or event uuid", "reason": "inappropriate" \| "spam" \| "misleading" \| "harassment" \| "other", "details": "optional (≤ 1000)" }` | `Report` object | `201 Created`<br>`400` (validation / own target / draft)<br>`401`<br>`409` (already reported) | Any logged-in user |
| `getMine` | `/api/reports/` | `GET` | List own reports, newest first | `params: { page, page_size }` | Paginated `{ count, next, previous, results: [ Report ] }` | `200 OK`<br>`401` | Any logged-in user |

#### Report Object Structure:
```json
{
  "id": "uuid",
  "target_type": "club",
  "club": { "id": "uuid", "name": "[DEMO] Sports Club", "slug": "demo-sports-club" },
  "event": null,
  "reason": "spam",
  "details": "optional text",
  "status": "open",
  "created_at": "2026-11-20T10:00:00+06:00"
}
```
For event reports `club` is `null` and `event` is `{ "id", "title" }`. Status labels: `open` → "Received", `under_review` → "Under review", `resolved` → "Resolved", `dismissed` → "Dismissed".

### 4.4 Dashboard API (`dashboardAPI`)

| Method | Endpoint | HTTP | Description | Request Body / Params | Response Data | Status Codes | Permissions |
|---|---|:---:|---|---|---|:---:|:---:|
| `student` | `/api/dashboard/student/` | `GET` | Student dashboard in one call | None | See structure below | `200 OK`<br>`401`<br>`403` (operator) | Student only |
| `club` | `/api/dashboard/club/` | `GET` | Club operator dashboard in one call | None | See structure below | `200 OK`<br>`401`<br>`403` (student) | Club Operator only |

#### Student Dashboard Structure:
```json
{
  "has_interests": true,
  "counts": { "clubs_followed": 2, "clubs_joined": 2, "pending_membership_requests": 1,
              "unread_notifications": 8, "events_registered_upcoming": 4, "events_to_rate": 2 },
  "next_events": [ "Event", "..." ],
  "rating_prompts": [ "Event", "..." ],
  "suggested_clubs": [ "Club", "..." ]
}
```

#### Club Dashboard Structure:
```json
{
  "club": { "id": "uuid", "name": "[DEMO] Robotics Club", "slug": "demo-robotics-club" },
  "counts": { "followers": 2, "members": 2, "pending_membership_requests": 1, "upcoming_events": 2,
              "draft_events": 0, "pending_collaboration_requests": 1, "unread_notifications": 4 },
  "ratings": { "average": 4.2, "count": 5 },
  "next_events": [ "Event", "..." ],
  "recent_events": [ "Event", "..." ],
  "registrations_last_7_days": 9
}
```

---

## 5. Backend Business Rules & Enforcement

### 5.1 Interests
1. **Shared Fixed List:** Students and clubs choose from the same 13 interests; there is no maximum.
2. **Replace Semantics:** `PUT /api/auth/me/interests/` and `PATCH /api/clubs/:slug/` replace the whole selection; `[]` clears it.
3. **Suggestions:** Suggested clubs share at least one interest with the student and exclude clubs already followed, joined or requested; ordered by shared interests, then followers, then name.

### 5.2 Club Logos & Event Banners
1. **Dedicated Endpoints:** Logos and banners are uploaded only through their own endpoints; `PATCH` ignores `logo`/`banner`.
2. **File Rules:** JPEG, PNG or WebP (checked on file contents), logo ≤ 2 MB, banner ≤ 5 MB, ≤ 4096 px on the longest side.
3. **Event State:** Banners can be changed for draft and published events; cancelled or ended events return `409`.
4. **Axios FormData Handling:** The shared Axios instance defaults to `Content-Type: application/json`, and Axios 1.20 converts `FormData` to JSON when that header is set. Upload calls must override the header with `multipart/form-data` so the file is sent as multipart.

### 5.3 Content Reports
1. **Targets:** Clubs (by slug) and published or cancelled events (by id); drafts cannot be reported.
2. **Own Content:** A club operator cannot report their own club or its events (`400`).
3. **One Report per Target:** A second report by the same user returns `409`; reports cannot be edited or withdrawn.
4. **Details:** Required when `reason` is `other`; at most 1000 characters.
5. **Privacy:** Users see only their own reports; reported clubs never see reports; no notifications are sent.

### 5.4 Dashboards
1. **Student `next_events`:** Up to 5 registered, published, not-yet-ended events, soonest first.
2. **Student `rating_prompts`:** Up to 5 events still ratable (ended within 7 days, not yet rated); `counts.events_to_rate` is the total.
3. **Club `recent_events`:** Up to 5 most recently ended published events with `average_rating` and `rating_count`.
4. **Club `ratings`:** Club-wide average (1 decimal, `null` when none) and total count; individual ratings are never exposed.
5. **`registrations_last_7_days`:** Registrations for the club's events in the last 7 days, excluding cancelled registrations.

---

## 6. Files to Be Created & Modified

### Planned New Files
- `frontend/src/components/ClubLogo.jsx` *(created, Stage 2)*
- `frontend/src/components/InterestPicker.jsx` *(created, Stage 2)*
- `frontend/src/components/InterestTags.jsx` *(created, Stage 2)*
- `frontend/src/components/ImageUploadField.jsx` *(created, Stage 2)*
- `frontend/src/utils/banner.js` *(created, Stage 2)*
- `frontend/src/components/ReportModal.jsx`
- `frontend/src/pages/OperatorDashboard.jsx`
- `frontend/src/pages/Profile.jsx` *(created, Stage 3)*
- `frontend/src/components/InterestsPrompt.jsx` *(created, Stage 3)*
- `frontend/src/pages/MyReports.jsx`

### Planned Modified Files
- `frontend/src/services/api.js`
- `frontend/src/App.jsx` (routes `/profile`, `/my-reports`, role-based dashboard)
- `frontend/src/components/Navbar.jsx` (Profile and My Reports links)
- `frontend/src/pages/Dashboard.jsx`, `ClubDetail.jsx`, `EventDetail.jsx`, `ExploreClubs.jsx`, `ExploreEvents.jsx`, `MyClubs.jsx`, `OperatorEventForm.jsx`, `OperatorEvents.jsx`, `OperatorMembers.jsx`, `OperatorCollaborations.jsx`
- `frontend/src/components/PartnerClubsSection.jsx`, `ProposeCollaborationModal.jsx`
- `frontend/FRONTEND_README.md`

---

## 7. Acceptance Criteria (Week 7)

- [ ] All Week 7 API methods implemented in `api.js` using the shared Axios instance and trailing-slash URLs.
- [ ] Logo and banner upload/remove work and the UI updates from the server response; invalid files show the server message.
- [ ] Every club and event screen renders the logo/banner or a placeholder when `null`.
- [ ] Students can set, change and clear interests; club operators can set club interests.
- [ ] Student Dashboard and Club Operator Dashboard show the demo figures in Section 14 and link to the correct management screens.
- [ ] Reports cannot be submitted for one's own club or events; duplicates show a clear message; My Reports shows correct status labels.
- [ ] No backend files modified; no new package dependencies.
- [ ] ESLint 0 errors, 0 warnings; Vite production build passes.

---

## 8. Stage 1 Verification Results

Smoke tests ran with a Node script using the frontend's installed Axios 1.20 and the same default `Content-Type: application/json` header as the shared instance, against the local backend (`http://127.0.0.1:8000`).

| Verification Check | Command / Request | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | Clean across `api.js`. |
| **Production Build** | `npm run build` | **PASS (built in 1.16s)** | Bundle-size warning only (unchanged). |
| **Interest List** | `GET /api/auth/interests/` | **PASS (200 OK)** | 13 interests. |
| **Student Interests** | `GET /api/auth/me/interests/` (demo1 / democlub1) | **PASS (200 / 403)** | demo1: Cultural, Photography; operator correctly refused. |
| **Student Dashboard** | `GET /api/dashboard/student/` (demo1 / democlub1) | **PASS (200 / 403)** | Structure matches contract; see demo-data note below. |
| **Club Dashboard** | `GET /api/dashboard/club/` (democlub1) | **PASS (200 OK)** | followers 2, members 2, pending 1, collab pending 1, rating 4.2 (5). |
| **My Reports** | `GET /api/reports/` (demo1 / anonymous) | **PASS (200 / 401)** | 3 reports: open, under_review, resolved. |
| **Own-Club Report Guard** | `POST /api/reports/` (democlub1 → own club) | **PASS (400)** | "You cannot report your own club or its events." |
| **Duplicate Report Guard** | `POST /api/reports/` (demo1 → Sports Club again) | **PASS (409)** | Already reported. |
| **Upload without override** | `PUT /api/clubs/demo-robotics-club/logo/` with default JSON header | **415 (expected failure)** | Confirms Axios converts `FormData` to JSON; override is required. |
| **Upload with override (`putImage`)** | same request with `multipart/form-data` | **PASS (200 OK)** | Club object returned with new `logo` URL. |
| **Logo Removal (restore)** | `DELETE /api/clubs/demo-robotics-club/logo/` | **PASS (204)** | Logo back to `null`; demo data unchanged. |

**Demo-data drift:** time-based figures have expired in the local database (student `events_registered_upcoming` 0 and `events_to_rate` 0, club `upcoming_events` 0 and `registrations_last_7_days` 0, versus 4 / 2 / 2 / 9 in the handoff). Re-seed before browser QA of Stages 4–5.

---

## 9. Acceptance Criteria (Stage 1)

- [x] `interestsAPI`, `reportsAPI` and `dashboardAPI` implemented in `frontend/src/services/api.js` matching the Week 7 handoff.
- [x] `clubsAPI.update / uploadLogo / deleteLogo` and `eventsAPI.uploadBanner / deleteBanner` implemented.
- [x] Image uploads override the JSON default header; verified live (415 without, 200 with).
- [x] Uses the shared Axios instance with Bearer token injection and 401 refresh queue; trailing-slash URLs respected.
- [x] No backend files modified; no new dependencies.
- [x] ESLint and Vite production build pass.

---

## 10. Stage 2 Verification Results

| Verification Check | Command / Method | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | All new components and modified pages. |
| **Production Build** | `npm run build` | **PASS (built in 1.08s)** | Bundle-size warning only (unchanged). |
| **Obsolete Logo Field** | Source inspection of `ClubDetail.jsx` | **PASS** | `logo` no longer sent in `PATCH /api/clubs/:slug/`. |
| **Club Update Contract** | Backend `ClubUpdateSerializer` inspection | **PASS** | Accepts `description`, `contact_email`, `interests` (list of interest UUIDs). |
| **Upload Transport** | Stage 1 live test of `putImage` | **PASS** | Multipart override verified (415 without, 200 with). |
| **Login Response Shape** | `POST /api/auth/login/` (democlub1) | **CONFIRMED** | `user` keys: id, email, student_id, name, department, batch, role — no `club`; fixed by loading `/api/auth/me/` for operators. |
| **Operator Navigation** | Browser (democlub1) | **PASS (user confirmed)** | Club profile reachable from the navbar; "Explore Clubs" no longer highlighted on the own club page. |
| **Live Upload / Interest Save from the UI** | — | **NOT RUN** | The local backend uses the shared Supabase database; write tests are left for manual QA with the team's agreement. |

---

## 11. Acceptance Criteria (Stage 2)

- [x] Club logo upload, replace and remove available to the owning operator only (inside the operator edit form).
- [x] Club interests editable by the owning operator and shown as tags on cards and the profile.
- [x] Event banner upload/remove in the event form, including create mode; disabled for cancelled/ended events.
- [x] Logos and banners displayed with placeholders when `null` or when the image fails to load.
- [x] Operators can reach their own club profile from the navbar, immediately after login.
- [x] No backend files modified; no new dependencies; ESLint and Vite build pass.
- [ ] Manual browser QA of uploads and interest saving (Section 14).

---

## 12. Stage 3 Verification Results

| Verification Check | Command / Request | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | `Profile.jsx`, `InterestsPrompt.jsx`, `Dashboard.jsx`, `Navbar.jsx`, `App.jsx`. |
| **Production Build** | `npm run build` | **PASS (built in 1.04s)** | Bundle-size warning only (unchanged). |
| **Prompt Trigger Data** | `GET /api/dashboard/student/` (demo1–demo5) | **PASS (200 OK)** | `has_interests: false` for demo2 and demo4 (prompt shown); `true` for demo1, demo3, demo5. |
| **Suggestions from Interests** | same request | **PASS** | demo3 → Sports Club; demo5 → Robotics Club, Cultural Forum, Debate Society; demo1 → none ("all caught up"). |
| **Interests RBAC** | `GET /api/auth/me/interests/` (operator / anonymous) | **PASS (403 / 401)** | `/profile` is student-only in the router as well. |
| **Saving Interests from the UI** | — | **NOT RUN** | Writes to the shared Supabase database; covered by manual QA (Section 14). |

---

## 13. Acceptance Criteria (Stage 3)

- [x] Students can view their verified account details and set, change and clear interests on `/profile`.
- [x] The dashboard shows a skippable interests prompt only when `has_interests` is `false`.
- [x] Students reach `/profile` from the navbar (desktop and mobile).
- [x] No backend files modified; no new dependencies; ESLint and Vite build pass.
- [ ] Manual browser QA of saving and clearing interests (Section 14).

---

## 14. Manual Interactive Browser QA Checklist

Demo accounts use the password `Demo-Pass-12345`. Demo dates drift; ask the backend developer to re-seed if figures differ.

### Student Dashboard & Interests
- [ ] `demo1@demo.jnuverse.test`: counts show followed 2, joined 2, pending 1, unread 8, upcoming registered 4, events to rate 2; suggestions show "You're all caught up".
- [ ] `demo3@demo.jnuverse.test`: one suggestion, `[DEMO] Sports Club`.
- [ ] `demo4@demo.jnuverse.test`: "Choose your interests" prompt appears; choosing interests updates suggestions.
- [ ] `demo5@demo.jnuverse.test`: suggestions in order Robotics Club, Cultural Forum, Debate Society.
- [ ] Rating prompt opens the star rating and the count decreases after rating.
- [ ] `/profile`: change and clear interests; reload confirms persistence.

### Club Operator Dashboard, Logos & Banners
- [ ] `democlub1@demo.jnuverse.test`: followers 2, members 2, pending requests 1, upcoming events 2, drafts 0, pending collaborations 1, rating 4.2 (5 ratings), 3 recent events, 9 registrations in the last 7 days.
- [ ] Count cards navigate to Members, Events and Collaborations.
- [ ] Upload a logo (valid PNG), replace it, remove it; try a file over 2 MB and a non-image file.
- [ ] Set club interests and confirm tags on the club profile and Explore Clubs card.
- [ ] Upload a banner on a draft event; verify it on the event page and cards; verify banner controls are hidden on a cancelled event.

### Content Reports
- [ ] `demo1@demo.jnuverse.test` → `/my-reports`: 3 reports with "Received", "Under review" and "Resolved".
- [ ] `demo2@demo.jnuverse.test` → `/my-reports`: 1 "Dismissed" report.
- [ ] Report a new club with reason `other` and empty details: field error shown.
- [ ] Report the same club again: "You have already reported this."
- [ ] As `democlub1`, the Report action is hidden on the Robotics Club page and its events.

---

## 15. Week 7 Readiness Classification

* **Implementation:** Stages 1–3 of 7 complete (API services; logos, banners and club interests; student profile and interests prompt).
* **Backend Dependencies:** All Week 7 endpoints completed and verified by the backend (181 tests passing).
* **Verification:** Stage 1 verified (lint, build, live API smoke tests); Stages 2–3 verified at source, build and read-only API level, browser QA pending. Remaining stages pending.
* **Demo Data:** Local time-based demo figures have expired; re-seed required before dashboard browser QA.
