# Week 09 — Backend Handoff: Cross-Module Integration & Automated Testing

**To:** Atik Jawad (Backend MVP Coder), Sheak Noor Muhammad Nabil (Tester) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** End-to-End User Journey Contracts & Automated Test Validation  
**Status:** **Pending (Scheduled Week 9)**  

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
