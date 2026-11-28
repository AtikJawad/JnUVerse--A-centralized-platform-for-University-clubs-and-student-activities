# Week 05 — Backend Handoff: Notices & Notifications

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Club Announcements, Student Notification Feeds & Audience Scoping  
**Status:** **Delivered by Backend & Integrated by Frontend** (updated 2026-11-28)  

---

> **Update 2026-11-28 (Anik):** The backend delivered this week with the contract in [`frontend/docs/backend-handoff/WEEK_05_BACKEND_HANDOFF.md`](../../../frontend/docs/backend-handoff/WEEK_05_BACKEND_HANDOFF.md), which supersedes the proposed endpoints below. The proposals are kept as the original request. Frontend integration: [`frontend/docs/workflow/WEEK_05_NOTICES_AND_NOTIFICATIONS.md`](../../../frontend/docs/workflow/WEEK_05_NOTICES_AND_NOTIFICATIONS.md).

## 1. Required Backend Capabilities
- Student notifications stream with unread status tracking.
- Club notice board with audience scoping (`public`, `followers`, `members`, `department`).
- Automatic notification creation on critical events (e.g. membership approved/rejected, upcoming registered event reminder).

## 2. Target Endpoints & Proposed Contracts

### A. Student Notifications: `GET /api/notifications/`
- **Auth:** `IsAuthenticated`
- **Query Params:** `?unread_only=true`
- **Payload:** `[{"id": "...", "title": "...", "message": "...", "link": "...", "created_at": "...", "read_at": null}]`

### B. Mark Notification as Read: `PATCH /api/notifications/<uuid>/read/`
- **Auth:** `IsAuthenticated` (Must own notification).
- **Behavior:** Updates `read_at = timezone.now()`.

### C. Club Notices: `GET /api/clubs/<slug>/notices/`
- **Auth:** Optional (`AllowAny` for public; scoped for followers/members).

### D. Publish Notice: `POST /api/clubs/<slug>/notices/`
- **Auth:** `IsClubOperator` + Club Owner.
- **Fields:** `title`, `content`, `audience_type`, `target_department` (optional).

## 3. Permissions & Privacy
- Notifications are private to the recipient user.
- Departmental notices are visible only to students enrolled in matching department.
