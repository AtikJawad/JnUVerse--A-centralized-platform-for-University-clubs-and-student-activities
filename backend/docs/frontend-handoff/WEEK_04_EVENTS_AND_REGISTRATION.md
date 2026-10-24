# Week 04 — Backend Handoff: Events & RSVP Registration

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Event Endpoints, Capacity Constraints & Registration API Contract  
**Status:** **Pending Backend Implementation** (Models exist in `apps/events/`)  

---

## 1. Required Backend Capabilities
- Public event discovery endpoint filtering by upcoming vs. past events, club slug, and date ranges.
- Event creation and updating restricted to `IsClubOperator` for their own club.
- RSVP registration restricted to `IsStudent` enforcing:
  1. Maximum attendee capacity checks (`remaining_capacity > 0`).
  2. Unique registration per student per event (`unique_together = ('event', 'student')`).
- Cancellation endpoint setting registration status to `cancelled`.

## 2. Target Endpoints & Proposed Contracts

### A. List Events: `GET /api/events/`
- **Auth:** None (`AllowAny`).
- **Query Params:** `?club=<slug>&upcoming=true&search=<title>`
- **Expected Payload:** Paginated list of events with `id`, `title`, `description`, `start_time`, `end_time`, `venue`, `capacity`, `registered_count`, `is_registered` (if student authenticated).

### B. Event Detail: `GET /api/events/<uuid>/`
- **Auth:** None (`AllowAny`). Detailed information, contact person, registration status.

### C. Create / Edit Event: `POST/PATCH /api/events/`
- **Auth:** `IsClubOperator` + Club Owner.
- **Fields:** `title`, `description`, `start_time`, `end_time`, `venue`, `capacity`, `banner_image`.

### D. Event RSVP: `POST /api/events/<uuid>/register/`
- **Auth:** `IsStudent`.
- **Validation:** Returns 400 if capacity reached or already registered.

### E. Cancel RSVP: `DELETE /api/events/<uuid>/register/`
- **Auth:** `IsStudent`. Returns 204 No Content.

## 3. Permissions & Role Restrictions
- Only `student` can register for events.
- Only `club_operator` can create/edit events.

## 4. Open Questions for Backend Developer
1. Will event registration generate a check-in token / QR code identifier?
2. Should published status be an explicit boolean (`is_published`) or derived from date?
