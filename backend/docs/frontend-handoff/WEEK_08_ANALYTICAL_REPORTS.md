# Week 08 — Backend Handoff: Five Analytical Reports

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Course-Mandated Five Analytical Reports Data Endpoints  
**Status:** **Pending Implementation (Scheduled Week 8)**  

---

## 1. Required Backend Capabilities
The course requires five distinct analytical reports across university clubs and activities:
1. **Club Popularity & Membership Growth:** Count of followers and approved members grouped by month/semester.
2. **Event Attendance vs. Capacity Utilization:** Registered students vs. capacity per event.
3. **Departmental Participation:** Distribution of student club memberships across the 38 JnU departments.
4. **Post-Event Satisfaction:** Average rating (1–5) and rating distribution per event/club.
5. **Collaboration Network:** Matrix of inter-club joint initiatives and proposals.

## 2. Target Endpoints
- `GET /api/analytics/club-growth/?club=<slug>`
- `GET /api/analytics/event-utilization/`
- `GET /api/analytics/department-breakdown/`
- `GET /api/analytics/satisfaction/`
- `GET /api/analytics/collaborations/`

## 3. Permissions
- Restricted to authenticated club operators and staff.
