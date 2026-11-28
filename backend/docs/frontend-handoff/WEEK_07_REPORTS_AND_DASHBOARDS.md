# Week 07 — Backend Handoff: Content Moderation Reports & Dashboard Analytics

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Inappropriate Content Reports & Dashboard Aggregate Metrics  
**Status:** **Delivered by Backend & Integrated by Frontend** (updated 2026-11-28)  

---

> **Update 2026-11-28 (Anik):** The backend delivered this week with the contract in [`frontend/docs/backend-handoff/WEEK_07_BACKEND_HANDOFF.md`](../../../frontend/docs/backend-handoff/WEEK_07_BACKEND_HANDOFF.md), which supersedes the proposed endpoints below. The proposals are kept as the original request. Frontend integration: [`frontend/docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md`](../../../frontend/docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md).

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

## Addendum — Club Logos & Event Banners (added before Week 7 frontend work)

Images are stored in Supabase Storage (public bucket); PostgreSQL keeps only the file path. Every response returns a **full, ready-to-use URL or `null`** — use it directly in `<img src>`. Always render a placeholder when it is `null`.

### What changed in existing responses
- `logo` (club object: club list/detail, dashboards, `/api/auth/me/` club, collaboration partners) is now `string | null` (previously `""` when empty). Legacy clubs that still have an old external logo URL keep returning it until a logo is uploaded.
- Event objects (list, detail, dashboards, register/rate responses) have a new `banner: string | null`.
- **Behaviour change:** `PATCH /api/clubs/{slug}/` no longer accepts `logo`. Use the logo endpoint below. `PATCH /api/events/{id}/` does not accept `banner`; use the banner endpoint.

### `PUT /api/clubs/{slug}/logo/` — upload or replace (club operator, own club only)
- `multipart/form-data` with one file field named **`logo`** (do not set `Content-Type` manually with `FormData`; the browser adds the boundary).
- Returns `200` with the full club object (`logo` = new URL).
- `DELETE /api/clubs/{slug}/logo/` → `204` (safe to repeat).

### `PUT /api/events/{id}/banner/` — upload or replace (club operator, own club's events only)
- `multipart/form-data` with one file field named **`banner`**. Returns `200` with the full event object.
- `DELETE /api/events/{id}/banner/` → `204`.
- Works for draft and published events. Cancelled or ended events return `409` (same rule as editing an event).

```js
const fd = new FormData();
fd.append("logo", fileInput.files[0]);          // "banner" for events
const res = await fetch(`${API}/api/clubs/${slug}/logo/`, {
  method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: fd });
```

### Rules and errors
| Rule | Value |
|---|---|
| Allowed types | JPEG, PNG, WebP (checked on file contents, not the extension) |
| Max size | Logo 2 MB, banner 5 MB |
| Max dimensions | 4096 px on the longest side |

- Invalid file, wrong type, too large or missing → `400 {"logo": ["..."]}` or `{"banner": ["..."]}`; show the message.
- Student → `403`. Another club's operator → `403`. Not logged in → `401`. Unknown club or someone else's draft event → `404`.
- Suggested UI: logo shown square (crop with `object-fit: cover`), banner about 16:9. Validate type and size in the browser too for faster feedback.
- Replacing an image changes its URL, so the old URL stops working; refresh from the response.

---

## Frontend Integration Status & Follow-ups (2026-11-28, Anik)

**Status:** Week 7 frontend completed (Stages 1–7, commit `2438ace`): interests, logo/banner upload, content reports, Student and Club Operator dashboards — see [`frontend/docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md`](../../../frontend/docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md).

### Requests for the backend
| # | Request | Why | Priority |
|:---:|---|---|:---:|
| 1 | **Re-seed the demo data** (`seed_demo_events --reset --allow-remote`, then `seed_demo_events --allow-remote`) | Time-based figures have expired: student dashboard shows 0 upcoming / 0 to rate, club dashboard 0 upcoming / 0 registrations in 7 days (handoff: 4 / 2 / 2 / 9). The re-seed also resets Robotics Club interests changed during QA (now include Entrepreneurship, Environment). | High (before demo) |
| 2 | *(Optional)* Include `club` in the `user` object of `POST /api/auth/login/` for club operators | Login returns the user without `club`; only `/api/auth/me/` has it. The frontend now calls `/me` after an operator logs in (works, one extra request). | Low |

### Changes made on the shared database during Week 7 testing
- Week 7 Stage 1 verification uploaded a test logo to `[DEMO] Robotics Club` and removed it immediately (logo back to `null`).
- Manual QA changed `[DEMO] Robotics Club` interests (now include Entrepreneurship and Environment). Other manual QA steps may also have changed `[DEMO]` data. The re-seed (request 1) restores all of it.

### Notes
- `PATCH /api/clubs/{slug}/` ignoring `logo` caused a silent no-op in the old club edit form; the frontend now uses the logo endpoint (no backend change needed).
- Axios sends `FormData` as JSON when the instance default `Content-Type: application/json` is set; the frontend overrides it to `multipart/form-data` for uploads (verified 415 → 200). No backend change needed.

