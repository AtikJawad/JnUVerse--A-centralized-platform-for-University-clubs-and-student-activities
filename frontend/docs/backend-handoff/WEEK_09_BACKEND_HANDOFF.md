# Week 09 — Backend Handoff: Integration & Testing

**To:** Anik Khondokar (Frontend MVP Coder) & Development Team  
**From:** Backend (Atik Jawad / Claude implementation partner)  
**Topic:** Answers to the Week 9 requests, the new automated backend tests, and the local test stack  
**Status:** Delivered. Backend suite passes (reported 2026-11-28); frontend `npm run audit:api` is clean (64 of 64 operations matched). Browser QA and the integration report are pending the tester.

---

## 1. Answers to your open requests

| # | Request | Answer |
|:---:|---|---|
| 1 | Test database | **Done without a second Supabase.** A local-only stack uses its own empty PostgreSQL database and local image storage. Step-by-step instructions: `backend/docs/LOCAL_TEST_STACK.md`. |
| 2 | Re-seed demo data | Seed command updated; re-seed with `--reset` then without (see section 3). |
| 3 | Seed attendance | **Done.** Started events now have attended registrations; extra finished events were added so reports show data. |
| 4 | Spread students across departments | **Done.** The five demo students use three departments. The "Department workshop" demo notice now reaches demo1 and demo2 only. |
| 5 | Regenerate `openapi.yml` | Run from `backend/`: `python manage.py spectacular --file ../docs/api/openapi.yml`, then `npm run audit:api`. |
| 6 | `club` in the login response | **Done** (section 2). |

## 2. API change (the only one this week)

`POST /api/auth/login/` — for **club operators** the `user` object now also contains `club`, in the same shape as `GET /api/auth/me/`:

```json
{ "access": "...", "refresh": "...",
  "user": { "id": "...", "email": "club1@example.com", "role": "club_operator", "...": "...",
            "club": { "id": "...", "name": "...", "slug": "...", "description": "...",
                      "logo": null, "contact_email": "...", "is_verified": true } } }
```
Students are unchanged (no `club`). The frontend can drop the extra `/api/auth/me/` call after operator login. Nothing else was removed or renamed.

## 3. Demo data and local stack
- **Shared database:** `python manage.py seed_demo_events --reset --allow-remote`, then `python manage.py seed_demo_events --allow-remote`. All dates are relative to the moment you run it, so re-seed before the demo.
- **Local database (recommended for write tests):** follow `backend/docs/LOCAL_TEST_STACK.md`. Commands use `--settings=config.settings_local`, which refuses any non-local database. Logins: `club1@example.com` and `demo1..demo5@demo.jnuverse.test`, password `Str0ng-Pass-123`.
- Frontend checks: `npm run audit:api` needs nothing running. `npm run test:resilience` needs the backend and `npm run dev` running; on Windows set `CHROME_PATH` to your Chrome path first (details in the local stack doc).

## 4. New automated backend tests (`backend/tests/`)

| File | What it proves |
|---|---|
| `test_concurrency.py` | Simultaneous registrations for the last seat: exactly one succeeds and the rest get `409`; capacity is never exceeded; a double click by one student creates one registration. Runs real parallel requests on PostgreSQL. |
| `test_journeys.py` | The four handoff journeys end to end: student onboarding, club engagement, operator lifecycle (student email never exposed), event lifecycle through rating. |
| `test_no_server_errors.py` | Calls every API route automatically as anonymous, student and operator with invalid input (bad ids, wrong types, empty and junk bodies, bad query values). No response may be `500`. |

Run: `cd backend && python -m pytest`. **Result (2026-11-28):** all backend tests pass, including the three new files; the no-500 sweep found no server errors, so no further API fixes were needed.

## 5. Status codes (unchanged, enforced by the sweep)
`200` ok · `201` created · `204` deleted · `400` invalid input · `401` not logged in · `403` wrong role or someone else's object · `404` not found or hidden draft · `409` state conflict (full event, already reviewed, locked event) · `415` wrong content type (for example JSON sent to an image upload).
