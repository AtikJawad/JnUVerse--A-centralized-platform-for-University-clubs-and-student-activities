# Week 09 — Backend Handoff: Cross-Module Integration & Automated Testing

**To:** Atik Jawad (Backend MVP Coder), Sheak Noor Muhammad Nabil (Tester) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** End-to-End User Journey Contracts & Automated Test Validation  
**Status:** **In Progress — Frontend Stages 1–3 Done** (updated 2026-11-28)  

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

