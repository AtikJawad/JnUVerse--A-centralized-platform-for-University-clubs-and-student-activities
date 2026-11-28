# JnUVerse — UML Diagram Validation (Frontend Input, Week 9 Stage 6)

**For:** the team member updating `docs/uml/UML_Diagrams.pdf`, with Atik Jawad (backend) and Sheak Noor Muhammad Nabil (tester)  
**Checked by:** Anik Khondokar (frontend), 2026-11-28  
**Compared against:** the running application (frontend routes, `src/services/api.js`), `docs/api/openapi.yml` and the backend code at `d0cc389`  
**Diagram file:** `docs/uml/UML_Diagrams.pdf`, 21 pages (report pages 37–57): 4 use case, 5 class, 6 sequence and 6 activity diagrams

The tables list what the diagrams show, where it lives in the app, and every point where the diagrams differ from what was built. **Nothing here asks for a code change.** The diagrams should be updated to match the implementation, which is tested and agreed with the backend.

---

## 1. Summary

| Diagram set | Pages | Matches | Differs | Missing from the diagrams |
|---|:---:|---|---|---|
| Use case | 1–4 | Account, discovery, events, notices, collaboration, club management | **1** (Attach Related Event, p3) | 20 use cases (§2.2) |
| Class | 5–9 | All 5 areas: entities and relations | 1 attribute type (Club logo) | `ContentReport` class; 8 attributes (§3) |
| Sequence | 10–15 | Message order in all 6 | **4 wrong HTTP status codes** (§4) | 9 alternative flows, 1 error code (S6) |
| Activity | 16–21 | All 6 main flows | — | Alternative branches in all 6 (§5) |

**Priority for the update (most to least important):**
1. **p3 Collaboration use case:** "Attach Related Event" is drawn as part of *responding* to a request. In the app it belongs to *sending* one (§2.3).
2. **Sequence status codes on p10, p11, p12 and p13** (§4). These are the codes the frontend actually handles; a reader building against the diagrams would handle the wrong ones.
3. **Missing class `ContentReport` and the attendance attribute** (§3). Reports 3–5 depend on attendance.
4. **Missing use cases** (§2.2). Each one is a real screen.

---

## 2. Use case diagrams (pages 1–4)

### 2.1 Traceability: use case → screen → API

| Use case (diagram) | Actor | Screen (route) | API |
|---|---|---|---|
| Register as student | Student | Register (`/register`) | `POST /api/auth/register/student/` |
| Log in / Log out | Student, Operator | Login (`/login`, `/operator/login`) | `POST /api/auth/login/`, `/refresh/` (log out clears the tokens in the browser; there is no logout endpoint) |
| Choose interests | Student | Dashboard prompt (`/`), Profile (`/profile`) | `GET /api/auth/interests/`, `GET/PUT /api/auth/me/interests/` |
| Get club suggestions | Student | Dashboard "Find your community." (`/`) | `GET /api/dashboard/student/` (`suggested_clubs`) |
| Browse / search clubs | Visitor, Student | Explore Clubs (`/clubs`), Club profile (`/clubs/:slug`) | `GET /api/clubs/`, `GET /api/clubs/{slug}/` |
| Browse events | Visitor, Student | Events (`/events`), Event detail (`/events/:id`) | `GET /api/events/`, `GET /api/events/{id}/` |
| Register club (operator account) | Operator | Register Club (`/register/club`) | `POST /api/auth/register/club/` |
| Create / publish / cancel event | Operator | Operator Events (`/operator/events`, `/new`, `/:id/edit`) | `POST /api/events/`, `PATCH /api/events/{id}/`, `/publish/`, `/cancel/` |
| Post notice | Operator | Notices (`/operator/notices`) | `POST /api/notices/` |
| Approve / reject membership | Operator | Dashboard, Members (`/operator/members`) | `GET /api/clubs/{slug}/membership-requests/`, `POST /api/clubs/{slug}/memberships/{id}/approve/`, `.../reject/` |
| Edit club profile | Operator | Club profile → Edit (`/clubs/:slug`) | `PATCH /api/clubs/{slug}/` |
| Send / respond to collaboration | Operator | Collaborations (`/operator/collaborations`) | `POST /api/collaborations/`, `.../accept/`, `.../reject/` |
| View club dashboard | Operator | Operator Dashboard (`/`) | `GET /api/dashboard/club/` |

### 2.2 Use cases in the app that the diagrams do not show

| # | Use case | Actor | Screen (route) | API | Add to |
|:---:|---|---|---|---|---|
| U1 | Follow / unfollow a club | Student | Club profile, Dashboard | `POST/DELETE /api/clubs/{slug}/follow/` | p1 |
| U2 | Request membership / withdraw request / leave club | Student | Club profile, My Clubs (`/my-clubs`) | `POST/DELETE /api/clubs/{slug}/membership/` | p1 |
| U3 | Register for / cancel an event registration | Student | Event detail, Events → My Registrations | `POST/DELETE /api/events/{id}/register/` | p1 |
| U4 | Rate an attended event (and change the rating) | Student | Event detail, Dashboard "Rate your recent events." | `PUT /api/events/{id}/rating/` | p1 |
| U5 | View notices and notifications, mark as read | Student, Operator | Notifications (`/notifications`), bell | `GET /api/notices/`, `/api/notifications/…` | p1, p2 |
| U6 | Report a club or event | Student, Operator | Club profile, Event detail (Report button) | `POST /api/reports/` | p1, p4 |
| U7 | View my reports | Student, Operator | My Reports (`/my-reports`) | `GET /api/reports/` | p1, p4 |
| U8 | View student dashboard | Student | Dashboard (`/`) | `GET /api/dashboard/student/` | p1 |
| U9 | View my activity report | Student | My Activity (`/my-activity`) | `GET /api/analytics/student-activity/` | p1 |
| U10 | Edit event (registered students notified of time/venue changes) | Operator | Edit Event (`/operator/events/:id/edit`) | `PATCH /api/events/{id}/` | p2 |
| U11 | Upload / remove event banner | Operator | Create / Edit Event | `PUT/DELETE /api/events/{id}/banner/` | p2 |
| U12 | View registrations and mark attendance (ended events) | Operator | Attendees (`/operator/events/:id/attendees`) | `GET /api/events/{id}/registrations/`, `PUT /api/events/{id}/attendance/` | p2 |
| U13 | Edit / delete notice | Operator | Notices | `PATCH/DELETE /api/notices/{id}/` | p2 |
| U14 | View event report (department participation, post-event ratings) | Operator | Event analytics (`/operator/events/:id/analytics`) | `GET /api/analytics/events/{id}/department-participation/`, `/ratings/` | p2 |
| U15 | Cancel own pending collaboration request | Operator | Collaborations | `POST /api/collaborations/{id}/cancel/` | p3 |
| U16 | View partner clubs | Visitor, Student, Operator | Club profile (Partners) | `GET /api/clubs/{slug}/partners/` | p3 |
| U17 | Upload / remove club logo | Operator | Club profile → Edit ("Club Insignia & Logo") | `PUT/DELETE /api/clubs/{slug}/logo/` | p4 |
| U18 | Remove a member, view members | Operator | Members (`/operator/members`) | `GET /api/clubs/{slug}/members/`, `DELETE /api/clubs/{slug}/memberships/{id}/` | p4 |
| U19 | View club analytics (my club, club comparison) | Operator | Analytics (`/operator/analytics`) | `GET /api/analytics/my-club/`, `/club-comparison/` | p4 |
| U20 | Choose club interests (used for suggestions) | Operator | Club profile → Edit | `PATCH /api/clubs/{slug}/` (`interests`) | p4 |

Any signed-in user can report, but **not their own club or its events** (400 "You cannot report your own club or its events."; the Report button is hidden there). A second report of the same club or event returns 409 "You have already reported this."

### 2.3 Difference: "Attach Related Event" (page 3)

- **Diagram:** `Attach Related Event` *extends* `Respond to Collaboration Request`, with the condition "[accepted for a co-organized event]".
- **App:** the sender links an event **while sending** the request (optional `related_event`). It must be the sender's own event, published and not yet ended (`collaborations/serializers.py`, "You can only link your own events." / "Only published events that have not ended can be linked."). Accepting a request only records the two clubs as partners. No event becomes co-organized and the event is not changed.
- **Suggested change:** move the extension to `Send Collaboration Request` with the condition "[link one of our upcoming published events]". Remove "co-organized" from the diagram.

---

## 3. Class diagrams (pages 5–9)

| # | Class (page) | Diagram | Implementation | Suggested change |
|:---:|---|---|---|---|
| C1 | `Event` (p6) | No description, banner or creator | `description`, `banner` (image), `created_by` | Add the three attributes |
| C2 | `EventRegistration` (p6) | No attendance | `attended: bool` set by the operator after the event ends. Reports 3–5 use it. | Add `attended` |
| C3 | `Club` (p7) | `logo: URL` | Uploaded image `logo_image`. The API returns it as a URL (`logo`). | `logo_image: Image` (exposed as URL) |
| C4 | `Notice` (p8) | No creator or edit time | `created_by`, `updated_at` | Add both |
| C5 | `CollaborationRequest` (p9) | No description or creation time | `description`, `created_at`. Optional `related_event` must be the sender's own published event that has not ended. | Add both, plus a note on `related_event` |
| C6 | *(missing)* | — | `ContentReport`: reporter (User: student or operator) → club **or** event (exactly one), `reason` (inappropriate, spam, misleading, harassment, other), `details` (required for "other"), `status` (open, under_review, resolved, dismissed; the UI shows "open" as "Received"), `created_at`. One report per reporter per club or event. | New class on p6 or p7 |
| C7 | `Interest` links (p5, p7) | — | Both `StudentProfile` and `Club` have many-to-many `interests`; club suggestions match the two. | Confirm both links are drawn (Student ↔ Interest and Club ↔ Interest) |

---

## 4. Sequence diagrams (pages 10–15)

The message order is right in all six diagrams. The differences are the **response codes** and the **missing alternative flows**. The codes below are the ones the API returns and the frontend handles.

| # | Diagram (page) | Diagram shows | Implementation | Missing alternative flows |
|:---:|---|---|---|---|
| S1 | Student registration (p10) | No matching record → **403** | **400** with `non_field_errors`: "Student ID and email do not match a valid JnU student record." | Account already exists → 400 "An account already exists for this student." |
| S2 | Login (p11) | Invalid credentials → **401** | **400** "Invalid credentials." **401** is used only for an expired or missing token. | Successful operator login also returns the `club` |
| S3 | Event registration (p12) | Event full / cancelled → **400** | **409 Conflict** for full, not published, cancelled or already started. The seat check runs under a database row lock. | Already registered → 200 (no change); cancel registration (DELETE) |
| S4 | Rating (p13) | Not allowed → **400** | **403** not registered for the event. **409** event not published ("Only published events can be rated."), not ended ("You can rate this event after it ends.") or the 7-day window is over. **400** only for a value outside 1–5. | First rating → 201, change rating (PUT again) → 200 |
| S5 | Post notice (p14) | Matches | — | Audience "department" needs `target_department`; members-only notices reach members only |
| S6 | Collaboration (p15) | Pending duplicate not shown | **409** "A pending collaboration request already exists…". 400 for own club or an invalid linked event. | Requester notified on accept/reject; target notified on cancel; sender cancels (`/cancel/`) |

Event registration is **409** in the frontend handling as well: the event page shows the server message ("This event is full.") and does not show a generic error.

---

## 5. Activity diagrams (pages 16–21)

| # | Diagram (page) | Matches | Missing branches |
|:---:|---|---|---|
| A1 | Student registration (p16) | Yes: record check, account creation, interests, up to 5 suggestions | [already registered] → error; the interests step can be skipped ("Skip for now") and done later in Profile |
| A2 | Register for an event (p17) | [open] / [full] | [cancelled], [not published], [already started] → "cannot register"; [already registered] → no change. Cancel registration is a separate flow (frees the seat). |
| A3 | Rate an event (p18) | [allowed] / [denied] on "registered and 7-day window" | [already rated] → update the rating. The check also requires the event to have **ended** (not only the window). |
| A4 | Club membership (p19) | Request → review → approved / rejected | Operator is **notified** of the request; student is **notified** of the decision. [already pending / member] → no change. [rejected / left / removed] → may request again. Student may withdraw or leave; operator may remove an approved member (student notified). |
| A5 | Publish an event (p20) | Draft → publish → fork (show in list, notify followers and members) | Guard [draft only], [start time in the future]. Edit after publish → registered students notified when time/venue change. Cancel → registered students notified. |
| A6 | Collaboration request (p21) | [pending] → error, [none] → save and notify, accept / reject | [own club] → error; [linked event invalid] → error; requester **notified** of accept/reject; sender may **cancel** while pending (target notified); [accept] → clubs listed as partners |

---

## 6. How this was checked

- Every diagram page was rendered to an image and read alongside the app.
- Use cases were matched to routes in `frontend/src/App.jsx` and calls in `frontend/src/services/api.js`. The scripted contract audit confirms all 64 API operations (`npm run audit:api`).
- Status codes and branches were read from the backend views and serializers at `d0cc389`. They are also covered by the frontend's resilience and journey checks and the backend test suite.
- Nothing was written to the shared database for this check.
