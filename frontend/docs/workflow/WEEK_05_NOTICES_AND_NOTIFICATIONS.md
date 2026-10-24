# Week 05 — Notices & Notifications

**Focus:** Club announcements/notices, student notification feed, unread indicators, and audience-targeted broadcasts  
**Status:** **Not Started** (Backend models exist in `apps/notifications/`; DRF endpoints pending)  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  

---

## 1. Objectives
- Implement the student notification feed with real-time unread badges.
- Implement notice board for clubs with audience filtering (public, followers, members, departmental).
- Implement mark-as-read and dismiss actions for notifications.
- Enable club operators to publish official notices.

## 2. Scope & Exclusions
- **In Scope:** Notification dropdown, full notifications view, notice publisher modal.
- **Exclusions:** Push notifications / WebSockets (unless scoped for later weeks).

## 3. Tasks (Planned)
1. [ ] Build notification bell component with unread counter in header.
2. [ ] Build `Notifications.jsx` list view with timestamp formatting.
3. [ ] Implement mark notification as read endpoint call.
4. [ ] Build `NoticeBoard.jsx` on club profile pages.
5. [ ] Operator notice creation form with audience selection.

## 4. Relevant Frontend Files (Targeted)
- `frontend/src/components/NotificationBell.jsx`
- `frontend/src/pages/Notifications.jsx`
- `frontend/src/pages/ClubNotices.jsx`

## 5. Backend Dependencies & Endpoints Needed
- `GET /api/notifications/` (Authenticated student notifications)
- `PATCH /api/notifications/<uuid>/read/` (Mark as read)
- `GET /api/clubs/<slug>/notices/` (List notices for club)
- `POST /api/clubs/<slug>/notices/` (Operator publish notice)

## 6. Acceptance Criteria
- [ ] Notifications render chronologically with distinct unread styling.
- [ ] Clicking a notification navigates to the associated club or event.
- [ ] Notice audience permissions strictly enforced by backend.

## 7. Verification Commands & Results
*(Pending backend endpoint implementation in Week 5)*

## 8. Decisions & Outstanding Questions
- **Question for Backend:** Should unread notification count be a lightweight summary endpoint (e.g. `GET /api/notifications/unread-count/`) to avoid fetching full payloads?
