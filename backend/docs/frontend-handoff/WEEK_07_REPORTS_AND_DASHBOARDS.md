# Week 07 — Backend Handoff: Content Moderation Reports & Dashboard Analytics

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Inappropriate Content Reports & Dashboard Aggregate Metrics  
**Status:** **Pending Backend Implementation** (Models exist in `apps/reports/`)  

---

## 1. Required Backend Capabilities
- Content reporting endpoint for authenticated students to report inappropriate clubs, events, or notices.
- Moderation resolution handled directly via Django Admin `/admin/` (no frontend staff UI required).
- Aggregated metrics endpoints for club operators (member totals, follower trends, event RSVPs).

## 2. Target Endpoints & Proposed Contracts

### A. Submit Content Report: `POST /api/reports/`
- **Auth:** `IsStudent`
- **Request Body (JSON):**
  ```json
  {
    "target_type": "club" | "event" | "notice",
    "target_id": "uuid-of-target",
    "reason": "inappropriate_content" | "harassment" | "spam" | "other",
    "description": "Details regarding the violation..."
  }
  ```
- **Response (HTTP 201 Created):**
  ```json
  {
    "id": "report-uuid",
    "status": "pending",
    "created_at": "2026-10-24T..."
  }
  ```

### B. Operator Dashboard Overview: `GET /api/clubs/<slug>/stats/`
- **Auth:** `IsClubOperator` + Club Owner
- **Response:**
  ```json
  {
    "total_followers": 240,
    "total_members": 48,
    "pending_membership_requests": 6,
    "active_events": 2,
    "total_event_rsvps": 185
  }
  ```

## 3. Permissions & Integrity
- Students can only submit reports for their own user ID (`reporter = request.user`).
- Duplicate unresolved reports on the exact same target by the same user return 409 Conflict.
