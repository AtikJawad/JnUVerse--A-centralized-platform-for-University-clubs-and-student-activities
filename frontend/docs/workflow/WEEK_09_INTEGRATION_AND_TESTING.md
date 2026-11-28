# Week 09 — Cross-Module Integration & Testing

**Focus:** Frontend–backend integration audit, resilience, performance, responsive and accessibility refinements, end-to-end journey verification and the integration test report  
**Status:** **Completed — Stages 1–7 (Contract 64/64; Roles 120/120; Resilience 9/9; Journeys 26/26; Responsive Audit Clean; UML Validated; Test Report Delivered). Manual write-flow QA pending on the local stack.**  
**Assigned:** Anik Khondokar (Frontend MVP Coder), Sheak Noor Muhammad Nabil (Tester) & Atik Jawad (Backend MVP Coder)  
**Backend Reference:** `docs/api/openapi.yml` (48 API paths) and backend handoffs Weeks 1–8. No Week 9 backend handoff yet; backend Week 9 work is fixing API issues found during integration.  
**Design Reference:** Google Stitch exports in `docs/ui/stitch-export/` and `jnuverse/DESIGN.md`; UML deliverable `docs/uml/UML_Diagrams.pdf` (21 pages) for diagram validation.  
**Target:** December 2026  

---

## 1. Objectives

- Prove that every frontend API call matches the backend contract, and that every backend feature is reachable from the UI.
- Make the app resilient: no blank screens on errors, a real 404 page, clear messages for network failures, the Render cold start and expired sessions.
- Bring the main JavaScript bundle under the 500 kB warning with route-level code splitting.
- Verify every screen at mobile, tablet, laptop and desktop widths and fix responsive and accessibility defects.
- Verify the main user journeys end to end and close the browser QA backlog from Weeks 6–8 together with the tester.
- Contribute the frontend side of the diagram validation and produce the integration test report (plan deliverables for Week 9).

---

## 2. Scope & Exclusions

- **In Scope:**
  - Automated contract audit (frontend calls vs `openapi.yml`), fixes for any mismatch.
  - Global error boundary, Not Found page, network/cold-start and session-expiry handling.
  - Route-level code splitting (`React.lazy` + `Suspense`).
  - Headless-Chrome screenshots of every route at 375 / 768 / 1024 / 1440 px (public, student and operator), keyboard and focus checks, and fixes.
  - Read-only scripted journey checks plus a consolidated manual test script for the tester.
  - Use-case / screen traceability for the UML designer; frontend section of the integration test report.
- **Exclusions:**
  - New features (Week 9 is for integration and fixes only).
  - Backend changes (reported to the backend developer instead).
  - A frontend unit-test framework (Vitest / React Testing Library would be new dependencies — see Decisions).

---

## 3. Implementation Stages & Progress

1. [x] **Stage 1: API Contract Integration Audit**
   - `frontend/scripts/audit-api-contract.mjs` (`npm run audit:api`, no dependencies): reads `docs/api/openapi.yml`, finds every API call in `frontend/src` (`api.*`, the refresh `axios.post`, `fetchAllPages`, `putImage`), and reports calls to unknown paths, disallowed methods, missing trailing slashes and spec operations no code calls; exits 1 on any mismatch.
   - First run: 1 flag — `OperatorDashboard.jsx` built the approve/reject URL from a variable (`…/${action}/`), correct at runtime but not verifiable. Rewritten as two explicit calls. Second run: clean.
   - Coverage: **all 64 backend operations are used by the frontend** (every backend feature is reachable from the UI); 81 call sites.
   - Spec freshness: the spec was regenerated from the backend code (`manage.py spectacular` into a scratch file) and compared — identical operations and schemas; only `operationId` prefixes and tag names differ (cosmetic, reported to the backend developer).

2. [x] **Stage 2: Resilience & Error Handling**
   - `ErrorBoundary.jsx` around all routes (`RouteErrorBoundary` in `App.jsx`, reset on navigation): a page crash shows "Something went wrong on this page." with Try again / Reload / Go to dashboard instead of a blank screen; the error is logged to the console.
   - `NotFound.jsx` (Stitch empty-state style) for unknown URLs, replacing the silent redirect to `/clubs`; shows the missing path, "Explore clubs" and "Log in" / "Go to dashboard".
   - `ServerStatusNotice.jsx` + `api.js` request timing: any API request pending longer than 4 s shows "Waking up the server — the first request after a quiet period can take up to a minute." (Render free tier), cleared when requests finish; browser offline/online events show "You are offline…".
   - Session expiry: when the refresh token is rejected, `api.js` sets a one-time flag; both login pages show "Your session has expired…" once. `ProtectedRoute` now sends operator-only pages to `/operator/login` (previously always `/login`), and both login pages return to the full original URL including the query string.
   - Defect found and fixed during testing: logged-out visitors saw the student-only "My Clubs" and "Activity" navbar links; they now see Overview, Explore Clubs and Events only.
   - Defect found and fixed during testing: the session flag was read and removed inside a `useState` initializer, which React StrictMode runs twice, so the notice never showed in development; the initializer is now pure and the flag is cleared in an effect.
   - `scripts/lib/cdp.mjs` (Chrome DevTools Protocol driver using the installed Chrome and Node's built-in WebSocket) and `scripts/test-resilience.mjs` (`npm run test:resilience`, 9 read-only checks).

3. [x] **Stage 3: Performance — Code Splitting**
   - All 24 page components in `App.jsx` are `React.lazy` imports inside one `Suspense` (fallback: the existing full-screen `LoadingState`, "Loading page..."); the shell (router, auth, error boundary, status notice, protected route) stays in the main bundle.
   - `ErrorBoundary` recognises a failed page-chunk load (a tab left open across a new deployment) and shows "JnUVerse was updated. A newer version is available. Reload the page to continue." instead of the generic error.
   - Result: main chunk **846 kB → 255 kB** (85 kB gzip); 40 JS files, largest page chunk 57.5 kB (OperatorCollaborations); Vite's >500 kB warning is gone.
   - The resilience test now caches the `/events` chunk before emulating latency, so it measures API slowness rather than the (correct) "Loading page..." fallback during a slow chunk download.

4. [x] **Stage 4: Responsive & Accessibility Audit**
   - **Follow-up from the Week 9 backend:** `AuthContext.login` now uses `user.club` from the login response for operators and calls `/api/auth/me/` only as a fallback (verified in Chrome: operator login makes a single `POST /api/auth/login/`).
   - `scripts/audit-responsive.mjs` (`npm run audit:responsive`): visits 30 routes (9 visitor, 9 student, 12 operator) at 375 / 768 / 1024 / 1440 px = 120 screens, waits until each page is really rendered (no loading text, stable height), saves full-page screenshots and checks page overflow, elements past the viewport, tap targets < 24 px at 375 px (WCAG 2.5.8, with its label and inline-link exceptions), images without alt, unnamed buttons/links, unlabelled form fields and JavaScript errors. The first run waited a fixed 2.5 s and captured loading spinners on slow pages; the script now waits for readiness.
   - **Defects found and fixed:**
     1. **Event page stuck on "Loading event details..." for signed-in users opening it directly** (since Week 6): the session resolved after the first fetch started, the identity effect bumped the request generation and the fetch result was discarded without clearing `loading`. `fetchEvent` now also depends on the identity and re-fetches (verified: 3/3 event pages load from a direct URL as demo1).
     2. **Operator navbar overflowed at 1024 px:** "OPERATOR PORTAL" and "Explore Clubs" wrapped, the club name was cut off and Logout was off-screen. At `lg` the portal badge and the name/subtitle text are hidden (avatar link remains); pill links never wrap.
     3. **`/operator/members` overflowed by 28 px at 768 px:** the three metric cards now stack until `lg`.
     4. **Unlabelled form fields** (screen readers heard no name): search/filter fields on Explore Events, Explore Clubs (+ sort select), My Clubs, Members, Operator Events, Notices and Collaborations now have `aria-label`s.
     5. **Small tap targets:** login/register carousel dots are now 24 × 24 px buttons (visual pill unchanged, `aria-current` on the active slide); register "terms" and event-form "unlimited capacity" checkboxes 20 px with clickable labels; event-form back link and operator event title links have ≥ 24 px height.
     6. **Dialog keyboard support:** 12 dialogs (EventDetail ×2, OperatorEvents ×2, OperatorCollaborations ×4, OperatorNotices ×3, OperatorMembers ×1) had no Escape, no focus management and (Members) no `role="dialog"`. New `DialogA11y.jsx`: focus moves into the dialog, Tab is trapped, Escape uses the dialog's own close/cancel handler (busy guards respected), focus returns to the opener. Verified in Chrome with real key events on the "Create New Notice" and "Register for Event" dialogs (no submission).
     7. **Operator header still overflowed from 1280 px up** (found by the confirmation audit once every page loaded): measured 275 + 689 + 445 px of content in a 1232 px header (max-width 1360 px), Logout ending at 1473–1561 px at 1280–1536 px. Fixed permanently: "Explore Events" is an icon button (title + `aria-label`), and for operators the club name text is hidden from `lg` (avatar link keeps the logo, tooltip and an `aria-label` with the club name). Re-measured: Logout inside the window at 1024 / 1280 / 1440 / 1536 / 1920 px.
     8. **More small standalone links at 375 px** (visible once pages fully loaded): My Activity card links and "Your profile", operator dashboard "View all" / "Manage →" / "View live", club page "Leave Club", event breadcrumb "Events" — all ≥ 24 px tall now.

5. [x] **Stage 5: End-to-End Journey Verification**
   - `scripts/test-journeys.mjs` (`npm run test:journeys`, headless Chrome, read-only apart from logins): signs in through the **real login forms** and walks the visitor, student and operator journeys, comparing what each screen shows with what the API returns for the same account — 26 checks (dashboard badges and counts, notification bell, My Clubs, My Activity score, My Registrations, My Reports, saved interests, operator metrics, pending requests, members, analytics figures, event report departments and totals, collaborations, notices). The backend's own `tests/test_journeys.py` covers the same four journeys at API level.
   - `frontend/docs/testing/MANUAL_TEST_SCRIPT.md`: the consolidated manual script for the tester — every flow that changes data (registration, interests, follow/join/leave, event registration, ratings, notices, approvals, event lifecycle with banner, attendance, club logo, collaborations, reports, analytics, cross-cutting checks), 13 sections with expected results from the demo data and a defects table; to be run on the backend's local test stack.

6. [x] **Stage 6: Diagram Validation (frontend input)**
   - All 21 pages of `docs/uml/UML_Diagrams.pdf` (4 use case, 5 class, 6 sequence, 6 activity diagrams) compared with the app, `openapi.yml` and the backend code at `d0cc389`. Report for the UML designer: `frontend/docs/testing/UML_DIAGRAM_VALIDATION.md` (use case → screen → API traceability, and every difference with a suggested change).
   - **Main findings:** (1) p3 "Attach Related Event" is drawn on *responding* to a collaboration; in the app the event is linked when *sending* and acceptance only makes the clubs partners. (2) Four sequence diagrams show the wrong status codes: registration no-match 403 → **400**, login 401 → **400**, event full/cancelled 400 → **409**, rating not allowed 400 → **403/409**. (3) Class diagrams lack `ContentReport` and `EventRegistration.attended` (needed by reports 3–5) plus 8 attributes; Club logo is an uploaded image, not a URL. (4) 20 implemented use cases are not drawn (follow, join/leave, register/cancel, rate, notifications, reports, dashboards, analytics, attendance, banner/logo uploads, edit/delete notice, cancel collaboration, partners). (5) All 6 activity diagrams match their main flow but miss branches (cancelled/started events, re-request after rejection, notifications, cancel collaboration).
   - Nothing in the diagrams required a code change; the diagrams are to be updated to match the tested implementation.

7. [x] **Stage 7: Integration Test Report & Final Quality Gates**
   - `frontend/docs/testing/INTEGRATION_TEST_REPORT.md`: results of every suite, responsive audit history, 14 defects found by testing (13 fixed, 1 open on the backend), planned improvements delivered, open items with owners, and how to re-run.
   - `scripts/audit-roles.mjs` (`npm run audit:roles`, read-only): the 30 GET operations the frontend uses, called as visitor, student, own-club operator and another club's operator; expected codes taken from the backend permission classes. **120/120.**
   - Audit run 4 found 4 more small links at 375 px (Members "Public Page", Analytics "Event report", event report back link, event-form breadcrumb title); all now ≥ 24 px tall. Re-run 5 clean.
   - `FRONTEND_README.md`: Week 9 section, directory tree (`docs/testing/`, `scripts/`, Week 9 components and page) and status row.

---

## 4. Carried-Over Items

| Item | From | Owner | Status |
|---|---|---|---|
| Browser QA of Weeks 6–8 write flows (uploads, interests, approvals, reports, attendance) | Weeks 6–8 | Anik + Nabil | Script ready (`MANUAL_TEST_SCRIPT.md`); execution pending on the local stack → Week 10 |
| Re-seed demo data (time-based figures expired) | Week 7 | Atik | **Done** (`d488455`, verified) |
| Seed attendance and varied departments for the Week 8 reports | Week 8 | Atik | **Done** (`d488455`, verified) |
| Restore Robotics Club interests to Technology, Programming, Robotics | Week 7 QA | Anik | **Done** (by the re-seed) |
| Bundle code splitting (846 kB) | Weeks 7–8 | Anik | **Done** — Stage 3 (255 kB) |

---

## 5. Test Environment Note

The local backend (`backend/.env`) connects to the **shared Supabase database** used by the deployed app. Automated checks in this plan are read-only. Write steps (attendance, uploads, approvals, report submission) are done manually on `[DEMO]` data, which the next `seed_demo_events --reset` restores. A separate local or staging database would allow automated write tests — see Decisions.

---

## 6. Acceptance Criteria (Week 9)

- [x] Every frontend API call matches `openapi.yml`; every backend feature is reachable from the UI or listed as intentionally unused.
- [x] No route can crash to a blank page; unknown URLs show a Not Found page; network and session errors show clear messages.
- [x] Main JavaScript chunk below 500 kB (255 kB).
- [x] Every route checked at 375 / 768 / 1024 / 1440 px with defects fixed; modals and charts are keyboard-usable.
- [ ] Main journeys verified (**done**, 26/26); Weeks 6–8 browser QA backlog executed with results recorded (**pending** — manual script on the local stack).
- [x] Use-case / screen traceability delivered to the UML designer (`frontend/docs/testing/UML_DIAGRAM_VALIDATION.md`).
- [x] Integration test report written; ESLint and Vite build pass; no backend files modified.

---

## 7. Decisions & Questions for the Team

- **Frontend test framework:** adding Vitest + React Testing Library would give automated component tests but adds dependencies late in the project. **Recommendation:** not this week; use the scripted contract audit, scripted journeys and the screenshot audit, and record manual results in the report.
- **Test database for write tests:** the shared Supabase database should not receive automated writes. **Question for Atik:** can a local PostgreSQL (or a separate Supabase project) be provided for Week 9 testing? Otherwise write tests stay manual on `[DEMO]` data.
- **Headless screenshots** use the installed Google Chrome through the DevTools Protocol from a Node script (no new project dependency).

---

## 8. Stage 1 Verification Results

| Verification Check | Command | Result | Notes |
|---|---|:---:|---|
| **Contract audit (before fix)** | `npm run audit:api` | **1 flag** | Variable approve/reject URL in `OperatorDashboard.jsx:115`. |
| **Contract audit (after fix)** | `npm run audit:api` | **PASS (exit 0)** | 0 unknown paths, 0 wrong methods, 0 missing slashes, 0 unused operations; 64/64 operations used, 81 call sites. |
| **Non-literal URLs** | `grep` for `api.*(variable)` | **PASS** | Only the `fetchAllPages` and `putImage` helpers, whose call sites the audit checks. |
| **Spec freshness** | `manage.py spectacular --file <scratch>` + diff | **PASS** | Same 64 operations and schemas; only `operationId` prefixes / tags differ. |
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | — |
| **Production Build** | `npm run build` | **PASS** | — |

### Issues for the backend developer
- *(Cosmetic)* The committed `docs/api/openapi.yml` uses `operationId`s prefixed with `api_` and a single `api` tag, while the current backend generates per-app tags (`analytics`, `auth`, …). Regenerating the committed file would group Swagger UI by app.

---

## 9. Acceptance Criteria (Stage 1)

- [x] Every frontend API call matches a spec path and method, with trailing slashes.
- [x] Every backend operation is reachable from the UI (64/64).
- [x] The audit is repeatable (`npm run audit:api`) and needs no new dependencies.
- [x] ESLint and Vite build pass; no backend files modified.

---

## 10. Stage 2 Verification Results

`npm run test:resilience` against the local dev server and backend (headless Chrome, read-only):

| # | Check | Result |
|:---:|---|:---:|
| 1 | Unknown URL shows the Not Found page | **PASS** |
| 2 | Logged-out navbar shows only Overview, Explore Clubs, Events | **PASS** |
| 3 | Expired session on `/my-activity` → `/login` with notice, return path `/my-activity` | **PASS** |
| 4 | Session notice shown only once | **PASS** |
| 5 | Expired session on `/operator/analytics` → `/operator/login` with notice, return path kept | **PASS** |
| 6 | Request slower than 4 s (6 s network latency emulated) shows the waking-up notice | **PASS** |
| 7 | Waking-up notice clears when requests finish (≈ 3 s after latency removed) | **PASS** |
| 8 | Offline (emulated) shows the offline notice | **PASS** |
| 9 | Back online hides the offline notice | **PASS** |

Also: `npm run lint` PASS (0 / 0), `npm run build` PASS. The error boundary fallback is verified at source level only — triggering a real render error would require a deliberately broken component.

---

## 11. Acceptance Criteria (Stage 2)

- [x] A page error shows a recoverable fallback instead of a blank screen (source-verified).
- [x] Unknown URLs show a Not Found page.
- [x] Slow-server and offline states show clear, non-blocking notices.
- [x] Expired sessions land on the correct login page with an explanation and return to the original URL.
- [x] Checks are repeatable (`npm run test:resilience`); no new dependencies; ESLint and Vite build pass.

---

## 12. Stage 3 Verification Results

| Verification Check | Command / Method | Result | Notes |
|---|---|:---:|---|
| **Production Build** | `npm run build` | **PASS — no chunk-size warning** | Main `index` chunk 249 kB on disk / 255 kB reported (85 kB gzip), previously 846 kB; 40 JS files. |
| **Largest page chunks** | `dist/assets` | — | OperatorCollaborations 57.5 kB, OperatorNotices 42.9 kB, EventDetail 40.6 kB, ClubDetail 40.3 kB, ExploreClubs 35.5 kB. |
| **Production build in Chrome** | `vite preview` (port 4179) + headless Chrome | **PASS** | `/clubs` loads only `index`, `ExploreClubs`, `Navbar`, `InterestTags`; `/login` loads `Login`, `Input`, `ErrorAlert`; unknown URL renders the Not Found page. |
| **Resilience suite** | `npm run test:resilience` | **PASS (9/9)** | After adjusting the slow-request check for lazy chunks (first re-run: 8/9). |
| **Static Code Analysis** | `npm run lint` | **PASS (0 errors, 0 warnings)** | — |

---

## 13. Acceptance Criteria (Stage 3)

- [x] Main JavaScript chunk below 500 kB (255 kB).
- [x] Pages load on demand in the production build; a stale chunk after a deployment shows a reload message.
- [x] No new dependencies; ESLint, build and the resilience suite pass.

---

## 14. Stage 4 Verification Results

| Verification Check | Command / Method | Result | Notes |
|---|---|:---:|---|
| **Audit run 1** (fixed 2.5 s wait) | `npm run audit:responsive` | Invalid for slow pages | Captured loading spinners; led to the readiness wait. |
| **Audit run 2** (readiness wait, before fixes) | `npm run audit:responsive` | **Findings** | 120 screens; 0 crashes, 0 JS errors, 0 images without alt, 0 unnamed controls; operator navbar overflow at 1024 px (12 screens), Members overflow 28 px at 768 px, 36 unlabelled-field hits (8 fields), small targets at 375 px, student event page never ready (6 screens). |
| **Event page direct load** | headless Chrome, demo1 | **PASS (3/3)** | Loaded in 8–9 s on the shared backend (previously stuck). |
| **Dialog keyboard behaviour** | headless Chrome, real key events | **PASS (2/2)** | "Create New Notice", "Register for Event": focus in, Tab trapped (12 presses), Escape closes, focus back on opener. |
| **Operator login request count** | headless Chrome | **PASS** | One `POST /api/auth/login/`, no `/me`. |
| **Audit run 3** (after fixes 1–6) | `npm run audit:responsive` | **PASS for fixed items; 2 new findings** | 120 screens: **0 page overflow** (was 13), **0 unlabelled fields** (was 36), 0 crashes, 0 JS errors, 0 missing alt, 0 unnamed controls; carousel dots no longer flagged. New: operator Logout past the viewport at 1440 px (11 screens) and 10 small standalone links at 375 px → fixes 7 and 8. Student dashboard slower than 15 s at 375/768 px while other tests loaded the shared backend (renders correctly — journeys check). |
| **Navbar re-measure** (after fix 7) | headless Chrome, 5 widths | **PASS** | Logout right edge 994 / 1276 / 1336 / 1384 / 1576 px at 1024 / 1280 / 1440 / 1536 / 1920 px. |
| **Audit run 4** (375 + 1440 px, after fixes 7–8) | `npm run audit:responsive -- --widths 375,1440` | **see 16.2** | 0 overflow; 4 small operator links → fixed in Stage 7 |
| **Static Code Analysis / Build** | `npm run lint`, `npm run build` | **PASS** | — |

---

## 15. Acceptance Criteria (Stage 4)

- [x] Every route checked at 375 / 768 / 1024 / 1440 px as visitor, student and operator (120 screens).
- [x] Overflow defects fixed (operator navbar at 1024 px, Members at 768 px).
- [x] Form fields have accessible names; small tap targets enlarged.
- [x] All 12 dialogs support Escape, focus entry, focus trap and focus return.
- [x] Event page loads reliably from a direct URL when signed in.
- [x] Confirmation audit after fixes (run 3): overflow and unlabelled fields cleared; its two new findings fixed (7, 8).

---

## 16. Stage 5 Verification Results

### 16.1 Journeys
`npm run test:journeys` against the local dev server and the shared backend:

| Journey | Checks | Result |
|---|:---:|:---:|
| Visitor (clubs, club profile, no Report button, event asks to log in) | 4 | **PASS** |
| Student (form login, dashboard sections and badges 2 to rate / 4 registered, next event, bell 8 unread, My Clubs, My Activity score 12, My Registrations, My Reports 3, profile interests) | 11 | **PASS** |
| Operator (form login, Approved Members 2, Pending 1, pending names, members, analytics 5 launched + best-rated event, event report departments + registered total, collaborations, notices) | 11 | **PASS** |
| **Total** | **26** | **26/26** |

First run 25/26: the My Activity check read the score before the data loaded (the heading renders first); the check now waits for the figure. The page itself showed the correct score (12).

### 16.2 Confirmation audit after Stage 4 fixes 7–8
Run 4 (375 and 1440 px) first stopped responding after 28 screens: a Chrome DevTools command had no time limit. `scripts/lib/cdp.mjs` now fails any command after 60 s, and `audit-responsive.mjs` records a stuck screen as a failure and continues.

| Run | Screens | Result |
|---|:---:|---|
| 4 (re-run) | 60 | **0 page overflow, 0 elements past the viewport, 0 unlabelled fields, 0 unnamed controls, 0 missing alt, 0 JS errors.** 4 small links at 375 px on operator pages (fixed in Stage 7); student dashboard at 1440 px not ready within 15 s (shared database latency). |
| 5 (after the Stage 7 fix) | 21 (operator 375 px, student 1440 px) | **0 findings**; every screen ready (student dashboard 12.1 s). |

---

## 17. Acceptance Criteria (Stage 5)

- [x] Main journeys verified through the real UI with the API as the oracle (26/26).
- [x] Manual test script for all data-changing flows delivered for the tester.
- [ ] Manual script executed by the tester on the local stack (Weeks 6–8 backlog + Week 9 journeys) — pending.

---

## 18. Stage 6 Verification Results

| Diagram set (pages) | Checked against | Result |
|---|---|---|
| Use case (1–4) | Routes in `App.jsx`, calls in `api.js` | Shown use cases all implemented; 1 relation wrong (p3 Attach Related Event); 20 implemented use cases missing |
| Class (5–9) | Backend models | Entities and relations match; `ContentReport` class and 8 attributes missing; Club logo type differs |
| Sequence (10–15) | Backend views/serializers, frontend error handling | Message order matches; 4 diagrams with wrong status codes; S6 lacks the 409 duplicate branch; 9 alternative flows missing |
| Activity (16–21) | Backend rules and notifications | Main flows match; branches missing in all 6 |

Every claim in the report was checked in the code (endpoint paths against `openapi.yml`, messages and codes in the views/serializers). Read-only: nothing written to the shared database.

---

## 19. Acceptance Criteria (Stage 6)

- [x] Every diagram page reviewed (21/21).
- [x] Use case → screen → API traceability for all use cases, including those not in the diagrams.
- [x] Every difference listed with the implemented behaviour and a suggested diagram change.
- [x] Report placed where the team can find it and linked from the backend handoff.
- [ ] Diagrams updated by the UML designer — pending (team).

---

## 20. Stage 7 Verification Results (Final Quality Gates)

| Gate | Command | Result |
|---|---|:---:|
| Static analysis | `npm run lint` | **PASS (0 errors, 0 warnings)** |
| Production build | `npm run build` | **PASS** — main chunk 255 kB (85 kB gzip), no size warning |
| API contract | `npm run audit:api` | **PASS** — 64/64 operations used, 0 mismatches |
| Role matrix | `npm run audit:roles` | **PASS — 120/120** (30 operations × 4 identities) |
| Resilience | `npm run test:resilience` | **PASS — 9/9** |
| Journeys | `npm run test:journeys` | **PASS — 26/26** |
| Responsive / accessibility | `npm run audit:responsive` (run 5) | **PASS — 0 findings** |
| Backend files modified by the frontend | `git diff --stat backend/apps` | **None** (docs only) |

All gates ran read-only against the shared database (GET requests and logins as demo1, democlub1, democlub2).

---

## 21. Acceptance Criteria (Stage 7)

- [x] Integration test report written with results, defects, open items and re-run steps.
- [x] Role restrictions match the backend for every GET operation the frontend uses (120/120).
- [x] ESLint and Vite build pass; all automated suites pass; no backend code modified.
- [x] README Week 9 section, directory tree and status row updated; backend handoff updated (§5.7).

---

## 22. Backend Week 9 Delivery Check (2026-11-28)

Pulled `d488455` and `d0cc389` (fast-forward, no conflicts) and read `frontend/docs/backend-handoff/WEEK_09_BACKEND_HANDOFF.md` and `backend/docs/LOCAL_TEST_STACK.md`.

| Item | Result |
|---|---|
| Operator login now returns `club` | Verified (same shape as `/me`); frontend follow-up: use it and keep `/me` as fallback. |
| Re-seed, attendance, departments | Verified — dashboards back to handoff figures; attendance-based reports populated; three departments. |
| Contract and resilience | `npm run audit:api` 64/64 clean; `npm run test:resilience` 9/9. |
| Local test stack | Available (`config.settings_local`); not yet usable on this Mac (PostgreSQL not installed). |
| New backend tests | Concurrency, journeys, no-500 sweep — reported passing by the backend; not run here (needs local PostgreSQL). |

**Issues reported to the backend** (`backend/FRONTEND_REQUIREMENTS.md` requests 7–9, Week 9 frontend handoff §5): student `attendance_rate` can exceed 100 % (demo1 116.7 %); local-stack doc gives the wrong demo password; no macOS steps.

---

## 23. Week 9 Readiness Classification

* **Implementation:** all 7 stages complete (API contract audit; resilience; code splitting; responsive & accessibility audit; end-to-end journeys; UML diagram validation; integration test report and final gates).
* **Verification:** lint and build pass; contract 64/64; role matrix 120/120; resilience 9/9; journeys 26/26; responsive audit run 5 with 0 findings; results in `frontend/docs/testing/INTEGRATION_TEST_REPORT.md`.
* **Classification:** **Ready for Week 10** for everything that can be tested read-only. The data-changing flows still need the manual run on the local stack.
* **Open:** backend requests 7–9 (Section 22); UML diagram updates (Section 18); local stack setup on the frontend machine for write-flow QA.

