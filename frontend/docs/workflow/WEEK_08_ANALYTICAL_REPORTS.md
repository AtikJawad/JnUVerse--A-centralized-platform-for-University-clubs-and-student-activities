# Week 08 — Five Analytical Reports

**Focus:** Event attendance marking and the five analytical reports (department participation, post-event rating, club vs club, student activity, club's own report)  
**Status:** **In Progress — Stage 1 Completed (API Services Foundation Verified)**  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  
**Backend Reference:** Atik Jawad / Claude (`WEEK_08_BACKEND_HANDOFF.md`; five `/api/analytics/` endpoints and `PUT /api/events/{id}/attendance/`, OpenAPI in `docs/api/openapi.yml`) — the earlier draft of this file listed endpoints that do not exist (`/api/analytics/club-popularity/`, `event-utilization/`, …); the handoff is the source of truth.  
**Design Reference:** The Stitch export has no analytics screens. Operator reports follow Stitch `jnuverse_club_operator_dashboard_minimal_redesign` (hairline metric rows, minimal lists) and `jnuverse_reports_interface` (summary strip, table styling); the student report follows `jnuverse_student_dashboard_living_campus_experience`; charts follow `jnuverse/DESIGN.md` tokens.  
**Target:** December 2026  

---

## 1. Objectives

- Let club operators mark which registered students attended an event (needed by reports 1, 3, 4 and 5).
- Present the five team-selected reports with charts, tables and date filters:
  1. Department-wise participation for one event.
  2. Post-event rating for one event.
  3. Club vs club comparison.
  4. Student activity (the student's own).
  5. A club's own report with monthly trend and per-event table.

---

## 2. Scope & Exclusions

- **In Scope:**
  - `analyticsAPI` and `eventsAPI.setAttendance` in `frontend/src/services/api.js`.
  - Attendance checkboxes on `OperatorEventAttendees.jsx`.
  - Reusable, dependency-free SVG chart components (bar, column, line) with accessible table fallbacks.
  - Operator analytics hub `/operator/analytics` (reports 3 and 5), per-event report page `/operator/events/:id/analytics` (reports 1 and 2), student report `/my-activity` (report 4).
  - Navigation links, empty / "not available yet" (409) states and "—" for `null` percentages.
- **Exclusions:**
  - CSV/PDF export (not requested by the backend contract).
  - New chart libraries (project rule: no unapproved dependencies; charts are hand-built SVG).
  - Backend changes or new metrics.

---

## 3. Implementation Stages & Progress

1. [x] **Stage 1: API Services Foundation (`analyticsAPI`, attendance)**
   - `analyticsAPI.departmentParticipation(eventId)`, `postEventRatings(eventId)`, `clubComparison({ date_from, date_to })`, `studentActivity()`, `myClub({ date_from, date_to })`; empty date filters are dropped (`cleanPeriod`) so the backend treats them as "no filter".
   - `eventsAPI.setAttendance(eventId, registrationIds)` → `PUT /api/events/:id/attendance/` with `{ registration_ids }`.
   - `utils/format.js`: `formatPercent` (66.7 → "66.7%", `null` → "—"), `formatRating`, `formatCount`, `formatMonth` ("2026-11" → "Nov 2026"), `formatDhakaDate`.
   - Validated against ESLint, Vite build and read-only API smoke tests (Section 10).

2. [ ] **Stage 2: Attendance Marking (`OperatorEventAttendees.jsx`)**
   - Load all registration pages (now include `attended`); checkbox per row, "Mark all / Clear all", Save sends the **full** attended set; "N of M attended" summary from the `{ registered, attended }` response.
   - Disabled with a reason for drafts, cancelled events and events that have not started (`409` rules); `400` unknown-id errors shown.

3. [ ] **Stage 3: Chart Components**
   - `components/charts/`: horizontal `BarChart` (departments, clubs), `ColumnChart` (rating distribution 1–5), `LineChart` (monthly trend), `MetricRow` (Stitch hairline metrics).
   - SVG with DESIGN.md colors, readable labels, value labels, and an accessible data table / `aria-label` summary for every chart; empty-data handling.

4. [ ] **Stage 4: Operator Analytics Hub (`/operator/analytics`)**
   - **My Club report (report 5):** summary metrics (events launched / cancelled / completed, registrations, registration rate, attended, attendance rate, average rating, followers, members), monthly trend line chart, per-event comparison table (fill rate, attendance rate, rating; links to per-event reports), best-rated event.
   - **Club vs club (report 3):** table of all clubs with the operator's own row highlighted (`is_mine`), most events first; optional bar chart of attendance rate.
   - Shared date filter (`date_from` / `date_to`, start-date based) with `400` error display; Navbar "Analytics" link for operators.

5. [ ] **Stage 5: Per-Event Reports (`/operator/events/:id/analytics`)**
   - **Department participation (report 1):** totals (registered, attended, attendance rate) and a bar chart of `attended` per department with a table (registered, attended, attendance rate, share of attended). Available only for ended, published events — `409` shown as "Available after the event ends".
   - **Post-event rating (report 2):** average, total ratings, response rate and a 1–5 distribution column chart. Published events only.
   - Entry points: OperatorEvents rows, the attendees page, the operator dashboard's recent events and the My Club per-event table.

6. [ ] **Stage 6: Student Activity (`/my-activity`)**
   - Activity score (`clubs_joined + events_attended + ratings_given`) with its breakdown, clubs joined/followed, events registered/attended, attendance rate, ratings given, following the Stitch student dashboard style; links from the Profile page and Navbar.

7. [ ] **Stage 7: Final Quality Gates & Regression Audit**
   - `npm run lint`, `npm run build`, read-only API role matrix, demo-data verification (Section 7), README and readiness updates.

---

## 4. Backend Dependencies & Endpoint Contracts

All endpoints are `GET` with JWT unless noted. Percentages have one decimal or are `null` (show "—"); ratings are 1–5.

### 4.1 Attendance

| Method | Endpoint | HTTP | Request | Response | Status Codes | Permissions |
|---|---|:---:|---|---|:---:|:---:|
| `eventsAPI.setAttendance` | `/api/events/:id/attendance/` | `PUT` | `{ "registration_ids": ["uuid", ...] }` — replaces the attended set (`[]` clears) | `{ "registered": 12, "attended": 9 }` | `200`<br>`400` (id not a current registration)<br>`403`<br>`404`<br>`409` (not published / not started) | Owning Club Operator |
| `eventsAPI.getRegistrations` | `/api/events/:id/registrations/` | `GET` | `page`, `page_size` | Rows now include `attended` | `200`<br>`403`<br>`404` | Owning Club Operator |

### 4.2 Analytics (`analyticsAPI`)

| Method | Endpoint | Params | Key Response Fields | Status Codes | Permissions |
|---|---|---|---|:---:|:---:|
| `departmentParticipation` | `/api/analytics/events/:id/department-participation/` | — | `event`, `totals { registered, attended, attendance_rate }`, `departments [ { department, registered, attended, attendance_rate, share_of_attended } ]` (most attended first) | `200`<br>`403`<br>`404`<br>`409` (not published or not ended) | Owning Club Operator |
| `postEventRatings` | `/api/analytics/events/:id/ratings/` | — | `event`, `total_ratings`, `average`, `attended`, `response_rate`, `distribution` (always 5 rows: `rating`, `count`, `percent`) | `200`<br>`403`<br>`404`<br>`409` (not published) | Owning Club Operator |
| `clubComparison` | `/api/analytics/club-comparison/` | `date_from`, `date_to` (optional, `YYYY-MM-DD`, start date) | `period`, `clubs [ { club, is_mine, events_launched, cancelled_events, completed_events, registrations, registration_rate, attended, attendance_rate, average_rating, rating_count } ]` | `200`<br>`400` (bad date / range)<br>`401`<br>`403` | Any Club Operator |
| `studentActivity` | `/api/analytics/student-activity/` | — | `clubs_joined`, `clubs_followed`, `events_registered`, `events_attended`, `attendance_rate`, `ratings_given`, `activity_score` | `200`<br>`401`<br>`403` | Student |
| `myClub` | `/api/analytics/my-club/` | `date_from`, `date_to` | `club`, `period`, `summary { … }`, `monthly [ { month, events_launched, registrations, attended, average_rating } ]` (oldest first), `events [ { id, title, starts_at, status, is_completed, capacity, registered, fill_rate, attended, attendance_rate, average_rating, rating_count } ]`, `best_rated_event` (or `null`) | `200`<br>`400`<br>`401`<br>`403` | Club Operator (own club) |

---

## 5. Backend Business Rules & Definitions

1. **Launched event:** published or cancelled (drafts excluded). Cancelled events count as launched but not in registrations, attendance or ratings.
2. **Completed event:** published and already ended.
3. **Registration rate:** registrations ÷ total capacity, only over events that have a capacity.
4. **Attendance rate:** attended ÷ registered, only over completed events (per-event `attendance_rate` is `null` until the event ends).
5. **Average rating:** average of all ratings given (not an average of per-event averages).
6. **Activity score:** `clubs_joined + events_attended + ratings_given` (approved memberships only).
7. **Attendance marking:** owning operator only; published events that have started; the request replaces the whole attended set among current registrations.

---

## 6. Files to Be Created & Modified

### Planned New Files
- `frontend/src/components/charts/BarChart.jsx`, `ColumnChart.jsx`, `LineChart.jsx`, `MetricRow.jsx`
- `frontend/src/utils/format.js` (percent / rating / month formatters)
- `frontend/src/pages/OperatorAnalytics.jsx`
- `frontend/src/pages/OperatorEventAnalytics.jsx`
- `frontend/src/pages/MyActivity.jsx`

### Planned Modified Files
- `frontend/src/services/api.js`
- `frontend/src/App.jsx` (routes `/operator/analytics`, `/operator/events/:id/analytics`, `/my-activity`)
- `frontend/src/components/Navbar.jsx` (Analytics link for operators, My Activity for students)
- `frontend/src/pages/OperatorEventAttendees.jsx`, `OperatorEvents.jsx`, `OperatorDashboard.jsx`, `Profile.jsx`
- `frontend/FRONTEND_README.md`

---

## 7. Demo Data Status (checked 2026-11-28, read-only)

| Report | Current result (democlub1 / demo1) | Note |
|---|---|---|
| My Club | 5 launched, 5 completed, 9 registrations, registration rate 6.4 %, attended 0, rating 4.2 (5); months 2026-10 and 2026-11; best rated: Rated Workshop 4.3 (3) | Attendance not seeded |
| Club vs club | 7 clubs; Robotics marked `is_mine` | — |
| Student activity (demo1) | joined 2, followed 3, registered 9, attended 0, rate 0.0 %, ratings 1, score 3 | — |
| Department participation (Rated Workshop) | 4 registered, 0 attended; one department (Bangla) | All demo students are in Bangla |
| Post-event rating (Rated Workshop) | 3 ratings, average 4.3, response rate `null`, distribution 4★ ×2, 5★ ×1 | Response rate needs attendance |

The seed does not mark attendance, so attendance-based figures stay at 0 until attendance is marked (Stage 2) on the shared database or the seed is extended by the backend developer. All demo students belong to one department, so the department chart shows a single bar with demo data.

---

## 8. Acceptance Criteria (Week 8)

- [ ] Operators can mark attendance for started, published events; the attended set is replaced as a whole and counts update.
- [ ] All five reports render from the backend with charts and tables; `null` percentages show "—".
- [ ] Date filters work for reports 3 and 5 and show the `400` message for invalid ranges.
- [ ] Per-event reports show a friendly message for `409` (event not ended / not published).
- [ ] Each report is reachable from navigation and the relevant management screens; role restrictions match the backend.
- [ ] No backend files modified; no new dependencies; ESLint and Vite build pass.

---

## 9. Decisions

- **Charts are hand-built SVG components** (no chart library), consistent with the project's no-new-dependency rule and the earlier question in this file ("lightweight SVG graphs or styled tabular summaries?"): both — every chart has a table alongside it.
- **Placement:** operator reports live under `/operator/analytics` and `/operator/events/:id/analytics`; the student report lives at `/my-activity`.
- **Design:** no Stitch analytics screens exist; the operator pages reuse the Stitch operator-dashboard and reports-interface patterns, and the student page reuses the Stitch student-dashboard patterns.

---

## 10. Stage 1 Verification Results

Smoke tests used a Node script with the frontend's Axios 1.20 and the same default headers as the shared instance, against the local backend. Only read requests and one request the backend refuses before writing (403) were sent.

| Verification Check | Request | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | `api.js`, `utils/format.js`. |
| **Production Build** | `npm run build` | **PASS (built in 1.23s)** | Bundle-size warning only (unchanged). |
| **My Club Report** | `GET /api/analytics/my-club/` (democlub1) | **PASS (200)** | 5 events, 2 months; with `date_from=2026-11-01` and an empty `date_to` → 200. |
| **Invalid Date Filters** | `date_from > date_to`; `date_from=nope` | **PASS (400 / 400)** | `{"date_to": ["date_to must not be before date_from."]}`; `{"date_from": ["Date has wrong format. …"]}`. |
| **Club Comparison** | operator / student | **PASS (200 / 403)** | — |
| **Student Activity** | student / operator | **PASS (200 / 403)** | — |
| **Per-Event Reports** | department participation and ratings for Rated Workshop (operator); department participation as student | **PASS (200 / 200 / 403)** | — |
| **Attendance Permission** | `PUT /api/events/:id/attendance/` on JnU Research Society's event as democlub1 | **PASS (403)** | "Only this club's operator can mark attendance." — refused before any write. |
| **Registrations Include `attended`** | `GET /api/events/:id/registrations/` (Rated Workshop) | **PASS (200)** | 4 rows, all `attended: false` (attendance not seeded). |

---

## 11. Acceptance Criteria (Stage 1)

- [x] `analyticsAPI` (five reports) and `eventsAPI.setAttendance` implemented in `api.js` matching the Week 8 handoff.
- [x] Shared formatters show "—" for `null` percentages and ratings.
- [x] Uses the shared Axios instance with Bearer token injection and 401 refresh queue; trailing-slash URLs respected.
- [x] No backend files modified; no new dependencies; ESLint and Vite build pass.

---

## 12. Week 8 Readiness Classification

* **Implementation:** Stage 1 of 7 complete (API services foundation).
* **Verification:** Stage 1 verified (lint, build, read-only API smoke tests). Remaining stages pending.
* **Demo Data:** Attendance is not seeded; attendance-based figures stay at 0 until attendance is marked or the seed is extended.
