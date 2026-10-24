# Week 03 — Club Discovery, Profiles & Membership Management

**Focus:** Club catalog explorer, search/pagination, club profile details, follow/unfollow toggle, student membership applications, and operator member management  
**Status:** **In Progress** (Backend Complete & Verified; Frontend Scheduled as Step 2)  
**Assigned:** Anik Khondokar (Frontend MVP Coder)  
**Target:** October 2026  

---

## 1. Objectives
- Implement the Club Explorer screen (`ExploreClubs.jsx`) consuming `GET /api/clubs/` with live search and pagination.
- Implement the detailed Club Profile view (`ClubDetail.jsx`) displaying verified badge, follower count, member count, and action controls.
- Implement student Follow / Unfollow toggle (`POST/DELETE /api/clubs/<slug>/follow/`).
- Implement the membership application workflow (`POST/GET/DELETE /api/clubs/<slug>/membership/`).
- Implement Club Operator Dashboard for reviewing pending membership requests and viewing approved members.
- Strictly enforce student privacy: never display or expose student email addresses to club operators.

## 2. Scope & Exclusions
- **In Scope:** `ExploreClubs.jsx`, `ClubDetail.jsx`, `MyClubs.jsx`, `OperatorMembers.jsx`, club cards, follow buttons, membership request dialogs.
- **Exclusions:** Events (Week 4), Notices (Week 5), Ratings (Week 6).

## 3. Planned Tasks
1. [ ] Build `ExploreClubs.jsx` using Stitch grid cards with search bar and pagination controls.
2. [ ] Build `ClubDetail.jsx` showing club description, social links, follower count, and membership status badge.
3. [ ] Wire interactive Follow/Unfollow toggle with optimistic state updates.
4. [ ] Build student Membership application modal with status preview (`pending`, `approved`, `rejected`).
5. [ ] Build `OperatorMembers.jsx` enabling club operators to approve/reject requests and remove members.
6. [ ] Implement "My Clubs" screen listing joined and followed clubs for students.

## 4. Relevant Frontend Files (Targeted)
- `frontend/src/pages/ExploreClubs.jsx`
- `frontend/src/pages/ClubDetail.jsx`
- `frontend/src/pages/MyClubs.jsx`
- `frontend/src/pages/OperatorMembers.jsx`
- `frontend/src/components/Card.jsx`
- `frontend/src/components/Badge.jsx`
- `frontend/src/components/Button.jsx`

## 5. Backend Dependencies & Endpoints
- `GET /api/clubs/` (Paginated, `?search=`, annotated with `follower_count`, `member_count`, `is_following`, `my_membership`)
- `GET /api/clubs/<slug>/` (Club detail)
- `PATCH /api/clubs/<slug>/` (Operator only: description, logo, contact_email)
- `POST/DELETE /api/clubs/<slug>/follow/` (Student follow/unfollow)
- `GET/POST/DELETE /api/clubs/<slug>/membership/` (Student membership status/request/leave)
- `GET /api/clubs/<slug>/members/` (Operator view: approved members; email omitted for privacy)
- `GET /api/clubs/<slug>/membership-requests/` (Operator view: pending requests)
- `POST /api/clubs/<slug>/memberships/<uuid>/approve/` (Approve request)
- `POST /api/clubs/<slug>/memberships/<uuid>/reject/` (Reject request)
- `DELETE /api/clubs/<slug>/memberships/<uuid>/` (Remove approved member)

## 6. Acceptance Criteria
- [ ] Students can browse and search verified JnU clubs.
- [ ] Students can follow/unfollow with real-time follower count updates.
- [ ] Students can submit membership requests and see `pending` status.
- [ ] Club operators can approve or reject pending requests.
- [ ] Operator member list strictly omits student email addresses.
- [ ] Unauthorized users cannot perform operator actions.

## 7. Verification Commands & Results
```bash
# Backend endpoints already verified:
curl -s http://127.0.0.1:8000/api/clubs/ | grep "JnU Research Society"
# Status: HTTP 200 OK
```

## 8. Decisions & Outstanding Questions
- **Question for Backend:** Should the student's joined clubs list be retrieved via a query parameter (e.g. `GET /api/clubs/?filter=my-clubs`) or a dedicated endpoint?
- **Decision:** Club operator actions require `role === 'club_operator'` and ownership verification via `ProtectedRoute`.
