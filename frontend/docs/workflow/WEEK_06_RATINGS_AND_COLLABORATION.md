# Week 06 — Ratings & Collaboration

**Focus:** Post-event attendee ratings (numeric 1–5 stars only) and inter-club collaboration requests  
**Status:** **Not Started** (Backend models exist in `apps/feedback/` and `apps/collaborations/`; DRF endpoints pending)  
**Assigned:** Anik Khondokar (Frontend MVP Coder) & Atik Jawad (Backend MVP Coder)  

---

## 1. Objectives
- Implement post-event rating submission dialog for verified event attendees.
- **Strict Requirement:** Ratings are numeric only (1 to 5 stars). No written comment or text review fields.
- Display aggregated event rating average and total count on event cards and detail pages.
- Implement inter-club collaboration requests management for club operators.

## 2. Scope & Exclusions
- **In Scope:** 5-star interactive rating widget, aggregate star score badge, collaboration request submission and response panel.
- **Exclusions:** Written text reviews or comment moderation (explicitly prohibited by project architecture to prevent harassment).

## 3. Tasks (Planned)
1. [ ] Build accessible 5-star rating component with hover and selection states.
2. [ ] Integrate rating submission: restricted to authenticated students who registered for the event.
3. [ ] Display event rating summary (`rating_average`, `rating_count`).
4. [ ] Build `Collaborations.jsx` in the Club Operator dashboard.
5. [ ] Operator form to propose joint events to another JnU club.

## 4. Relevant Frontend Files (Targeted)
- `frontend/src/components/StarRating.jsx`
- `frontend/src/pages/OperatorCollaborations.jsx`

## 5. Backend Dependencies & Endpoints Needed
- `POST /api/events/<uuid>/ratings/` (Submit rating: integer 1–5 only)
- `GET /api/events/<uuid>/ratings/summary/` (Aggregate rating statistics)
- `GET /api/collaborations/` (List sent/received collaboration requests)
- `POST /api/collaborations/` (Create collaboration request)
- `POST /api/collaborations/<uuid>/respond/` (Accept/Reject request)

## 6. Acceptance Criteria
- [ ] Non-attendees cannot submit ratings.
- [ ] One rating submission per student per event.
- [ ] No free-text inputs present on the rating form.
- [ ] Operators cannot collaborate with their own club.

## 7. Verification Commands & Results
*(Pending backend endpoint implementation in Week 6)*

## 8. Decisions & Outstanding Questions
- **Architectural Mandate:** `EventRating` contains only `rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])`. Zero text comment storage.
