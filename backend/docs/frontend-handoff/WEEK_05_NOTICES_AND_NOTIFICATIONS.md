# Week 05 — Backend Handoff: Notices & Notifications

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Club Announcements, Student Notification Feeds & Audience Scoping  
**Status:** **Pending Backend Implementation** (Models exist in `apps/notifications/`)  

---

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
