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

4. [ ] **Stage 4: Responsive & Accessibility Audit**
   - Headless-Chrome screenshots (Chrome DevTools Protocol, logged in with demo accounts) of every route at 375, 768, 1024 and 1440 px for public, student and operator views.
   - Check overflow, wrapping, touch targets, navbar/mobile menu, tables, charts and modals; keyboard navigation, visible focus, Escape on modals, and `prefers-reduced-motion`.
   - Fix defects and re-shoot.

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
| Re-seed demo data (time-based figures expired) | Week 7 | Atik | Open |
| Seed attendance and varied departments for the Week 8 reports | Week 8 | Atik | Requested |
| Restore Robotics Club interests to Technology, Programming, Robotics | Week 7 QA | Anik | Open |
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

## 14. Week 9 Readiness Classification

* **Implementation:** Stages 1–3 of 7 complete (API contract audit; resilience and error handling; code splitting).
* **Verification:** contract audit clean; spec confirmed current; resilience suite 9/9 in headless Chrome; production build split and verified in Chrome.
* **Open:** test-database question and carried-over items (Section 4).

