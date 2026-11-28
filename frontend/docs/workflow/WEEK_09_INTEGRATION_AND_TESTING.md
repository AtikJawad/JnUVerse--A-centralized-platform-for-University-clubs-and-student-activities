# Week 09 — Cross-Module Integration & Testing

**Focus:** Frontend–backend integration audit, resilience, performance, responsive and accessibility refinements, end-to-end journey verification and the integration test report  
**Status:** **Planned — Stage 0 (Plan Documented; Implementation Not Started)**  
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

1. [ ] **Stage 1: API Contract Integration Audit**
   - Script that lists every endpoint the frontend calls (method + path) and compares it with `docs/api/openapi.yml`; report calls the backend does not define, wrong methods, missing trailing slashes, and backend endpoints no screen uses.
   - Fix frontend mismatches; send backend issues to the backend developer as a list.

2. [ ] **Stage 2: Resilience & Error Handling**
   - Global `ErrorBoundary` with a recoverable fallback (reload / go home) instead of a blank page.
   - `NotFound` page for unknown routes (currently they silently redirect to `/clubs`).
   - Network failure and Render cold-start notice (first request can take about a minute) shown consistently; session-expiry handling verified (refresh failure → login with a message and a return path).

3. [ ] **Stage 3: Performance — Code Splitting**
   - Route-level `React.lazy` + `Suspense` with the existing loading state; keep the shared shell eager.
   - Target: main chunk below 500 kB (currently 846 kB), verified from the build output.

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
| Bundle code splitting (846 kB) | Weeks 7–8 | Anik | Stage 3 |

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
