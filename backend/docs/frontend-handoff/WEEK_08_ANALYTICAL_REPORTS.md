# Week 08 — Five Analytical Reports (backend handoff)

Replaces the earlier draft list. These are the five reports the team selected. All are `GET`, JSON, JWT required (`Authorization: Bearer <access>`). Percentages are numbers with one decimal (`66.7`), or `null` when there is nothing to divide by (show "—"). Ratings are 1 to 5.

## Attendance (new, needed by reports 1, 3, 4, 5)
Registrations now have `attended` (boolean, default `false`). The club operator marks it:

`PUT /api/events/{id}/attendance/` (owning operator only)
```json
{ "registration_ids": ["<registration id>", "..."] }
```
- The listed registrations become attended; every other **current** registration of that event becomes not attended (so send the full set each time). `[]` clears all.
- Response `200`: `{ "registered": 12, "attended": 9 }`.
- `409` if the event is not published or has not started yet. `400` if an id is not a current registration of this event. `403` other club's operator or student. `404` unknown event or someone else's draft.
- Registration ids come from `GET /api/events/{id}/registrations/`, which now also returns `attended` per row.

## Definitions
- **Launched event:** published or cancelled (drafts are not launched). Cancelled events are counted as launched but not in registrations, attendance or ratings.
- **Completed event:** published and already ended.
- **Registration rate:** registrations ÷ total capacity, only over events that have a capacity.
- **Attendance rate:** attended ÷ registered, only over completed events.
- **Average rating:** average of all ratings given (not an average of per-event averages).

## 1. Department-wise participation (one event)
`GET /api/analytics/events/{id}/department-participation/` — owning operator. Event must be published and ended, else `409`.
```json
{ "event": {"id","title","starts_at","ends_at","club"},
  "totals": {"registered": 3, "attended": 2, "attendance_rate": 66.7},
  "departments": [ {"department": "English", "registered": 1, "attended": 1,
                    "attendance_rate": 100.0, "share_of_attended": 50.0} ] }
```
Only departments with at least one registration appear, most attended first. Suggested: bar chart of `attended` per department.

## 2. Post-event rating (one event)
`GET /api/analytics/events/{id}/ratings/` — owning operator. Published events only (`409` otherwise); events with no ratings return zeros.
```json
{ "event": {...}, "total_ratings": 2, "average": 4.5, "attended": 2, "response_rate": 100.0,
  "distribution": [ {"rating": 1, "count": 0, "percent": 0.0}, "... up to rating 5" ] }
```
`distribution` always has five rows (1 to 5). Suggested: bar chart.

## 3. Club vs club
`GET /api/analytics/club-comparison/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` — any club operator. The dates are optional and filter on event start date (`400` for a bad date or `date_to` before `date_from`).
```json
{ "period": {"date_from": null, "date_to": null},
  "clubs": [ {"club": {"id","name","slug"}, "is_mine": true, "events_launched": 3,
              "cancelled_events": 1, "completed_events": 1, "registrations": 3,
              "registration_rate": 75.0, "attended": 2, "attendance_rate": 66.7,
              "average_rating": 4.5, "rating_count": 2} ] }
```
All clubs are listed, including clubs with no events (zeros and nulls), most events first. Highlight the row with `is_mine`.

## 4. Student activity (the student's own)
`GET /api/analytics/student-activity/` — students only.
```json
{ "clubs_joined": 1, "clubs_followed": 0, "events_registered": 1, "events_attended": 1,
  "attendance_rate": 100.0, "ratings_given": 1, "activity_score": 3 }
```
`activity_score = clubs_joined + events_attended + ratings_given` (approved memberships only). `attendance_rate` is attended ÷ registered events that have ended.

## 5. A club's own report
`GET /api/analytics/my-club/?date_from=...&date_to=...` — club operator (own club).
```json
{ "club": {...}, "period": {...},
  "summary": {"events_launched","cancelled_events","completed_events","registrations",
              "registration_rate","attended","attendance_rate","average_rating","rating_count",
              "followers","members"},
  "monthly": [ {"month": "2026-11", "events_launched": 2, "registrations": 20,
                "attended": 15, "average_rating": 4.2} ],
  "events": [ {"id","title","starts_at","status","is_completed","capacity","registered",
               "fill_rate","attended","attendance_rate","average_rating","rating_count"} ],
  "best_rated_event": {"id","title","average_rating","rating_count"} }
```
`monthly` (by event start month, oldest first) is the improvement trend: draw it as a line chart. `events` is oldest first and is the per-event comparison table. `attendance_rate` per event is `null` until the event has ended. `best_rated_event` is `null` when nothing is rated.

## Errors
`401` not logged in · `403` wrong role or another club's event · `404` unknown event or someone else's draft · `409` event state does not allow the report · `400` bad date filter.
