# Week 09 — Backend Handoff: Cross-Module Integration & Automated Testing

**To:** Atik Jawad (Backend MVP Coder), Sheak Noor Muhammad Nabil (Tester) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** End-to-End User Journey Contracts & Automated Test Validation  
**Status:** **Backend Delivered (`d0cc389`) — Frontend Stages 1–3 Done; 3 New Requests** (updated 2026-11-28)  

---

## 1. Required Backend Capabilities
- Stable test fixtures and automated seeding scripts for full end-to-end user flows.
- Strict HTTP status code adherence across all modules (200, 201, 204, 400, 401, 403, 404, 409).
- Database constraint validation under concurrent requests (e.g., race conditions during last seat event registrations).

## 2. Integration Journey Test Scenarios
1. **Student Onboarding:** Pre-populated record check -> Registration -> Login -> Session re-hydration (`/me/`).
2. **Club Engagement:** Browse clubs -> Search -> Follow -> Request membership -> Status pending.
3. **Operator Lifecycle:** Operator login -> Review request queue -> Approve student -> Verify student email is NOT exposed.
4. **Event Lifecycle:** Operator publishes event -> Student registers -> Capacity decrements -> Attendee submits 1–5 star rating.

## 3. Testing Expectations
- Pytest test suite in `backend/tests/` passes with 100% success.
- Zero uncaught 500 Internal Server Errors under invalid client inputs.

---

## 4. Frontend Integration Findings & Requests (2026-11-28, Anik)

Frontend progress: [`frontend/docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md`](../../../frontend/docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md).

### 4.1 Contract audit (Stage 1)
- `npm run audit:api` (in `frontend/`) compares every frontend API call with `docs/api/openapi.yml`: **all 64 backend operations are used by the frontend; 0 unknown paths, 0 wrong methods, 0 missing trailing slashes.**
- `docs/api/openapi.yml` was compared with a spec regenerated from the current backend code (`manage.py spectacular --file <scratch>`): identical operations and schemas.

### 4.2 Requests for the backend
| # | Request | Why | Priority |
|:---:|---|---|:---:|
| 1 | **Test database for Week 9** (local PostgreSQL or a separate Supabase project) | The local backend `.env` points at the shared Supabase database used by the deployed app, so the frontend's automated checks are read-only. A separate database would allow automated tests of attendance, uploads, approvals and reports. | High |
| 2 | **Re-seed demo data** | See the Week 7 follow-up (expired time-based figures). | High |
| 3 | **Seed attendance and varied departments** | See the Week 8 follow-up. | High |
| 4 | *(Cosmetic)* Regenerate the committed `docs/api/openapi.yml` | It uses `api_`-prefixed `operationId`s and one `api` tag; the current backend generates per-app tags (`analytics`, `auth`, …), which group Swagger UI better. | Low |
| 5 | *(Optional)* `club` in the login response | See the Week 7 follow-up. | Low |

### 4.3 Frontend behaviour the backend team should know
- Requests pending for more than 4 s show "Waking up the server…" (Render free tier cold start).
- When `POST /api/auth/refresh/` fails, the user is signed out with a "session expired" message and returned to the page after logging in again; operator pages use `/operator/login`.
- Unknown routes show a 404 page; page errors show a recoverable fallback.

### 4.4 Journey scenarios (Section 2) — frontend status
| Scenario | Frontend status |
|---|---|
| 1. Student onboarding | Implemented; session restore and expiry verified in headless Chrome (`npm run test:resilience`). |
| 2. Club engagement | Implemented; read-only API checks pass; browser QA pending. |
| 3. Operator lifecycle | Implemented (Members page and inline approvals on the dashboard; no student emails shown); browser QA pending. |
| 4. Event lifecycle (incl. rating) | Implemented; ratings and attendance verified at API level; write steps pending a test database or manual QA. |

---

## 5. Review of the Week 9 Backend Delivery (2026-11-28, Anik)

Pulled `d488455` ("ReSeeded demo data") and `d0cc389` ("Week 9 Backend Complete…") and checked them against the running backend with read-only requests.

### 5.1 Verified
| Item | Result |
|---|---|
| Operator login includes `club` | **OK** — `user.club` present (democlub1 → `demo-robotics-club`), same keys as `/api/auth/me/`; student login unchanged. |
| Re-seed (dashboards) | **OK** — demo1: 4 upcoming, 3 to rate, 4 next events, 3 rating prompts; democlub1: 2 upcoming, 1 pending request, 1 pending collaboration, rating 4.2 (5), 9 registrations in 7 days. |
| Attendance seeded | **OK** — my-club: 7 attended, 77.8 %; Rated Workshop: 4/4 attended, response rate 75 %; club comparison has attendance and ratings for 6 clubs. |
| Departments spread | **OK** — Rated Workshop: Bangla 2, English 1, History 1. |
| Robotics interests restored | **OK** — Technology, Programming, Robotics. |
| Frontend compatibility | **OK** — `npm run audit:api` 64/64, 0 mismatches; `npm run test:resilience` 9/9. |
| Backend tests (`pytest`) | **Not run on the frontend machine** — no local PostgreSQL installed on the macOS machine yet. |

### 5.2 New requests
| # | Request | Priority |
|:---:|---|:---:|
| 7 | **`attendance_rate` in `GET /api/analytics/student-activity/` exceeds 100 %** (demo1: 116.7 %, `events_attended` 7). `StudentActivityView` divides *all* attended registrations by registrations of *ended* events; attended registrations of started-but-not-ended events inflate the numerator. Count attended registrations of ended published events in the numerator. | High |
| 8 | **`LOCAL_TEST_STACK.md` logins:** only `club1@example.com` gets `Str0ng-Pass-123`; `demo1…demo5` and `democlub1…5` get `Demo-Pass-12345` because `bootstrap_local_demo` does not pass `--password` to `seed_demo_events`. Fix the command or the doc. | Medium |
| 9 | **macOS variant of `LOCAL_TEST_STACK.md`** (Homebrew PostgreSQL, `source venv/bin/activate`, `export` instead of `$env:`). | Low |

### 5.3 Frontend follow-ups from this delivery
- Use `user.club` from the login response and keep `/api/auth/me/` only as a fallback (Week 9).
- Run the local stack for the write-flow QA once PostgreSQL is installed on the frontend machine.

### 5.4 Frontend Stage 4 update (2026-11-28)
- **Request 6 adopted:** the frontend now uses `user.club` from the operator login response; `/api/auth/me/` is only a fallback (verified: operator login = one request).
- **Shared database:** the Stage 4 responsive/accessibility audit was read-only apart from logging in as demo1 and democlub1 and opening/cancelling two dialogs (nothing submitted).
- No new backend requests from Stage 4; all Stage 4 defects were frontend-side (details in `frontend/docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md`).

