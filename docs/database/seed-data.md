# Seed data (team review)
- Interests: seeded by `backend/apps/accounts/migrations/0002_seed_interests.py` (edit the `INTERESTS` list; add new ones via a new migration or Django admin).
- Departments: fixed list in `backend/apps/accounts/constants.py` (`DEPARTMENTS`); served by `GET /api/auth/departments/`.