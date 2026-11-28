# Week 09 — Cross-Module Integration & Testing

**Focus:** Frontend–backend integration audit, resilience, performance, responsive and accessibility refinements, end-to-end journey verification and the integration test report  
**Status:** **In Progress — Stages 1–3 Completed (Contract Audit Clean; Resilience 9/9; Main Chunk 846 kB → 255 kB)**  
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

5. [ ] **Stage 5: End-to-End Journey Verification**
   - Scripted read-only checks of the main journeys (onboarding, club engagement, operator review, event lifecycle, ratings, collaboration, reports, analytics).
   - Consolidated manual test script (Weeks 6–8 backlog + Week 9 journeys) for the tester, including the write steps (attendance, uploads, approvals, reports) on agreed demo data; record results.

6. [ ] **Stage 6: Diagram Validation (frontend input)**
   - Map the use cases, classes/entities and sequence flows in `docs/uml/UML_Diagrams.pdf` to frontend routes, screens and API calls; list anything in the diagrams that the implementation does differently or does not have, for the UML designer.

7. [ ] **Stage 7: Integration Test Report & Final Quality Gates**
   - Frontend integration test report (`frontend/docs/testing/INTEGRATION_TEST_REPORT.md`): contract audit, journeys, responsive/accessibility results, defects found and fixed, open issues.
   - Lint, build, API role matrix, README and readiness updates.

---

## 4. Carried-Over Items

| Item | From | Owner | Status |
|---|---|---|---|
| Browser QA of Weeks 6–8 write flows (uploads, interests, approvals, reports, attendance) | Weeks 6–8 | Anik + Nabil | Open — Stage 5 |
| Re-seed demo data (time-based figures expired) | Week 7 | Atik | **Done** (`d488455`, verified) |
| Seed attendance and varied departments for the Week 8 reports | Week 8 | Atik | **Done** (`d488455`, verified) |
| Restore Robotics Club interests to Technology, Programming, Robotics | Week 7 QA | Anik | **Done** (by the re-seed) |
| Bundle code splitting (846 kB) | Weeks 7–8 | Anik | **Done** — Stage 3 (255 kB) |

---

## 5. Test Environment Note

The local backend (`backend/.env`) connects to the **shared Supabase database** used by the deployed app. Automated checks in this plan are read-only. Write steps (attendance, uploads, approvals, report submission) are done manually on `[DEMO]` data, which the next `seed_demo_events --reset` restores. A separate local or staging database would allow automated write tests — see Decisions.

---

## 6. Acceptance Criteria (Week 9)

- [ ] Every frontend API call matches `openapi.yml`; every backend feature is reachable from the UI or listed as intentionally unused.
- [ ] No route can crash to a blank page; unknown URLs show a Not Found page; network and session errors show clear messages.
- [ ] Main JavaScript chunk below 500 kB.
- [ ] Every route checked at 375 / 768 / 1024 / 1440 px with defects fixed; modals and charts are keyboard-usable.
- [ ] Main journeys verified; Weeks 6–8 browser QA backlog executed with results recorded.
- [ ] Use-case / screen traceability delivered to the UML designer.
- [ ] Integration test report written; ESLint and Vite build pass; no backend files modified.

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
| **Audit run 3** (after fixes) | `npm run audit:responsive` | **PENDING** | Running at commit time; result recorded in a follow-up. |
| **Static Code Analysis / Build** | `npm run lint`, `npm run build` | **PASS** | — |

---

## 15. Acceptance Criteria (Stage 4)

- [x] Every route checked at 375 / 768 / 1024 / 1440 px as visitor, student and operator (120 screens).
- [x] Overflow defects fixed (operator navbar at 1024 px, Members at 768 px).
- [x] Form fields have accessible names; small tap targets enlarged.
- [x] All 12 dialogs support Escape, focus entry, focus trap and focus return.
- [x] Event page loads reliably from a direct URL when signed in.
- [ ] Confirmation audit after fixes (run 3) — pending.

---

## 16. Backend Week 9 Delivery Check (2026-11-28)

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

## 17. Week 9 Readiness Classification

* **Implementation:** Stages 1–4 of 7 complete (API contract audit; resilience and error handling; code splitting; responsive & accessibility audit).
* **Verification:** contract audit clean; spec confirmed current; resilience suite 9/9 in headless Chrome; production build split and verified in Chrome.
* **Open:** backend requests 7–9 (Section 14); local stack setup on the frontend machine for write-flow QA.

