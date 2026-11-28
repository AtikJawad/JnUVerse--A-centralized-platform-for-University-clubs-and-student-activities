# JnUVerse — Frontend Integration Test Report (Week 9)

**For:** the JnUVerse team (Anik Khondokar, Atik Jawad, Sheak Noor Muhammad Nabil) and project reviewers  
**Author:** Anik Khondokar (frontend), 2026-11-28  
**Build under test:** frontend at Week 9 Stage 7; backend `d0cc389` (Week 9 delivery) against the shared Supabase database, from a local machine  
**Detailed log:** `frontend/docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md`

---

## 1. Result at a glance

| Area | How it was tested | Result |
|---|---|:---:|
| API contract | `npm run audit:api`: every frontend call against `docs/api/openapi.yml` | **PASS**: 64/64 operations used, 0 mismatches |
| Role permissions | `npm run audit:roles`: 30 GET operations × 4 identities | **PASS**: 120/120 |
| Error handling and resilience | `npm run test:resilience`: headless Chrome | **PASS**: 9/9 |
| End-to-end journeys (UI vs API) | `npm run test:journeys`: real login forms, headless Chrome | **PASS**: 26/26 |
| Responsive and accessibility | `npm run audit:responsive`: 30 routes × 4 widths | **PASS**: 0 page overflow, 0 unlabelled fields, 0 JS errors (§4) |
| Performance | `npm run build` | **PASS**: main chunk 255 kB (was 846 kB), no size warning |
| Code quality | `npm run lint` | **PASS**: 0 errors, 0 warnings |
| UML diagrams | Manual comparison, 21 pages | **Done**: diagrams need updates, app unchanged (`UML_DIAGRAM_VALIDATION.md`) |
| Data-changing flows | Manual script for the tester (`MANUAL_TEST_SCRIPT.md`) | **Not yet run** (needs the local test stack, §6) |

**Defects found by testing in Week 9: 14. Fixed: 13 (frontend and test tooling). Open: 1 (backend, §5).**

All automated checks are **read-only**: they send GET requests and logins only, so they are safe to run against the shared database used by the deployed app. Every check is a script in `frontend/scripts/` that needs no new dependency (Node 22 and the installed Google Chrome).

---

## 2. Test environment

| Item | Value |
|---|---|
| Frontend | Vite dev server `http://localhost:5173` (journeys, resilience, responsive); `vite preview` for the production build check |
| Backend | Django on `http://127.0.0.1:8000`, `config.settings` → shared Supabase PostgreSQL |
| Browser | Google Chrome (headless, DevTools Protocol from Node) |
| Accounts | Student `demo1@demo.jnuverse.test`; operators `democlub1` (Robotics Club) and `democlub2` (other club); password `Demo-Pass-12345` |
| Data | Backend demo seed of 2026-11-28 (`d488455`) |

---

## 3. Automated suites

### 3.1 API contract (`npm run audit:api`)
Reads `openapi.yml` and every API call in `frontend/src`. It flags unknown paths, wrong methods, missing trailing slashes and backend operations that no screen uses.
- Final: **64 of 64 operations used, 81 call sites, 0 mismatches.** Every backend feature is reachable from the UI.
- The spec was regenerated from the backend code and compared with the committed file: the operations and schemas are identical. Only the Swagger tag names differ (cosmetic, backend request 5).

### 3.2 Role permissions (`npm run audit:roles`)
Each GET operation the frontend uses is called as a visitor, a student, the club's own operator and another club's operator. The status code must match what the UI assumes (for example, students never see operator pages).

| Group | Operations | Visitor | Student | Own operator | Other operator |
|---|:---:|---|---|---|---|
| Public (clubs, events, notices, partners, interests, departments) | 9 | 200 | 200 | 200 | 200 |
| Any signed-in user (me, notifications, reports) | 4 | 401 | 200 | 200 | 200 |
| Student only (interests, joined/following/registered filters, membership, rating, dashboard, activity) | 8 | 401 | 200 | 403 | 403 |
| Any operator (collaborations, club dashboard, my club, club comparison) | 4 | 401 | 403 | 200 | 200 |
| This club's operator only (members, requests, registrations, rating summary, event reports) | 5 | 401 | 403 | 200 | 403 |

**120/120 checks pass.**

### 3.3 Resilience (`npm run test:resilience`)
| # | Check | Result |
|:---:|---|:---:|
| 1 | Unknown URL shows the Not Found page | PASS |
| 2 | Logged-out navbar shows only Overview, Explore Clubs, Events | PASS |
| 3 | Expired session on a student page → student login with notice, returns to the page after login | PASS |
| 4 | Session notice shown only once | PASS |
| 5 | Expired session on an operator page → operator login with notice, return path kept | PASS |
| 6 | Request slower than 4 s shows "Waking up the server…" | PASS |
| 7 | The notice clears when requests finish | PASS |
| 8 | Offline shows the offline notice | PASS |
| 9 | Back online hides it | PASS |

The page-crash fallback (error boundary) is checked at source level only. Triggering it needs a deliberately broken component.

### 3.4 Journeys (`npm run test:journeys`)
The script logs in through the real forms and compares what each screen shows with what the API returns for the same account.

| Journey | Checks | What is compared |
|---|:---:|---|
| Visitor | 4 | Club list, club profile without operator controls, no Report button, "log in to register" on events |
| Student | 11 | Dashboard sections and badges, next event, notification bell, My Clubs, activity score, My Registrations, My Reports, saved interests |
| Operator | 11 | Approved and pending counts, pending names, members, analytics figures, best-rated event, event report departments and totals, collaborations, notices |

### 3.5 Responsive and accessibility (`npm run audit:responsive`)
The audit covers 30 routes (9 visitor, 9 student, 12 operator) at 375 / 768 / 1024 / 1440 px. For each screen it waits until the page has really rendered, saves a full-page screenshot and checks: page overflow, elements past the viewport, tap targets under 24 px at 375 px (WCAG 2.5.8), images without alt text, unnamed buttons and links, unlabelled form fields, and JavaScript errors.

---

## 4. Responsive audit history

| Run | Screens | Findings | Action |
|---|:---:|---|---|
| 1 | 120 | Invalid: captured loading spinners on slow pages | Added a readiness wait |
| 2 | 120 | Operator navbar overflow at 1024 px, Members overflow at 768 px, 8 unlabelled fields, small tap targets, event page stuck loading | D4–D9 (§5) |
| 3 | 120 | 0 overflow, 0 unlabelled; operator Logout off-screen at 1440 px, 10 small links | D10–D11 |
| 4 | 60 (375 + 1440) | 0 overflow, 0 unlabelled, 0 errors; 4 small operator links at 375 px | D12 |
| 5 | 21 (operator 375 + student 1440) | **0 findings**; every screen ready (student dashboard 12.1 s) | — |

Run 4 first stopped responding after 28 screens because one browser command had no time limit. The scripts now fail any browser command after 60 s and record a stuck screen as a failure, so one slow page cannot block the run.

---

## 5. Defects found by testing

| # | Defect | Found by | Fix | Status |
|:---:|---|---|---|:---:|
| D1 | Approve/reject URL built from a variable (cannot be checked against the spec) | Contract audit | Two explicit calls | Fixed |
| D2 | Logged-out visitors saw the student-only "My Clubs" and "Activity" links | Resilience test | Links shown to students only | Fixed |
| D3 | "Session expired" notice never appeared in development (React StrictMode ran the initializer twice) | Resilience test | Flag cleared in an effect | Fixed |
| D4 | Event page stuck on "Loading event details…" when opened directly while signed in (since Week 6) | Responsive audit run 2 | Re-fetch when the session resolves | Fixed |
| D5 | Operator navbar overflowed at 1024 px (Logout off-screen) | Responsive audit run 2 | Compact navbar from `lg` | Fixed |
| D6 | Members page 28 px too wide at 768 px | Responsive audit run 2 | Metric cards stack until `lg` | Fixed |
| D7 | 8 search and filter fields had no accessible name | Responsive audit run 2 | `aria-label`s | Fixed |
| D8 | Carousel dots and small checkboxes below 24 px | Responsive audit run 2 | 24 px targets / clickable labels | Fixed |
| D9 | 12 dialogs: no Escape, no focus handling | Keyboard check | `DialogA11y` (focus in, trap, Escape, return) | Fixed |
| D10 | Operator Logout still off-screen from 1280 px | Responsive audit run 3 | Icon-only Explore Events; club name text hidden from `lg` | Fixed |
| D11 | 10 small standalone links at 375 px | Responsive audit run 3 | ≥ 24 px tall | Fixed |
| D12 | 4 small operator links at 375 px (Members "Public Page", Analytics "Event report", event report back link, event form breadcrumb) | Responsive audit run 4 | ≥ 24 px tall | Fixed |
| D13 | Audit scripts could hang forever on one browser command | Responsive audit run 4 | 60 s command timeout | Fixed (test tooling) |
| D14 | Student `attendance_rate` can exceed 100 % (demo1 116.7 %) | Backend delivery review | Backend request 7 | **Open (backend)** |

## 5a. Planned improvements delivered in Week 9

| Improvement | Before |
|---|---|
| Error boundary per route with Try again / Reload | A page crash showed a blank screen |
| Not Found page | Unknown URLs silently redirected to `/clubs` |
| "Waking up the server" and offline notices | No feedback during the free-tier cold start or when offline |
| Session-expired notice; operator pages go to the operator login; full return URL kept | Silent logout to the student login, query string lost |
| Route-level code splitting | 846 kB main bundle → 255 kB |
| "JnUVerse was updated" reload message | A tab left open across a deployment failed to load pages |
| Operator login uses `club` from the login response | One extra `/me` request per operator login |

---

## 6. Open items and risks

| Item | Owner | Impact | Next step |
|---|---|---|---|
| `attendance_rate` > 100 % in My Activity (request 7) | Atik | Wrong figure on one student report | Backend fix; the frontend shows the API value |
| Manual script for data-changing flows not yet run | Nabil + Anik | Writes (uploads, approvals, attendance, ratings, reports) are only checked by the backend tests and earlier manual QA | Run `MANUAL_TEST_SCRIPT.md` on the local test stack |
| Local test stack not set up on the frontend machine (no PostgreSQL; Windows-only guide; wrong demo password) | Atik (requests 8–9), Anik | Blocks the item above on macOS | Doc fixes, then install PostgreSQL |
| Signed-in pages take 5–9 s locally against the shared database | Team | Slow first impression; the student dashboard took over 15 s once during the audit | Measure on the deployed stack (Week 10) |
| UML diagrams out of date in 4 places (status codes, collaboration step, `ContentReport`, missing use cases) | UML designer | Report documentation only | Update per `UML_DIAGRAM_VALIDATION.md` |
| `openapi.yml` tags (request 5) | Either developer | Cosmetic | Regenerate the spec |

---

## 7. How to re-run

From `frontend/`, with the backend on port 8000 and `npm run dev` running:

```bash
npm run lint && npm run build
npm run audit:api          # contract (no servers needed)
npm run audit:roles        # role matrix (backend only)
npm run test:resilience    # headless Chrome
npm run test:journeys      # headless Chrome
npm run audit:responsive   # headless Chrome, ~120 screenshots; --widths 375,1440 --only student
```

Other accounts or servers: set `API_URL`, `APP_URL`, `STUDENT_LOGIN`, `OPERATOR_LOGIN`, `OTHER_OPERATOR_LOGIN`, `DEMO_PASSWORD`.
