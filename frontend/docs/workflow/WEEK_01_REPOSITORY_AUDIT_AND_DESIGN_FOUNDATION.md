# Week 01 — Repository Audit & Design Foundation

**Focus:** Project initialization, repository audit, design tokens centralization, and foundational component library  
**Stage:** Step 1 Foundation  
**Status:** **Completed**  
**Assigned:** Anik Khondokar (Frontend MVP Coder)  
**Last Verified:** October 2026  

---

## 1. Objectives
- Establish a maintainable frontend architecture supporting Google Stitch UI export designs.
- Audit repository structure, backend apps, and existing frontend configuration.
- Centralize Stitch color tokens, typography, radii, and elevations into Tailwind CSS.
- Build reusable UI primitives (`Button`, `Input`, `Card`, `Badge`, `ErrorAlert`, `LoadingState`, `EmptyState`).
- Verify build and linting pipelines with 0 errors.

## 2. Scope & Exclusions
- **In Scope:** Token mapping, Google Fonts setup, reusable component library, audit documentation, styling base pages.
- **Exclusions:** No mock servers, no alterations to backend Python files, no direct database queries, no premature implementation of Week 3+ screens.

## 3. Tasks Completed
1. [x] Inspected Google Stitch design export files in `docs/ui/stitch-export/`.
2. [x] Preconnected Plus Jakarta Sans and Google Material Symbols Outlined in `frontend/index.html`.
3. [x] Configured Stitch color palette (`canvas-base`, `primary`, `surface-lavender`, `border-subtle`, etc.) in `frontend/tailwind.config.js`.
4. [x] Added accessible `:focus-visible` styling and soft scrollbars in `frontend/src/index.css`.
5. [x] Implemented 7 reusable Stitch UI components (`Button`, `Input`, `Card`, `Badge`, `ErrorAlert`, `LoadingState`, `EmptyState`).
6. [x] Refactored `ProtectedRoute.jsx` with Stitch design language and `LoadingState`.
7. [x] Updated root `README.md` and compiled `backend/FRONTEND_REQUIREMENTS.md`.

## 4. Relevant Frontend Files
- [`frontend/index.html`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/index.html)
- [`frontend/tailwind.config.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/tailwind.config.js)
- [`frontend/src/index.css`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/index.css)
- [`frontend/src/components/Button.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Button.jsx)
- [`frontend/src/components/Input.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Input.jsx)
- [`frontend/src/components/Card.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Card.jsx)
- [`frontend/src/components/Badge.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Badge.jsx)
- [`frontend/src/components/ErrorAlert.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/ErrorAlert.jsx)
- [`frontend/src/components/LoadingState.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/LoadingState.jsx)
- [`frontend/src/components/EmptyState.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/EmptyState.jsx)

## 5. Backend Dependencies & Endpoints
- `GET /api/health/` — Verified health check returning `{"status": "ok", "project": "JnUVerse backend"}`.
- Running Django server on `http://127.0.0.1:8000`.

## 6. Acceptance Criteria
- [x] Design tokens centralized without ad-hoc hex colors.
- [x] All 7 UI primitives functional and styled.
- [x] Production build passes cleanly with no warnings/errors.
- [x] ESLint passes with 0 violations.

## 7. Verification Commands & Results
```bash
npm run lint    # PASSED (0 errors, 0 warnings)
npm run build   # PASSED (vite v5.4.21 bundle built in 1.12s)
curl http://127.0.0.1:8000/api/health/  # HTTP 200 OK
```

## 8. Decisions & Outstanding Questions
- **Decision:** Used Vanilla CSS keyframes with Tailwind utility classes rather than heavy animation libraries to maintain zero runtime bloat.
- **Decision:** University Admin role was removed; clubs are verified upon account creation.
