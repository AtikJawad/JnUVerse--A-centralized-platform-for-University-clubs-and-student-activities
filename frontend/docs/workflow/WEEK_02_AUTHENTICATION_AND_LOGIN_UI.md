# Week 02 — Authentication, Registration & Login UI

**Focus:** Student/Operator authentication, JWT lifecycle, token refresh queue, registration with registrar verification, Stitch login screen with animated orbital club icons  
**Status:** **Completed**  
**Assigned:** Anik Khondokar (Frontend MVP Coder)  
**Last Verified / Updated:** October 2026 (Orbital Floating Animation Added)  

---

## 1. Objectives
- Implement dual-identifier login supporting either JnU Student ID (e.g. `B220305043`) or student email.
- Implement student registration validating against pre-populated university registrar records.
- Implement robust JWT state management with Axios request interceptors and automatic 401 refresh retries.
- Build the Stitch-aligned Login page featuring the 7 floating orbital campus club nodes around the central JnU hub.
- Ensure full accessibility and `@media (prefers-reduced-motion: reduce)` support.

## 2. Scope & Exclusions
- **In Scope:** `Login.jsx`, `Register.jsx`, `AuthContext.jsx`, `api.js`, `ProtectedRoute.jsx`, orbital CSS keyframes, password visibility toggle, DRF error banner.
- **Exclusions:** No mock accounts, no alterations to Django auth serializers or User models, no manual bypass of registrar validation.

## 3. Tasks & Dated Progress
1. [x] **Auth Context & Interceptor Setup:** Built `AuthContext.jsx` with session restore (`GET /api/auth/me/`) and automatic token refresh queue in `services/api.js`.
2. [x] **Student Registration (`Register.jsx`):** Dynamically populated department choice field from `GET /api/auth/departments/`; added client-side regex extraction of batch from student ID (`B22...` -> 22); integrated inline DRF validation handling.
3. [x] **Login Screen Layout (`Login.jsx`):** Implemented dual-column layout with left form card and right Stitch presentation panel.
4. [x] **Orbital Club Icon Animation (Dated Update: October 2026):**
   - Configured 7 continuous floating keyframes (`orbit-float-1` to `orbit-float-7`) with independent durations (5.6s to 7.2s) and negative animation delays.
   - Preserved orbital positions: Node 1 (IT Club, top), Node 2 (Debating Society, top-left), Node 3 (Photographic Society, top-right), Node 4 (Tech Guild, far-right), Node 5 (Cultural Council, far-left), Node 6 (Science Society, bottom-left), Node 7 (Career Club, bottom-right).
   - Added restrained hover interaction: child icon scales (`hover:scale-110`, `hover:shadow-elevated`) without interfering with parent float keyframe.
   - Added full `@media (prefers-reduced-motion: reduce)` accessibility suppression.
5. [x] **Favicon Consistency & Multi-Format Fallback (`frontend/public/`):**
   - Designed standalone SVG favicon matching the exact rounded-squircle primary blue (`#2B34B9`) with centered white Material Symbols `hub` vector glyph and explicit `width="32" height="32"`.
   - Generated multi-resolution `favicon.ico` (16x16, 32x32, 48x48) via PIL containing the exact primary blue squircle and white hub geometry.
   - Linked `<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />` and `<link rel="alternate icon" href="/favicon.ico?v=2" />` in `frontend/index.html` to bust aggressive browser caches.
6. [x] **Reusable Brand Hub Mark (`frontend/src/components/JnUHubMark.jsx`):**
   - Created shared `JnUHubMark` component supporting `header` and `orbital` variants for strict brand visual consistency between Login and Registration without modifying the existing Login page.
7. [x] **Student Registration Page Redesign (`frontend/src/pages/Register.jsx`):**
   - Implemented responsive Google Stitch two-column desktop architecture: JnUVerse orbital showcase illustration on the left and complete student registration form on the right.
   - Stacks vertically on mobile viewports with form displayed first (`order-1 lg:order-2`).
   - Recreated orbital showcase with soft gradient card, 3 concentric rings, central `JnUHubMark` planet, 5 floating club nodes (`JnU IT Club`, `Debating Society`, `Photo Club`, `Cultural Cell`, `Athletics Wing`), `"Connect, Learn & Belong"` headline, and statistics badges (`4,200+ Enrolled Students`, `40+ Campus Guilds`).
   - Preserved 100% of live backend integration: `GET /api/auth/departments/` dynamic options, student ID batch inference (`B22...` -> 22), password toggle controls, DRF field error binding, and account creation via `POST /api/auth/register/student/`.
8. [x] **Registration UI Corrections (Dated Update: October 2026):**
   - **Removed Unwanted Header:** Stripped out `Academic Intake 2024–2025`, `Sign In Instead`, and associated `arrow_forward` icon.
   - **Fixed Two-Column Vertical Alignment:** Changed grid alignment to `items-start`, ensuring the left orbital illustration card and right registration form begin at the exact same vertical position.
   - **Balanced Desktop & Laptop Layout:** Tuned padding and column widths so the layout remains side-by-side with balanced heights and no overflow at desktop (~1440px) and laptop (~1024px) widths.
9. [x] **Login Page UI Refinement (Dated Update: October 2026):**
   - **Matched Floating Club Icon Labels with Registration:** Updated the orbiting nodes around the central JnUVerse hub to match the exact 5 club names, colors, and icons from `Register.jsx`: `JnU IT Club` (terminal, `#2B34B9`), `Debating Society` (record_voice_over, `#4285F4`), `Photo Club` (photo_camera, `#EA4335`), `Cultural Cell` (theater_comedy, `#9333EA`), and `Athletics Wing` (sports_soccer, `#D97706`), each with an accessible white pill badge label without colliding with the central JnU hub or neighboring icons.
   - **Reduced Login Card Width:** Tightened the form container from `max-w-md` (448px) to `max-w-[420px]`, centered inside its `lg:col-span-5` column, keeping balanced input spacing, readable typography, and complete responsive integrity on mobile (390px), laptop (1024px), and desktop (1440px).
10. [x] **Dedicated Club Operator Login Page ([`OperatorLogin.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorLogin.jsx)):**
    - **Distinct Authentication Gateway:** Created `/operator/login` tailored specifically for Club Operators while preserving `/login` as the default Student Login.
    - **Operator-Specific Content:** Heading *"Welcome back, Operator."*, subtitle *"Sign in to manage your campus club and events."*, primary CTA *"Sign In as Club Operator"*, and supporting text *"Authorized club operators only."*. Excludes all student-specific fields (Student ID, department, batch).
    - **Shared Backend API Contract:** Uses the existing shared `POST /api/auth/login/` endpoint passing `{ identifier: email, password }`.
    - **Post-Login Role Verification:** Enforces `user.role === "club_operator"`. If an authenticated account has a `student` role, the newly established session is immediately purged via `logout()`, access to operator features is blocked, and an explicit advisory is displayed directing the user to Student Login (`/login`).
    - **Inactive Account Feedback:** User-friendly presentation for inactive, suspended, or unapproved operator accounts without internal exception leaks.
    - **Cross-Platform Navigation Links:**
      - On [`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx): added *"Are you a Club Operator? Sign in here."* linking to `/operator/login`.
      - On [`OperatorLogin.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorLogin.jsx): added *"Are you a student? Student Login"* linking to `/login` and *"Need an account for your organization? Register your club"* linking to `/register/club`.
      - On [`RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx): updated *"Already registered? Operator Log in"* linking to `/operator/login`.

## 4. Relevant Frontend Files
- [`frontend/public/favicon.svg`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/public/favicon.svg)
- [`frontend/public/favicon.ico`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/public/favicon.ico)
- [`frontend/index.html`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/index.html)
- [`frontend/src/pages/Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx)
- [`frontend/src/pages/OperatorLogin.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorLogin.jsx)
- [`frontend/src/pages/Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx)
- [`frontend/src/pages/RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx)
- [`frontend/src/components/JnUHubMark.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/JnUHubMark.jsx)
- [`frontend/src/context/AuthContext.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/context/AuthContext.jsx)
- [`frontend/src/services/api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js)
- [`frontend/src/components/ProtectedRoute.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/ProtectedRoute.jsx)
- [`frontend/src/index.css`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/index.css)

## 5. Backend Dependencies & Endpoints
- `POST /api/auth/login/` (Identifier + password; returns access, refresh, user)
- `POST /api/auth/register/student/` (Student ID, email, department, batch, password)
- `POST /api/auth/refresh/` (SimpleJWT refresh token)
- `GET /api/auth/me/` (Current authenticated user profile)
- `GET /api/auth/departments/` (38 official academic departments)

## 6. Acceptance Criteria
- [x] Browser tab displays SVG and ICO favicons matching JnUVerse primary blue rounded squircle hub icon.
- [x] Unwanted registration header (`Academic Intake 2024–2025` and `Sign In Instead`) completely removed.
- [x] Registration page renders responsive two-column layout on desktop (1440px) and laptop (1024px) with illustration left, form right.
- [x] Both columns start at the exact same vertical position (`items-start`).
- [x] Registration page stacks gracefully on mobile (390px) with form prioritized on top.
- [x] Floating club icons on Login match Registration names: `JnU IT Club`, `Debating Society`, `Photo Club`, `Cultural Cell`, and `Athletics Wing`.
- [x] Each floating club node has a readable badge pill label with zero overlap onto central hub or neighbors.
- [x] Central JnU hub logo, orbital rings, icon design, colors, and floating animations preserved on Login.
- [x] Login card width reduced from `max-w-md` (448px) to balanced `max-w-[420px]` centered in its column.
- [x] Login succeeds with valid email or student ID.
- [x] Expired access token triggers seamless 401 refresh without logging the user out.
- [x] Real backend integration (departments, student ID batch inference, password visibility, DRF error handling) preserved intact.
- [x] Motion respects user reduced-motion OS preference.
- [x] `npm run lint` and `npm run build` pass with 0 errors.

## 7. Verification Commands & Results
```bash
# 1. Frontend Quality Checks
npm run lint    # PASSED (0 errors, 0 warnings)
npm run build   # PASSED (vite v5.4.21 bundle built in 1.25s)

# 2. Live API & Auth Verification (Against running backend on http://127.0.0.1:8000)
curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"identifier": "atikjawad@gmail.com", "password": "Str0ng-Pass-123"}'
# Result: HTTP 200 OK (returned access, refresh, and user profile)

curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"identifier": "B220305043", "password": "Str0ng-Pass-123"}'
# Result: HTTP 200 OK (dual-identifier login verified)

# 3. Favicon HTTP verification
curl -s -i "http://localhost:5173/favicon.svg?v=2"
# Result: HTTP 200 OK, Content-Type: image/svg+xml

curl -s -i "http://localhost:5173/favicon.ico?v=2"
# Result: HTTP 200 OK, Content-Type: image/x-icon
```

## 8. Decisions & Outstanding Questions
- **Decision:** Nested floating animation wrapper inside absolute-positioned coordinates to cleanly decouple orbital layout from the transform float keyframe and child hover scaling.
- **Decision:** Negative animation delays (`-1.2s` to `-4.1s`) guarantee icons appear mid-flight at varied positions on initial render.
- **Decision:** Grid container uses `items-start` rather than `items-center` so the showcase card and registration form begin at the exact same vertical coordinate.
- **Decision:** Provided both `favicon.svg` and `favicon.ico` with `?v=2` cache-busting to ensure cross-browser compatibility and bypass stale cached browser favicons.
- **Decision:** Mobile layout displays registration form first (`order-1 lg:order-2`), ensuring immediate keyboard focus and form access on smaller screens without scrolling through the illustration.
- **Decision:** Department list is dynamically loaded from `GET /api/auth/departments/` rather than hardcoded, maintaining strict synchronization with Django's 38 official university departments.

---

## 9. Task 10: Club Operator Registration Page Implementation

### Objective & Deliverable
Implemented the dedicated Club Operator Registration page ([`RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx)) as a direct sibling of the Student Registration page ([`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx)), sharing its clean typography, spacing, color tokens, orbital showcase, and responsive behavior.

### Routes Configured ([`App.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/App.jsx))
- Primary route: `/register/club` -> `<RegisterClub />`
- Alias redirects:
  - `/register-club` -> `<Navigate to="/register/club" replace />`
  - `/register/operator` -> `<Navigate to="/register/club" replace />`

### Layout Architecture & Design Decisions
1. **Desktop Grid (1440px & 1024px):**
   - Balanced 12-column grid (`lg:grid-cols-12`, left column `lg:col-span-6 xl:col-span-7`, right column `lg:col-span-6 xl:col-span-5`).
   - Strict top alignment (`items-start`) ensuring both the showcase card and registration form begin at the exact same vertical coordinate without vertical centering drift.
2. **Mobile Stacking (390px):**
   - Form renders first via `order-1 lg:order-2` for immediate user action and input focus without scrolling.
   - Orbital showcase renders second via `order-2 lg:order-1` below the form.
3. **Clean Form Presentation:**
   - Excluded unwanted Stitch artifacts (e.g., "Club Administration Portal • DRF API v1" badge, "Sign In Instead" arrow link above header).
   - Starts cleanly with `<h1>Register Club Operator<span className="text-primary">.</span></h1>` and a muted explanatory subtitle.
   - Primary submit button: `Register Club Operator` (full pill, 48px height, bold, arrow icon).
   - Centered footer switcher below the form: functional links to `/login` ("Already registered? Log in") and `/register` ("Looking to join as a student? Student Registration").
4. **Left Showcase Banner:**
   - Heading: `Empower Your Campus Society`
   - Verified static badges: `40+ Registered Societies` and `100% Council Synchronized`
   - Central `JnU` hub logo rendered via shared [`JnUHubMark`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/JnUHubMark.jsx) (`variant="orbital"`).
   - Five floating club nodes with labels: `JnU IT Club`, `Debating Society`, `Photo Club`, `Cultural Cell`, and `Athletics Wing`.
   - Dynamic 3-slide caption carousel highlighting event broadcasting, member management, and council synchronization with dot indicators.

### Backend Contract & Form Fields Preserved
Aligned directly with backend serializer `ClubRegistrationSerializer` (`POST /api/auth/register/club/`):
- `club_name`: Required text input, validated case-insensitively for uniqueness by backend.
- `email`: Required operator email input, validated for user account uniqueness.
- `description`: Optional textarea with 3-row height and "Max 300 words" helper note.
- `contact_email`: Optional email input for public club inquiries.
- `password`: Required password input with min 8 characters and visibility toggle.
- `password_confirm`: Required confirm password input with client-side mismatch check and visibility toggle.
- `agreedToTerms`: Required checkbox certifying executive authorization and agreement to Campus Society Guidelines.
- **Error Handling:** Granular field-level errors mapped directly from DRF response keys; general/non-field errors displayed in accessible [`ErrorAlert`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/ErrorAlert.jsx).
- **Success State:** Displays registered club name, slug, and navigation button to sign in.

### Files Modified / Created
- `frontend/src/pages/RegisterClub.jsx` (New component)
- `frontend/src/App.jsx` (Registered `/register/club` and alias redirects)
- `frontend/FRONTEND_README.md` (Updated component inventory and routing table)
- `frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md` (Updated workflow documentation)

### Verification Results
- **`npm run lint`:** PASSED (0 errors, 0 warnings).
- **`npm run build`:** PASSED (production bundle built in 1.28s).
- **Visual Browser Verification:**
  - Desktop (1440x900): Aligned tops, two-column layout, orbital banner on left, form on right.
  - Laptop (1024x768): Balanced two-column grid, no cramped fields or clipping.
  - Mobile (390x844): Single-column stacked layout, form first, showcase second, zero horizontal overflow.

---

## 10. Task 11: Cross-Linking Club Operator Registration from Login & Student Registration

### Objective & Deliverable
Integrated visible, accessible navigation pathways to the Club Operator Registration page (`/register/club`) from both the Login page ([`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx)) and Student Registration page ([`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx)).

### Navigation Additions
1. **Login Page ([`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx)):**
   - Replaced static muted text with an interactive React Router `<Link>`:
     - Text: `"Want to manage your club? Register as a Club Operator."`
     - Destination: `/register/club`
     - Style: `text-xs sm:text-sm text-text-muted`, link styled with `font-bold text-primary hover:underline underline-offset-4 ml-1`.
   - Preserves orbital animation, form controls, and the existing `"Register as Student"` link.
2. **Student Registration Page ([`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx)):**
   - Added a clear secondary link in the footer switcher:
     - Text: `"Registering a club instead? Register as a Club Operator."`
     - Destination: `/register/club`
     - Style: `text-xs text-text-muted`, link styled with `font-bold text-primary hover:underline ml-1`.
   - Preserves the primary `"Already have an account? Log in"` navigation and academic registrar validation workflows.
3. **Route Reuse ([`App.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/App.jsx)):**
   - Confirmed `/register/club` was already registered in Task 10; reused directly with zero duplicate routes.

### Files Modified
- [`frontend/src/pages/Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx)
- [`frontend/src/pages/Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx)
- [`frontend/FRONTEND_README.md`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/FRONTEND_README.md)
- [`frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md)

### Verification Results
- **`npm run lint`:** PASSED (0 errors, 0 warnings).
- **`npm run build`:** PASSED (Vite production bundle built in 1.39s).
- **Visual Screenshots:**
  - Login Desktop (1440x900) & Mobile (390x950): Both links rendered cleanly with balanced typography.
  - Student Registration Desktop (1440x900) & Mobile (390x1200): "Register as a Club Operator" link displayed cleanly below "Already have an account? Log in".
- **Browser Subagent Limitation Note:** Headless browser subagent hit CDP environment limitation (`Browser.setDownloadBehavior: Browser context management is not supported`), resolved via headless CLI Chrome screenshot verification.

---

## 11. Task 12: Header Navigation Cleanup & Testing Policy Update

### Objective & Deliverable
1. **Clean Top Navigation Headers:** Cleaned up the top navigation headers across all three public authentication and onboarding pages ([`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx), [`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx), [`RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx)).
2. **Updated Verification Policy:** Formally adopted a streamlined, token-efficient testing policy focusing on static contract inspection and npm lint/build validation while discontinuing automatic browser launching and screenshot automation.

### Header Cleanup Details
- **Items Removed:**
  - `Community Gateway` badge removed from all three page headers.
  - `Back to Portal` link/button removed from all three page headers.
  - Unused `Badge` imports safely purged to maintain strict ESLint compliance.
- **Brand Preservation:** The primary `JnUVerse` brand logo link (with hub mark) is cleanly retained as the sole header element in each view.
- **Visual & Layout Continuity:** Form positions, cards, input styling, responsive stacking, orbital banners, floating club animations, and cross-registration footer links remain completely untouched.

### Testing & Verification Policy Established
- **Default Strategy:**
  1. Inspect source code and contract consistency.
  2. Run `npm run lint` and `npm run build` from the `frontend/` directory.
  3. Skip automatic Chrome launches, headless screenshot captures, and browser subagent executions by default.
  4. Perform visual/browser testing only upon explicit user request (or ask beforehand if critical).

### Files Modified
- [`frontend/src/pages/Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx)
- [`frontend/src/pages/Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx)
- [`frontend/src/pages/RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx)
- [`frontend/FRONTEND_README.md`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/FRONTEND_README.md)
- [`frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md)

### Verification Results
- **`npm run lint`:** PASSED (0 errors, 0 warnings).
- **`npm run build`:** PASSED (Vite production bundle built cleanly in 2.07s).
- **Code Audit:** Verified that `"Community Gateway"` and `"Back to Portal"` have 0 occurrences across `frontend/src/`.

---

## 12. Task 13: Prepare Frontend for Vercel Deployment

### Objective & Deliverable
Prepare the existing React + Vite frontend for deployment to Vercel so teammates can publicly access the application and interact with the deployed Django REST Framework backend on Render (`https://jnuverse-a-centralized-platform-for.onrender.com`).

### 1. SPA Routing Configuration (`frontend/vercel.json`)
- React Router relies on client-side routing using the HTML5 History API. Direct requests or page reloads on subroutes such as `/login`, `/register`, and `/register/club` will cause static file hosts like Vercel to return a 404 error if not routed to `index.html`.
- Created [`frontend/vercel.json`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/vercel.json) with SPA rewrite rules:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

### 2. API Base URL Handling (`frontend/src/services/api.js`)
- **Public Backend Base URL:** `https://jnuverse-a-centralized-platform-for.onrender.com`
- **Normalization:** In [`frontend/src/services/api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js), the base URL assignment was defensively enhanced with `.replace(/\/+$/, "")` to eliminate potential trailing slashes before Axios prepends path endpoints.
- **Local Dev Fallback Preserved:** When `VITE_API_BASE_URL` is omitted, the API client defaults to `http://127.0.0.1:8000`.
- **Environment Template (`.env.example`):** Added a commented production example pointing to the Render backend service while leaving the local development URL active by default.
- **Secret Isolation:** Confirmed no backend credentials, DB connection strings, or sensitive API keys are exposed to Vite client environment variables.

### 3. Vercel Project Configuration & CLI Deployment
- **Deployment Method:** Executed direct local file upload via Vercel CLI (`npx -y vercel --yes`) without Git provider connection.
- **Project Linked:** `rebel-0c2e/jnuverse`
- **Environment Variable Configured:** `VITE_API_BASE_URL=https://jnuverse-a-centralized-platform-for.onrender.com` (Production & Preview).
- **Assigned Live Deployment:**
  - **Live URL:** [https://jnuverse.vercel.app](https://jnuverse.vercel.app)
  - **Direct Preview URL:** `https://jnuverse-4idyb8nc2-rebel-0c2e.vercel.app`
  - **Inspection Dashboard:** `https://vercel.com/rebel-0c2e/jnuverse/8VU3oJEroDbckBuSBFyeVMWD7YSa`

### 4. Render Backend CORS Configuration Requirements
The Django backend on Render enforces `CORS_ALLOWED_ORIGINS` (via `django-cors-headers`).
To allow the live Vercel frontend to communicate with the Render API, update the Render Web Service environment:
- **Render Dashboard:** JnUVerse Web Service -> **Environment**.
- **Update Variable:** `CORS_ALLOWED_ORIGINS`
- **Value:** `http://localhost:5173,https://jnuverse.vercel.app,https://jnuverse-4idyb8nc2-rebel-0c2e.vercel.app`

### Files Created & Modified
- **Created:**
  - [`frontend/vercel.json`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/vercel.json) (SPA URL rewrites)
  - [`frontend/.vercelignore`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/.vercelignore) (Explicit exclusion of `.env`, `.env.*`, `node_modules`, `.vercel`)
- **Modified:**
  - [`frontend/src/services/api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js)
  - [`frontend/.env.example`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/.env.example)
  - [`frontend/FRONTEND_README.md`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/FRONTEND_README.md)
  - [`frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md)

### Verification Results
- **`npm run lint`:** PASSED (0 errors, 0 warnings).
- **`npm run build`:** PASSED (Vite production bundle built cleanly in 724ms).
- **HTTP Live Check (`curl -I https://jnuverse.vercel.app`):** `HTTP/2 200` OK.
- **SPA Rewrite Check (`curl -I https://jnuverse.vercel.app/register/club`):** `HTTP/2 200` OK (serves `index.html` inline).

---

## 13. Stage 1: Production Verification Audit

### Overview
A comprehensive read-only audit of the JnUVerse production deployments across Vercel (frontend) and Render (backend) was performed in October 2026 following initial deployment.

### 1. Verification of Frontend API Base URL
- **Production Asset:** The compiled JavaScript bundle served by `https://jnuverse.vercel.app/` (`/assets/index-Cj_65njv.js`) was inspected directly.
- **Evidence:** `Kp = "https://jnuverse-a-centralized-platform-for.onrender.com".replace(/\/+$/, "");` is statically inlined and passed to `axios.create({ baseURL: Kp })`.
- **Status:** **CONFIRMED**. The production frontend targets the live Render backend directly.

### 2. CORS Configuration Review
- **Origin Whitelist:** Render environment variable `CORS_ALLOWED_ORIGINS` was verified via live HTTP OPTIONS and GET preflights.
- **Evidence:**
  - `curl -s -i -X OPTIONS https://jnuverse-a-centralized-platform-for.onrender.com/api/auth/departments/ -H "Origin: https://jnuverse.vercel.app"` returned `HTTP/2 200` with `access-control-allow-origin: https://jnuverse.vercel.app`.
  - Preview origin `https://jnuverse-4idyb8nc2-rebel-0c2e.vercel.app` also returned `access-control-allow-origin: https://jnuverse-4idyb8nc2-rebel-0c2e.vercel.app`.
  - POST preflight on `/api/auth/login/` returned `HTTP/2 200` with authorized CORS headers.
- **Status:** **CONFIRMED & WORKING**. Cross-origin requests from Vercel to Render are active and permitted.

### 3. Review of Authentication, Registration, and Navigation Flows
| Flow / Subsystem | Status | Audit Findings |
|:---|:---:|:---|
| **Department List Retrieval** | **Confirmed Working** | `GET /api/auth/departments/` successfully returns 38 academic departments to populate the student registration dropdown. |
| **Render Health Check** | **Confirmed Working** | `GET /api/health/` returns `{"status":"ok","project":"JnUVerse backend"}` with HTTP 200. |
| **Vercel SPA Routing** | **Confirmed Working** | Direct navigation and reloads of `/login`, `/register`, and `/register/club` return HTTP 200 serving `index.html`. |
| **Student Registration** | **Code-Inspection Verified** | Frontend payload in `Register.jsx` aligns strictly with DRF `StudentRegisterSerializer` (format, batch inference, registrar check). Execution against live database unverified to preserve user data. |
| **Club Operator Registration** | **Code-Inspection Verified** | Frontend payload in `RegisterClub.jsx` aligns strictly with DRF `ClubRegisterSerializer` (creates club in `is_active=False` pending state). |
| **Login & JWT Token Handling** | **Code-Inspection Verified** | `AuthContext.jsx` manages access and refresh tokens in `localStorage`. Request interceptor attaches Bearer token; response interceptor queues requests during 401 refresh. |
| **Protected Routes (RBAC)** | **Code-Inspection Verified** | `ProtectedRoute.jsx` intercepts unauthenticated visits to `/` and `/dashboard`, redirecting to `/login`. Evaluates `user.role` against `allowedRoles`. |
| **Logout & Session Purge** | **Code-Inspection Verified** | `logout()` clears `localStorage` keys and state. Interceptor broadcasts `auth:logout` on unrecoverable token refresh failure. |

### 4. Configuration Risks & Issues Identified
- **Issue 1 (Severity: Low / Cosmetic):** Hardcoded fallback error message in `frontend/src/services/api.js` line 128:
  `"Unable to reach the server. Please verify the backend is running at http://127.0.0.1:8000."`
  *Risk:* When network interruptions or temporary outages occur in production, users see a message referencing localhost rather than a generic connectivity warning.
- **Issue 2 (Severity: Informational):** New Club Operator accounts require administrative approval in Django admin (`user.is_active=True`, `club.is_active=True`) before login succeeds (otherwise 403 Forbidden is returned as designed).

### 5. Secrets & Security Audit
- **Git Repository:** Zero exposed database credentials, secret keys, or JWT signing keys in tracked files.
- **Vercel CLI Uploads:** `frontend/.vercelignore` safely blocks `.env`, `.env.*`, `.env.local`, and `.vercel` metadata from uploading.
- **Client Variables:** Only `VITE_API_BASE_URL` is exposed to Vite, which is public configuration.

### 6. Recommended Next Implementation Stage
- Proceed to **Week 3: Club Discovery & Membership** (or Stage 2: Controlled Authenticated Smoke Testing with a designated test student account).






