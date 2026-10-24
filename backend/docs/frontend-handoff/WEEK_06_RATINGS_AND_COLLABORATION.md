# Week 06 — Backend Handoff: Ratings & Inter-Club Collaborations

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Numeric Event Ratings (1–5 Stars Only) & Inter-Club Collaboration Requests  
**Status:** **Pending Backend Implementation** (Models exist in `apps/feedback/` and `apps/collaborations/`)  

---

## 1. Required Backend Capabilities

### A. Feedback / Event Ratings
- **Strict Architecture Mandate:** Feedback is **numeric only** (1 to 5 integer rating).
- **Prohibited:** No text comments, review bodies, or written feedback (eliminates harassment and moderation overhead).
- **Eligibility:** Restricted to `IsStudent` who attended / registered for the event.
- **Uniqueness:** One rating per student per event (`unique_together = ('event', 'student')`).

### B. Inter-Club Collaborations
- Club operators can propose collaborative joint initiatives to other clubs.
- Anti-self-request constraint: A club cannot send a collaboration request to itself (`initiator != receiver`).
- Status workflow: `pending` -> `accepted` | `rejected`.

## 2. Target Endpoints & Proposed Contracts

### A. Submit Event Rating: `POST /api/events/<uuid>/ratings/`
- **Auth:** `IsStudent`
- **Request Body:**
  ```json
  {
    "rating": 5
  }
  ```
- **Validation:** Returns 400 if rating < 1 or > 5; returns 403 if student did not register for the event.

### B. Event Rating Summary: `GET /api/events/<uuid>/ratings/summary/`
- **Auth:** None (`AllowAny`)
- **Response:**
  ```json
  {
    "average_rating": 4.6,
    "total_ratings": 38
  }
  ```

### C. Create Collaboration Request: `POST /api/collaborations/`
- **Auth:** `IsClubOperator`
- **Body:** `{"receiver_club_id": "...", "title": "...", "description": "..."}`

### D. Respond to Collaboration: `POST /api/collaborations/<uuid>/respond/`
- **Auth:** `IsClubOperator` (Must own receiving club).
- **Body:** `{"status": "accepted" | "rejected"}`
