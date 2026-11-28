# Week 10 — Backend Handoff: Production Delivery & Project Sign-Off

**To:** Full Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** Deployment Configuration, API Security Checklist & Final Course Submission  
**Status:** **Pending (Scheduled Week 10)**  

---

## 1. Required Capabilities
- Production environment configurations (`DEBUG = False`, `ALLOWED_HOSTS`, CORS whitelist).
- Secure secret management (environment variables for Django secret key and database URLs).
- Final database migrations verified cleanly against Supabase PostgreSQL.
- OpenAPI / Swagger documentation (served at `/api/docs/`, schema at `/api/schema/`) fully synced with frontend contracts — check with `cd frontend && npm run audit:api`.

## 2. Final Verification Checklist
- [ ] All 14 database constraints verified.
- [ ] No `.env` files or hardcoded credentials committed.
- [ ] Live demo scenario rehearsed between frontend and backend.

---

## 3. Known Frontend Requirements for Deployment (added 2026-11-28, Anik)

| # | Requirement | Current state / note |
|:---:|---|---|
| 1 | `CORS_ALLOWED_ORIGINS` includes `https://jnuverse.vercel.app` (and `http://localhost:5173` for development) | As documented in the Week 1–3 handoff; Vercel preview URLs are not included — demos must use the production domain. |
| 2 | `DJANGO_ALLOWED_HOSTS` includes the Render host `jnuverse-a-centralized-platform-for.onrender.com` | Required with `DEBUG = False`. |
| 3 | The frontend's `VITE_API_BASE_URL` on Vercel = `https://jnuverse-a-centralized-platform-for.onrender.com` (no trailing slash) | Baked in at build time; a Vercel redeploy is needed after changing it. |
| 4 | Keep-alive for the Render free tier stays enabled (`.github/workflows/render-keep-alive.yml`) | The frontend shows "Waking up the server…" after 4 s, but a warm server avoids a one-minute first load during the demo. |
| 5 | Re-seed demo data shortly before the demo (with attendance and varied departments) | Time-based demo figures expire after about 7 days; see the open requests in `backend/FRONTEND_REQUIREMENTS.md`. |
| 6 | Media storage: `USE_SUPABASE_STORAGE=True` on Render | Logo and banner URLs must be absolute and public (the frontend uses them directly in `<img src>`). |
| 7 | No secrets committed | Checked 2026-11-28: `backend/.env` and `frontend/.env*` are git-ignored; only `.env.example` files are tracked. |

