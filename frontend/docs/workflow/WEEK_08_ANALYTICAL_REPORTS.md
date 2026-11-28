# Week 08 — Five Analytical Reports

**Focus:** Event attendance marking and the five analytical reports (department participation, post-event rating, club vs club, student activity, club's own report)  
**Status:** **In Progress — Stages 1–6 Completed (Stages 2–6 Source & Build Verified; Browser QA Pending)**  
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

2. [x] **Stage 2: Attendance Marking (`OperatorEventAttendees.jsx`)**
   - All registration pages are loaded once (`fetchAllPages`) to build the saved attended set; a draft set is edited across the paginated roster, so Save always sends the **full** attended set as the backend requires.
   - The "Status" column (always "Registered") became an **Attended** column: a DESIGN.md checkbox (20px, primary fill) with "Attended" / "Absent" label on desktop and mobile; a read-only "Attended" badge / "Not marked" text when attendance cannot be marked.
   - Attendance toolbar: "N of M attended" pill, "Unsaved changes" hint, **Mark all**, **Clear all**, **Discard**, **Save Attendance** (enabled only when the draft differs); success message uses the `{ registered, attended }` response.
   - Locked with a reason for drafts, cancelled events and events that have not started yet (mirrors the backend `409` rules); `409` `detail` and `400` `registration_ids` messages are shown, and a `400` reloads the attendance set.
   - No Stitch screen exists for attendance; the existing roster layout (Week 4, Stitch member-management style) is kept.

3. [x] **Stage 3: Chart Components** (`components/charts/`, no chart library)
   - Built following the data-viz method (form → color job → validated palette → mark specs → hover layer → accessibility → render check):
     - `chartTheme.js`: validated palette and tokens — categorical slots `#444ED0`, `#E8692A`, `#00A383`; ordinal ramp `#9EA4F4 → #2F38BF` (rating 1★→5★); de-emphasis gray `#C6C5D6`; hairline grid `#E2E4F3`; text tokens `#181A2C` / `#686B7D`; `niceTicks()` with whole-number ticks for counts.
     - `ChartFrame.jsx`: card with title, subtitle, legend (only for ≥ 2 series; line keys for lines, swatches for bars) and a **Chart / Table** switch — every chart has a table-view twin. `ChartTooltip`: value first (strong), label second, rendered as text.
     - `BarChart.jsx`: ranked horizontal bars, 16px (≤ 24px cap), square at the baseline with a 4px rounded data end, value at the tip, one hue for a single series, **emphasis** mode (highlighted row in slot 1, others gray), focusable bars with tooltips.
     - `ColumnChart.jsx`: SVG columns ≤ 24px with a 4px rounded cap, value on the cap, hairline solid gridlines, whole-band hit areas, optional ordinal colors.
     - `LineChart.jsx`: one y-axis only (never dual-axis), 2px round lines, r=4 end dots with a 2px surface ring, end-value labels dropped when they would collide, crosshair snapping to the nearest x with one tooltip listing every series, ←/→ keyboard navigation.
     - `Figures.jsx`: `MetricRow` (Stitch operator-dashboard hairline metrics), `HeroFigure` (one ≥ 48px number per view), `SegmentedBar` (tall 28px, 4px corners, 2px surface gaps, amount inside only when it fits, legend always, tooltip on hover/focus; a zero part draws nothing).
     - `useChartWidth.js`: measures the card so SVG charts draw at real pixel size (labels stay 11px).
   - App is light-only, so only the light palette is defined.

4. [x] **Stage 4: Operator Analytics Hub (`/operator/analytics`)** — `OperatorAnalytics.jsx`
   - Layout follows the Stitch operator-dashboard style (editorial headline, `max-w-6xl`, hairline metric row, white `rounded-xl` cards) and the Stitch reports-interface table.
   - **One date filter row above everything** (data-viz rule): presets All time / Last 30 days / Last 90 days / This year (Asia/Dhaka dates) and a custom From–To with a browser check for reversed ranges; `400` messages from the backend shown under the row; "Showing: …" states the period (event start date). The filter scopes both reports so their numbers agree; refetches keep the previous render at reduced opacity (no skeleton flash); stale responses are ignored.
   - **Report 5 — your club:** `MetricRow` (events launched with completed/cancelled, registrations with registration rate, attendance rate with attended, average rating with count); `LineChart` of registrations vs attended by month (one axis, same unit; average rating stays in the table — no dual axis) with table view (month, events, registrations, attended, average rating); best-rated event card linking to its event report; per-event table (fill rate, attended, attendance rate, rating) with titles linking to `/operator/events/:id/analytics`.
   - **Report 3 — club vs club:** ranked `BarChart` in **emphasis** mode (your club in slot 1, others gray) with a measure switch (Registrations / Attendance rate / Average rating; clubs without a value show "—" and sort last) and a full table view of every column with "(you)" on your row.
   - Navigation: `/operator/analytics` route (club operators only); Navbar "Analytics" link (pill from `xl`, mobile menu always — the operator pill would overflow at `lg`); operator dashboard header button and "View Analytics" quick action.

5. [x] **Stage 5: Per-Event Reports (`/operator/events/:id/analytics`)** — `OperatorEventAnalytics.jsx`
   - Loads the event and both reports in parallel (`Promise.allSettled`); each report can be unavailable on its own. `409` shows a friendly card with the backend message ("This report is available for published events that have ended." / "Ratings exist only for published events."); `403` and `404` show an access message; other errors offer Retry.
   - Event headline (club, date, venue, status) with links to **Attendees & attendance** and the public page; back link to Analytics.
   - **Report 1 — department participation:** `MetricRow` (registered, attended, attendance rate); a note with a "Mark attendance" link when students registered but none are marked yet; ranked `BarChart` of attended students per department (one series, one hue; bar label "N of M") with a table view (registered, attended, attendance rate, share of attended).
   - **Report 2 — post-event rating:** `MetricRow` (average ★, ratings, attended, response rate); `ColumnChart` of the 1★–5★ distribution in the validated ordinal ramp, tooltip with the share; table view (rating, count, share); "No ratings yet" when empty.
   - Entry points: "Report" button on every launched event in `OperatorEvents.jsx`, "Event Report" on the attendees page, the operator dashboard's Recent Events, and the My Club per-event table (Stage 4).

6. [x] **Stage 6: Student Activity (`/my-activity`)** — `MyActivity.jsx` (students only)
   - No Stitch screen exists; uses the Stitch student-dashboard patterns (eyebrow-dot header, white `rounded-3xl` cards with tinted icon squircles, 4rem section rhythm, Stitch margins).
   - **Hero:** the activity score as the view's single `HeroFigure` (56px) with its formula, and a tall `SegmentedBar` of its parts (clubs joined, events attended, ratings given) in the validated categorical slots, with legend, tooltips and keyboard focus; a hint when the score is 0.
   - **Stat cards:** clubs joined, clubs followed ("not part of the score"), events registered, events attended, attendance rate ("attended ÷ registered events that have ended"), ratings given — each with a link to where the student can act (My Clubs, Explore Clubs, My Registrations, Dashboard rating prompts). The cards also serve as the readable values of the segmented bar.
   - Loading skeleton, error with Retry.
   - Navigation: `/my-activity` route (students only); student Navbar "Activity" pill link and "My Activity" in the mobile menu; "Your campus activity" card on the Profile page.

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
- `frontend/src/components/charts/` *(created, Stage 3)*: `chartTheme.js`, `ChartFrame.jsx`, `BarChart.jsx`, `ColumnChart.jsx`, `LineChart.jsx`, `Figures.jsx` (MetricRow, HeroFigure, SegmentedBar), `useChartWidth.js`, `index.js`
- `frontend/src/utils/format.js` (percent / rating / month formatters) *(created, Stage 1)*
- `frontend/src/pages/OperatorAnalytics.jsx` *(created, Stage 4)*
- `frontend/src/pages/OperatorEventAnalytics.jsx` *(created, Stage 5)*
- `frontend/src/pages/MyActivity.jsx` *(created, Stage 6)*

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

## 12. Stage 2 Verification Results

| Verification Check | Command / Method | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | `OperatorEventAttendees.jsx`. |
| **Production Build** | `npm run build` | **PASS (built in 1.16s)** | Bundle-size warning only (unchanged). |
| **Registrations carry `attended`** | `GET /api/events/:id/registrations/` (Stage 1) | **PASS (200)** | Source of the saved attended set. |
| **Permission guard** | `PUT /api/events/:id/attendance/` on another club's event (Stage 1) | **PASS (403)** | Refused before writing. |
| **Saving attendance from the UI** | — | **NOT RUN** | Writes to the shared Supabase database; covered by manual QA (Section 22). |

---

## 13. Acceptance Criteria (Stage 2)

- [x] Operators can tick attendance per student across all roster pages and save the full set.
- [x] Attendance is locked with a clear reason for drafts, cancelled and not-yet-started events.
- [x] Server `409` / `400` messages are shown; unsaved changes are visible and can be discarded.
- [x] No backend files modified; no new dependencies; ESLint and Vite build pass.
- [ ] Manual browser QA of saving attendance (Section 22).

---

## 14. Stage 3 Verification Results

### 14.1 Palette validation (`dataviz/scripts/validate_palette.js`, light mode, surface `#FFFFFF`)

| Palette | Result | Notes |
|---|:---:|---|
| `#2B34B9` (brand primary-container) + orange | **FAIL** | `#2B34B9` below the lightness band (L 0.419) — not used for marks. |
| `#444ED0, #F47230` | PASS with WARN | Orange 2.88:1 contrast — replaced. |
| **`#444ED0, #E8692A, #00A383`** (categorical) | **PASS** | All checks; worst adjacent CVD ΔE 11.8 (protan), normal-vision floor ΔE 27.0, contrast ≥ 3:1. |
| `#BEC2FF … #2B34B9` (ordinal) | **FAIL** | Light end 1.70:1 < 2:1. |
| **`#9EA4F4, #8086EC, #6168E0, #444ED0, #2F38BF`** (ordinal) | **PASS** | Monotone lightness, adjacent ΔL ≥ 0.06, light end 2.32:1, hue spread 9°. |

### 14.2 Render check

The components were rendered with demo report data (React server rendering + the app's built CSS) and inspected as images. Fixes made from the render: whole-number ticks for counts (were 0.5 steps), real-width SVG so labels render at 11px (were scaled to ~8px), straight bar baseline (a rounded focus wrapper bent it), metric values kept on one line.

### 14.3 Quality gates

| Verification Check | Command | Result |
|---|---|:---:|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** |
| **Production Build** | `npm run build` | **PASS (built in 1.17s)** |

---

## 15. Acceptance Criteria (Stage 3)

- [x] Bar, column and line charts plus metric, hero and segmented-bar figures available as reusable components.
- [x] Palette validated (no eyeballed colors); text uses text tokens only; no dual-axis chart.
- [x] Every chart has a table view, tooltips on hover and keyboard focus, and a legend for ≥ 2 series.
- [x] No new dependencies; ESLint and Vite build pass.

---

## 16. Stage 4 Verification Results

| Verification Check | Command / Method | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | `OperatorAnalytics.jsx`, `App.jsx`, `Navbar.jsx`, `OperatorDashboard.jsx`. |
| **Production Build** | `npm run build` | **PASS (built in 1.17s)** | Bundle-size warning only (carried to Week 9). |
| **Endpoints & date filters** | Stage 1 smoke tests | **PASS** | `my-club` / `club-comparison` 200, invalid ranges 400 with messages, student 403. |
| **Page render** | — | **PENDING (browser)** | The page loads data in effects, so a static render cannot show it; chart components were render-checked in Stage 3. |

---

## 17. Acceptance Criteria (Stage 4)

- [x] Report 5 shows summary metrics, a monthly trend, the best-rated event and a per-event table.
- [x] Report 3 lists every club with the operator's club highlighted and a measure switch.
- [x] One date filter scopes both reports; invalid ranges show the backend message.
- [x] Every chart has a table view; `null` values show "—".
- [x] Reachable from the Navbar and the operator dashboard; operators only.
- [ ] Browser QA of the page with real data (Section 22).

---

## 18. Stage 5 Verification Results

| Verification Check | Command / Method | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | `OperatorEventAnalytics.jsx`, `App.jsx`, `OperatorEvents.jsx`, `OperatorEventAttendees.jsx`, `OperatorDashboard.jsx`. |
| **Production Build** | `npm run build` | **PASS (built in 1.20s)** | Bundle-size warning only (carried to Week 9). |
| **Report endpoints** | Stage 1 smoke tests (Rated Workshop) | **PASS (200 / 200; student 403)** | Department: 4 registered, 0 attended (Bangla); ratings: 3, average 4.3, distribution 4★×2, 5★×1, response rate `null`. |
| **409 messages** | Backend source (`apps/analytics/views.py`) | **CONFIRMED** | Texts shown as-is in the unavailable cards. |
| **Page render** | — | **PENDING (browser)** | Data loads in effects; charts were render-checked in Stage 3. |

---

## 19. Acceptance Criteria (Stage 5)

- [x] Department participation and rating reports render per event with charts, metrics and table views.
- [x] Each report independently shows a clear message when the backend returns `409`.
- [x] Reachable from the events list, attendees page, operator dashboard and My Club table; operators only.
- [x] No backend files modified; no new dependencies; ESLint and Vite build pass.
- [ ] Browser QA with real data (Section 22).

---

## 20. Stage 6 Verification Results

| Verification Check | Command / Method | Result | Verification Notes |
|---|---|:---:|---|
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | `MyActivity.jsx`, `App.jsx`, `Navbar.jsx`, `Profile.jsx`. |
| **Production Build** | `npm run build` | **PASS (built in 1.21s)** | Bundle-size warning only (carried to Week 9). |
| **Student Activity endpoint** | Stage 1 smoke tests | **PASS (200; operator 403)** | demo1: joined 2, followed 3, registered 9, attended 0, rate 0.0 %, ratings 1, score 3. |
| **Hero + segmented bar render** | Stage 3 render check | **PASS** | Same components and demo values (score 3 = 2 + 0 + 1; the zero part draws nothing, legend keeps it). |
| **Page render** | — | **PENDING (browser)** | Data loads in effects. |

---

## 21. Acceptance Criteria (Stage 6)

- [x] Students see their activity score, its breakdown and all report 4 figures; `null` attendance rate shows "—".
- [x] Each figure links to where the student can improve it.
- [x] Reachable from the Navbar, mobile menu and Profile page; students only.
- [x] No backend files modified; no new dependencies; ESLint and Vite build pass.
- [ ] Browser QA with real data (Section 22).

---

## 22. Manual Interactive Browser QA Checklist

### Attendance (democlub1@demo.jnuverse.test)
- [ ] Open `/operator/events` → an ended Robotics event (e.g. `[DEMO] Rated Workshop`) → attendees. The toolbar shows "0 of 4 attended" and checkboxes are enabled.
- [ ] Tick two students, see "Unsaved changes", click **Save Attendance** → "Attendance saved: 2 of 4 …"; reload and the ticks persist.
- [ ] **Discard** restores the saved ticks; **Mark all** / **Clear all** affect every registration, not only the visible page.
- [ ] Open a draft, cancelled or not-yet-started event's attendees: checkboxes are replaced by read-only text and the lock reason is shown.
- [ ] After marking attendance, `/api/analytics/my-club/` attendance figures change (verified in Stage 4).

### Operator Analytics (democlub1@demo.jnuverse.test)
- [ ] Navbar "Analytics" (wide screen or mobile menu) or the dashboard "Analytics" button opens `/operator/analytics`.
- [ ] Metrics show 5 launched (5 completed · 0 cancelled), 9 registrations (6.4% of capacity), attendance "0.0%" before marking, ★ 4.2 from 5 ratings.
- [ ] Monthly chart shows Oct 2026 and Nov 2026 lines with a legend; hovering or ←/→ shows one tooltip with both values; the Table view lists the same numbers.
- [ ] Best rated event: [DEMO] Rated Workshop ★ 4.3 (3) with a working "Event report" link.
- [ ] Club vs club: Robotics bar highlighted; switching measure re-ranks the bars; clubs without values show "—".
- [ ] Presets and a custom range update both reports; From later than To shows an error; the page dims instead of flashing while loading.

### Per-Event Reports (democlub1@demo.jnuverse.test)
- [ ] `/operator/events` → **Report** on `[DEMO] Rated Workshop`: Report 1 shows 4 registered / 0 attended with the "Mark attendance" note and a single "Bangla" bar; Report 2 shows ★ 4.3, 3 ratings, response rate "—", columns 4★ = 2 and 5★ = 1 in darkening indigo.
- [ ] After marking attendance on the attendees page, Report 1 attended / attendance rate and Report 2 response rate update.
- [ ] Chart / Table switches show the same numbers; hovering or tabbing to a bar/column shows its tooltip.
- [ ] A cancelled event shows the "available for published events that have ended" card for Report 1 and the ratings card for Report 2.

### Student Activity (demo1@demo.jnuverse.test)
- [ ] Navbar "Activity" (or Profile → "Your campus activity") opens `/my-activity`.
- [ ] Hero shows score 3; the bar shows Clubs joined 2 and Ratings given 1 (Events attended 0 draws no block but stays in the legend); hovering or tabbing a block shows its share.
- [ ] Cards: joined 2, followed 3, registered 9, attended 0, attendance rate 0.0 %, ratings 1; links open the right pages.
- [ ] After the operator marks demo1 as attended, events attended, attendance rate and the score increase.
- [ ] As an operator, `/my-activity` shows "Access Restricted".

---

## 23. Week 8 Readiness Classification

* **Implementation:** Stages 1–6 of 7 complete (API services foundation; attendance marking; chart components; operator analytics hub; per-event reports; student activity).
* **Verification:** Stage 1 verified (lint, build, read-only API smoke tests); Stage 2 verified at source and build level, browser QA pending; Stage 3 verified by palette validation, render check, lint and build; Stages 4–6 verified at source and build level, browser QA pending. Remaining stages pending.
* **Demo Data:** Attendance is not seeded; attendance-based figures stay at 0 until attendance is marked or the seed is extended.
