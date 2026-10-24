# Week 08 — Five Analytical Reports

**Focus:** Implementation of five academic and operational analytical reports required by the software engineering course specification  
**Status:** **Not Started**  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  

---

## 1. Objectives
- Design and implement visual representations for the five course-mandated analytical reports:
  1. **Club Popularity & Student Engagement Trends** (Followers, active members).
  2. **Event Attendance vs. Capacity Utilization** (RSVP drop-off and attendance rates).
  3. **Departmental Participation Distribution** (Engagement across 38 JnU departments).
  4. **Post-Event Student Satisfaction Metrics** (Average star ratings breakdown).
  5. **Inter-Club Collaboration Frequency & Network Mapping**.

## 2. Scope & Exclusions
- **In Scope:** Report charting and tabular displays using vanilla CSS/SVG, CSV/PDF export buttons if applicable.
- **Exclusions:** Heavy third-party BI engines.

## 3. Tasks (Planned)
1. [ ] Confirm report queries with database designer and backend coder.
2. [ ] Build `ReportsHub.jsx` accessible to club operators.
3. [ ] Implement clean data visualization cards for each of the 5 reports.

## 4. Relevant Frontend Files (Targeted)
- `frontend/src/pages/ReportsHub.jsx`
- `frontend/src/components/ReportChartCard.jsx`

## 5. Backend Dependencies & Endpoints Needed
- `GET /api/analytics/club-popularity/`
- `GET /api/analytics/event-utilization/`
- `GET /api/analytics/department-distribution/`
- `GET /api/analytics/satisfaction-summary/`
- `GET /api/analytics/collaboration-summary/`

## 6. Acceptance Criteria
- [ ] All five required reports render accurate metrics.
- [ ] Filterable by semester or academic year.

## 7. Verification Commands & Results
*(Pending implementation in Week 8)*

## 8. Decisions & Outstanding Questions
- **Question for Team:** Which chart representation is preferred: lightweight SVG graphs or styled tabular summaries?
