# Week 03 — Backend Handoff: Club Discovery, Profiles & Memberships

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Club Catalog, Search, Follow/Unfollow, and Member Management Contracts  
**Status:** **Backend Completed & Verified; Frontend Pending Step 2**  

---

## 1. Required Backend Capabilities
- Searchable, paginated club catalog with counts annotated directly on club models.
- Student follow and unfollow toggling.
- Student membership application lifecycle (`pending` -> `approved` / `rejected` -> `left` / `removed`).
- Club operator queue for pending membership requests and list of approved members.
- Strict data privacy: **Never disclose student email addresses to club operators**.

## 2. Existing Verified API Endpoints & Contracts

### A. Club Discovery: `GET /api/clubs/`
- **Auth:** Optional (`AllowAny`). When authenticated as student, annotates personal relationship.
- **Query Params:** `?page=1&page_size=20&search=<term>`
- **Verified Response (HTTP 200 OK):**
  ```json
  {
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": "ff048ff6-fe8f-4b5a-83c2-8842952aa6d5",
        "name": "JnU Research Society",
        "slug": "jnu-research-society",
        "description": "Research club",
        "logo": "",
        "contact_email": "",
        "is_verified": true,
        "follower_count": 0,
        "member_count": 0,
        "is_following": false,
        "my_membership": null,
        "created_at": "2026-10-21T12:45:17.099384+06:00"
      }
    ]
  }
  ```

### B. Club Detail: `GET /api/clubs/<slug>/`
- **Auth:** Optional (`AllowAny`). Returns detailed club profile.

### C. Club Profile Update: `PATCH /api/clubs/<slug>/`
- **Auth:** `IsClubOperator` + Club Owner.
- **Allowed Fields:** `description`, `logo`, `contact_email`. Other fields rejected.

### D. Club Follow / Unfollow:
- **`POST /api/clubs/<slug>/follow/`** (Auth: `IsStudent`): Returns `{"following": true, "follower_count": int}` (201 or 200).
- **`DELETE /api/clubs/<slug>/follow/`** (Auth: `IsStudent`): Returns 204 No Content.

### E. Student Membership Lifecycle:
- **`GET /api/clubs/<slug>/membership/`** (Auth: `IsStudent`): Checks personal membership status (`status: "pending" | "approved" | null`).
- **`POST /api/clubs/<slug>/membership/`** (Auth: `IsStudent`): Submits membership join request. Returns 201/200.
- **`DELETE /api/clubs/<slug>/membership/`** (Auth: `IsStudent`): Cancels request or leaves club (`status: "left"`). Returns 204 No Content.

### F. Operator Member Management:
- **`GET /api/clubs/<slug>/membership-requests/`** (Auth: `IsClubOperator` + Owner): Paginated list of pending requests.
- **`GET /api/clubs/<slug>/members/`** (Auth: `IsClubOperator` + Owner): Paginated list of approved members.
- **`POST /api/clubs/<slug>/memberships/<uuid>/approve/`**: Transition from `pending` to `approved`.
- **`POST /api/clubs/<slug>/memberships/<uuid>/reject/`**: Transition from `pending` to `rejected`.
- **`DELETE /api/clubs/<slug>/memberships/<uuid>/`**: Transition from `approved` to `removed`.

## 3. Data Privacy Constraint (Mandatory)
Club operators must **never** receive student email addresses. `MembershipSerializer` must strictly serialize only:
```json
{
  "id": "uuid",
  "student_id": "B220305043",
  "name": "Atik Jawad",
  "department": "Computer Science and Engineering (CSE)",
  "batch": 22,
  "status": "approved",
  "requested_at": "2026-10-21T...",
  "reviewed_at": "2026-10-22T..."
}
```

## 4. Open Questions for Backend Developer
1. **Student "My Clubs" List:** Can backend provide a filter `GET /api/clubs/?joined=true` or dedicated `GET /api/clubs/my/` for the student portal?
2. **Club Categories:** Is a taxonomy field (e.g. `category = "tech" | "cultural" | "research"`) planned for `Club`, or should frontend rely on name search?
