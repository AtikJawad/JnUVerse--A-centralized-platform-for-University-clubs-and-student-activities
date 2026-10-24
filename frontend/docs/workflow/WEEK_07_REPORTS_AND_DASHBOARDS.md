# Week 07 — Reports (Inappropriate Content) & Dashboards

**Focus:** Content moderation reporting for students and unified analytics dashboards for club operators  
**Status:** **Not Started** (Backend models exist in `apps/reports/`; DRF endpoints pending)  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  

---

## 1. Objectives
- Implement content reporting dialog allowing students to flag inappropriate clubs, events, or notices.
- Build comprehensive operator overview dashboard synthesizing membership growth, follower stats, and event registrations.
- Build student living campus dashboard with quick links to registered events and club updates.

## 2. Scope & Exclusions
- **In Scope:** Report submission modal, student living campus dashboard, club operator overview.
- **Exclusions:** Report resolution API (reports are resolved by university staff directly through Django Admin `/admin/`).

## 3. Tasks (Planned)
1. [ ] Build `ReportModal.jsx` with violation category choices and description.
2. [ ] Integrate `POST /api/reports/` for authenticated students.
3. [ ] Build Living Campus Student Dashboard (`pages/Dashboard.jsx`).
4. [ ] Build Operator Metrics Dashboard with summary cards and quick actions.

## 4. Relevant Frontend Files (Targeted)
- `frontend/src/components/ReportModal.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/OperatorDashboard.jsx`

## 5. Backend Dependencies & Endpoints Needed
- `POST /api/reports/` (Submit content report: target club, event, or notice, reason, details)
- `GET /api/clubs/<slug>/stats/` (Club operator analytics: member count, follower trends, event RSVPs)

## 6. Acceptance Criteria
- [ ] Students can submit reports with clear feedback without disrupting browsing.
- [ ] Duplicate unresolved reports on the same entity are handled gracefully.
- [ ] Operator dashboard displays accurate counts derived from backend models.

## 7. Verification Commands & Results
*(Pending backend endpoint implementation in Week 7)*

## 8. Decisions & Outstanding Questions
- **Decision:** As established in project architecture, report resolution is carried out exclusively through Django Admin by authorized staff, keeping frontend API footprint lean.
