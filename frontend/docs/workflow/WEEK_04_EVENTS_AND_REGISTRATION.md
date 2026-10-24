# Week 04 — Events & Registration

**Focus:** Campus events discovery, event details, RSVP/registration workflow, and operator event management  
**Status:** **Not Started** (Backend models exist in `apps/events/`; DRF endpoints pending)  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  

---

## 1. Objectives
- Implement campus events calendar and card grid view.
- Implement detailed event page (venue, date/time, capacity, speaker info, flyer).
- Implement student event RSVP/registration button with capacity tracking.
- Implement event creation and management interface for club operators.

## 2. Scope & Exclusions
- **In Scope:** Event cards, event details, RSVP confirmation modal, operator event form.
- **Exclusions:** Post-event ratings (Week 6), Notices (Week 5).

## 3. Tasks (Planned)
1. [ ] Design event grid and filter by upcoming vs. past.
2. [ ] Build `EventDetail.jsx` with RSVP status.
3. [ ] Build operator event creation dialog with date pickers and capacity inputs.
4. [ ] Handle event registration cancellation.

## 4. Relevant Frontend Files (Targeted)
- `frontend/src/pages/Events.jsx`
- `frontend/src/pages/EventDetail.jsx`
- `frontend/src/pages/OperatorEvents.jsx`

## 5. Backend Dependencies & Endpoints Needed
- `GET /api/events/` (List published events; filter by club, upcoming)
- `GET /api/events/<uuid>/` (Event detail)
- `POST/PATCH /api/events/` (Operator create/edit event)
- `POST /api/events/<uuid>/register/` (Student RSVP)
- `DELETE /api/events/<uuid>/register/` (Cancel RSVP)

## 6. Acceptance Criteria
- [ ] Students can view events and register until max capacity is reached.
- [ ] Enforces unique student registration per event (database constraint).
- [ ] Operators can only manage events for their own club.

## 7. Verification Commands & Results
*(Pending backend endpoint implementation in Week 4)*

## 8. Decisions & Outstanding Questions
- **Question for Backend:** Will event registration generate a QR code / ticket token for check-in at the venue?
