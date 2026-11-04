# JnUVerse Frontend — Architecture, Development & Documentation Guide

**Platform:** JnUVerse (A Centralized Platform for University Clubs & Student Activities)  
**Institution:** Jagannath University (JnU), Dhaka, Bangladesh  
**Course:** Software Engineering Course Project (10-Week Development Cycle)  
**Author / Frontend MVP Coder:** Anik Khondokar  
**Last Updated:** October 2026  

---

## 1. Frontend Purpose & Technology Stack

JnUVerse provides an official, modern digital campus gateway for Jagannath University students and club operators. The frontend provides real-time club discovery, registrar-verified student authentication, membership application tracking, event registrations, and campus communications.

### Core Stack
- **UI Framework:** React 18.3 (`react`, `react-dom`)
- **Build Tool:** Vite 5.3 (`@vitejs/plugin-react`)
- **Language:** JavaScript (ES modules, React JSX)
- **Styling:** Tailwind CSS 3.4 + PostCSS + Autoprefixer
- **Routing:** React Router 6 (`react-router-dom`)
- **HTTP Client:** Axios 1.7 (`axios`)
- **Typography:** Plus Jakarta Sans (Google Fonts: 400, 500, 600, 700, 800)
- **Icons:** Google Material Symbols Outlined
- **Code Quality:** ESLint 8.57 (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)

---

## 2. Directory & File Structure

```
frontend/
├── FRONTEND_README.md               # Primary authoritative frontend overview (this document)
├── README.md                        # Compatibility pointer to FRONTEND_README.md
├── docs/
│   └── workflow/                    # 10-Week frontend implementation history and planning
│       ├── WEEK_01_REPOSITORY_AUDIT_AND_DESIGN_FOUNDATION.md
│       ├── WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md
│       ├── WEEK_03_CLUB_DISCOVERY_AND_MEMBERSHIP.md
│       ├── WEEK_04_EVENTS_AND_REGISTRATION.md
│       ├── WEEK_05_NOTICES_AND_NOTIFICATIONS.md
│       ├── WEEK_06_RATINGS_AND_COLLABORATION.md
│       ├── WEEK_07_REPORTS_AND_DASHBOARDS.md
│       ├── WEEK_08_ANALYTICAL_REPORTS.md
│       ├── WEEK_09_INTEGRATION_AND_TESTING.md
│       └── WEEK_10_FINALIZATION_AND_DELIVERY.md
├── public/
│   ├── favicon.svg                  # Primary-blue squircle favicon with centered Material Symbols hub mark
│   └── favicon.ico                  # Multi-resolution ICO fallback (16x16, 32x32, 48x48) for browser tab compatibility
├── src/
│   ├── assets/                      # Static assets and graphics
│   ├── components/                  # Reusable Stitch UI design components
│   │   ├── Badge.jsx                # Category, role, status & department pill tags
│   │   ├── Button.jsx               # Stitch full-pill buttons with loading states & variants
│   │   ├── Card.jsx                 # Elevated white surface cards with subtle borders
│   │   ├── EmptyState.jsx           # Empty list and search state presentation
│   │   ├── ErrorAlert.jsx           # Accessible error banner for DRF validation feedback
│   │   ├── Input.jsx                # Form input field with icons, labels, and error states
│   │   ├── JnUHubMark.jsx           # Reusable JnU brand mark and central hub symbol
│   │   ├── LoadingState.jsx         # Accessible spinner and async state presentation
│   │   ├── Navbar.jsx               # Reusable responsive navigation header with role-aware links
│   │   └── ProtectedRoute.jsx       # RBAC route guard supporting 'student' and 'club_operator'
│   ├── context/
│   │   └── AuthContext.jsx          # User state, token lifecycle, login, register, logout
│   ├── hooks/                       # Custom reusable React hooks
│   ├── layouts/                     # Shared layout wrappers for student & operator views
│   ├── pages/                       # Route-level screens
│   │   ├── ClubDetail.jsx           # Club profile, follow/unfollow, membership application & operator edits
│   │   ├── Dashboard.jsx            # Authenticated student/operator landing dashboard
│   │   ├── EventDetail.jsx          # Event profile, schedule, venue, capacity tracking & student RSVP actions
│   │   ├── ExploreClubs.jsx         # Club directory explorer with search, category filtering & pagination
│   │   ├── ExploreEvents.jsx        # Campus events discovery, filters, search, featured spotlight & pagination
│   │   ├── Login.jsx                # Student & Club Operator login with animated orbital hub
│   │   ├── MyClubs.jsx              # Student portal: joined societies, pending requests, and followed clubs
│   │   ├── OperatorEventForm.jsx    # Club operator event creation & editing with live preview & Dhaka timezone
│   │   ├── OperatorMembers.jsx      # Operator portal: pending request approval/rejection & member list
│   │   ├── Register.jsx             # Stitch-aligned student registration (orbital left, form right, registrar sync)
│   │   └── RegisterClub.jsx         # Stitch-aligned Club Operator registration (orbital left, form right, DRF sync)
│   ├── services/
│   │   └── api.js                   # Axios client with JWT request & 401 refresh interceptors
│   ├── utils/                       # Shared utility functions and formatting helpers
│   ├── App.jsx                      # App root with React Router route declarations
│   ├── index.css                    # Tailwind directives, base font, and custom keyframe animations
│   └── main.jsx                     # Application bootstrap mounting into #root
├── .env                             # Local frontend environment variables (git-ignored)
├── .env.example                     # Example environment template
├── .eslintrc.cjs                    # ESLint configuration
├── index.html                       # HTML entry point with Google Fonts preconnect
├── package.json                     # Frontend dependencies and npm scripts
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Centralized Stitch design tokens and theme extensions
├── vercel.json                      # Vercel SPA routing rewrite rules (directs all paths to index.html)
└── vite.config.js                   # Vite bundler configuration
```

---

## 3. Setup and Run Instructions

The frontend runs locally against the Django REST Framework backend (`http://127.0.0.1:8000`).

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create local environment file if missing
cp .env.example .env

# 4. Start local development server (Vite runs on http://localhost:5173)
npm run dev

# 5. Execute production build validation
npm run build

# 6. Execute ESLint validation
npm run lint

# 7. Preview production build locally
npm run preview
```

### Vercel Deployment Configuration

The frontend is prepared for deployment to Vercel to allow teammates to access the web application publicly against the deployed Render backend:

- **Public Backend Service (Render):** `https://jnuverse-a-centralized-platform-for.onrender.com`
- **Backend Health Check:** `GET https://jnuverse-a-centralized-platform-for.onrender.com/api/health/` -> `{"status":"ok","project":"JnUVerse backend"}`
- **Backend Swagger Docs:** `https://jnuverse-a-centralized-platform-for.onrender.com/api/docs/`

#### Vercel Project Settings (Vercel Dashboard)
When importing the repository into Vercel, configure the following project build and deployment settings:

| Setting | Value | Description |
|:---|:---|:---|
| **Root Directory** | `frontend` | Informs Vercel that `package.json` and Vite config reside in `frontend/` |
| **Framework Preset** | `Vite` | Automatically detected by Vercel |
| **Build Command** | `npm run build` | Produces production-optimized assets |
| **Output Directory** | `dist` | Default output directory of Vite |
| **Environment Variable Name** | `VITE_API_BASE_URL` | Injected at build time by Vite |
| **Environment Variable Value** | `https://jnuverse-a-centralized-platform-for.onrender.com` | Verified Render public backend URL |

#### Client-Side SPA Routing ([`vercel.json`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/vercel.json))
Because the application uses React Router with HTML5 browser history navigation (`/login`, `/register`, `/register/club`, etc.), direct URL access or page refreshes on non-root paths must be redirected to `index.html`. This is handled by `frontend/vercel.json`:
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

#### Live Vercel Deployment Details
- **Project Name:** `jnuverse`
- **Team Scope:** `rebel-0c2e`
- **Live Deployed URL:** [https://jnuverse.vercel.app](https://jnuverse.vercel.app)
- **Deployment-Specific URL:** `https://jnuverse-4idyb8nc2-rebel-0c2e.vercel.app`
- **Inspection Dashboard:** `https://vercel.com/rebel-0c2e/jnuverse`
- **Deployment Mode:** Direct local file upload via Vercel CLI (no Git repository connection).
- **Environment Variable Configured:** `VITE_API_BASE_URL=https://jnuverse-a-centralized-platform-for.onrender.com` (Production & Preview).

#### Render Backend CORS Requirement
The Django REST Framework backend on Render uses `django-cors-headers` reading from the `CORS_ALLOWED_ORIGINS` environment variable.
Update the Render backend environment variable with the assigned Vercel domains:
- **Variable Name:** `CORS_ALLOWED_ORIGINS`
- **Exact Setting for Render:**
  ```
  CORS_ALLOWED_ORIGINS=http://localhost:5173,https://jnuverse.vercel.app,https://jnuverse-4idyb8nc2-rebel-0c2e.vercel.app
  ```
*(Comma-separated, without trailing slashes).*

### Default Testing & Verification Policy
To optimize development velocity and token efficiency, the project follows this default verification policy:
1. **Source Code & Contract Inspection:** Verify component logic, props, routes, and API payloads via static inspection.
2. **Standard Quality Gate:** Run `npm run lint` (ESLint) and `npm run build` (Vite production bundle) on all changes.
3. **No Automatic Browser/Screenshot Automation:** Automatic headless Chrome runs, Playwright sessions, and screenshot capture are disabled by default.
4. **On-Demand Visual Testing:** Browser-based testing and screenshot captures are executed only when explicitly requested by the user. If browser testing is critically necessary to diagnose an issue, request confirmation first.

---

## 4. Authentication & API Integration Architecture

### Strict DRF API Consumer
The React frontend connects **only** through standard HTTP/JSON requests with the Django backend at `VITE_API_BASE_URL` (default: `http://127.0.0.1:8000`).
- **No Direct Database Access:** The frontend never connects directly to Supabase, PostgreSQL, or backend files.
- **JWT Storage:** Tokens are stored in browser `localStorage` as `access_token` and `refresh_token`.
- **Bearer Token Interceptor:** [`services/api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js) automatically attaches `Authorization: Bearer <access_token>` to every authenticated request.
- **Automatic 401 Refresh Queue:** When an access token expires, Axios intercepts the 401 error, pauses concurrent requests in a queue, calls `POST /api/auth/refresh/`, updates the stored token, and replays all failed requests seamlessly. If refresh fails, it purges authentication tokens and broadcasts an `auth:logout` event.
- **DRF Error Parsing:** `extractErrorMessage(error)` parses standard DRF responses, field validation arrays (`detail`, `non_field_errors`), and network errors into readable strings.
- **Events Service (`eventsAPI`):** Dedicated service export in [`services/api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js) providing 9 backend-verified operations for public event discovery, operator lifecycle control, and student RSVPs.

---

## 5. Design System & Reusable Components

The design system implements the official Google Stitch specifications in `docs/ui/stitch-export/stitch_jnuverse_campus_community_platform/`:

### 1. Centralized Tokens ([`tailwind.config.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/tailwind.config.js))
- **`canvas-base` (`#F8F8FF`):** Atmospheric lavender-tinted background.
- **`surface-white` (`#FFFFFF`):** Elevated cards, inputs, dialogs.
- **`surface-lavender` (`#EBECF9`):** Subdued sections and soft pill containers.
- **`primary` (`#2B34B9`):** JnU brand primary blue; interactive elements and anchors.
- **`primary-hover` (`#1F2792`):** Darker interactive hover state.
- **`secondary` (`#AEACF9`):** Accent badges and indicator rings.
- **`tertiary` (`#B2C7F7`):** Powder blue pill tags and secondary accents.
- **`on-surface` (`#131526`):** Primary headings and body typography.
- **`text-muted` (`#686B7D`):** Helper text, timestamps, and secondary captions.
- **`border-subtle` (`#E2E4F3`):** 1px hairline borders.

### 2. Orbital Club Showcase, Student & Operator Login ([`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx), [`OperatorLogin.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorLogin.jsx), [`index.css`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/index.css))
On the authentication screens, five official campus club nodes orbit the stable central JnU planet hub, matching the exact club identities and icon mapping used on Registration:
- **Consistent Club Identities:**
  - `JnU IT Club` (`terminal`, `#2B34B9`, `animate-orbit-float-2`)
  - `Debating Society` (`record_voice_over`, `#4285F4`, `animate-orbit-float-3`)
  - `Photo Club` (`photo_camera`, `#EA4335`, `animate-orbit-float-5`)
  - `Cultural Cell` (`theater_comedy`, `#9333EA`, `animate-orbit-float-4`)
  - `Athletics Wing` (`sports_soccer`, `#D97706`, `animate-orbit-float-7`)
- **Readability & Badges:** Each orbiting node displays an accessible pill badge beneath the icon without overlapping the central JnU hub or neighboring nodes.
- **Continuous Organic Floating:** Gentle 2px–6px displacements on separate cycles (5.6s–7.2s) with negative animation delays. Child nodes scale smoothly on hover (`hover:scale-110`).
- **Balanced Login Form Width:** The login form card width is refined to `max-w-[420px]` (centered within `lg:col-span-5`), ensuring compact, balanced inputs on desktop, laptop, and mobile without horizontal overflow.
- **Dedicated Operator Login Gateway ([`OperatorLogin.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorLogin.jsx)):**
  - *Route:* `/operator/login` (publicly accessible).
  - *Headline & Content:* *"Welcome back, Operator."*, *"Sign in to manage your campus club and events."*, primary CTA *"Sign In as Club Operator"*, and supporting text *"Authorized club operators only."*. Excludes all student-specific fields.
  - *Role Verification & Security:* Strictly checks `user.role === "club_operator"`. If an account with `student` role logs in through `/operator/login`, the session is immediately invalidated via `logout()`, access to the operator workspace is blocked, and an explicit advisory directs the user to Student Login.
  - *Intended Destination:* Respects valid previous destinations (`location.state.from`) or defaults to the operator workspace (`/operator/events`).
- **Cross-Linking Navigation:**
  - On [`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx): *"Are you a Club Operator? Sign in here."* (`/operator/login`).
  - On [`OperatorLogin.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorLogin.jsx): *"Are you a student? Student Login"* (`/login`) and *"Need an account for your organization? Register your club"* (`/register/club`).
  - On [`RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx): *"Already registered? Operator Log in"* (`/operator/login`).
- **Accessibility:** Fully supports `@media (prefers-reduced-motion: reduce)`, disabling motion completely when requested by user OS settings.

### 3. Student & Club Operator Registration Pages ([`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx), [`RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx))
Both registration screens share a unified sibling architecture:
- **Two-Column Desktop Alignment:** Left orbital showcase illustration and right registration form aligned at the exact same vertical start position (`items-start`).
- **Mobile Stacking:** Registration form displays first (`order-1 lg:order-2`) for rapid input access, followed by the showcase below (`order-2 lg:order-1`).
- **Clean Form Presentations:** Uncluttered form headers (`Create your account.` for students; `Register Club Operator.` for operators) with clear subtitles and zero extraneous badges or banner links.
- **Club Operator Fields (`POST /api/auth/register/club/`):** `club_name` (req), `email` (req), `description` (opt, max 300 words), `contact_email` (opt), `password` (req), `password_confirm` (req), and authorized executive certification checkbox.
- **Showcase Content:** "Empower Your Campus Society", static verified metrics (`40+ Registered Societies`, `100% Council Synchronized`), 5 floating club nodes (`JnU IT Club`, `Debating Society`, `Photo Club`, `Cultural Cell`, `Athletics Wing`), and rotating benefit captions.
- **Clean Header Layout:** All four authentication screens (`Login.jsx`, `OperatorLogin.jsx`, `Register.jsx`, `RegisterClub.jsx`) feature a clean top header containing solely the official JnUVerse brand mark, removing non-essential items like "Community Gateway" and "Back to Portal".

### 4. Reusable UI Components
- [`Navbar.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Navbar.jsx): Sticky responsive navigation bar with brand mark, role pill tags, role-aware navigation links (`Overview`, `Explore Clubs`, `My Clubs`, `Events` for students; `Overview`, `Explore Clubs`, `Members`, `Events`, `Notices`, plus secondary `Explore Events` for operators), mobile navigation drawer, and session sign in/out.
- [`Button.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Button.jsx): Full-pill shape (`rounded-full`), supports `primary`, `secondary`, `outline`, `danger`, `ghost`, and `isLoading` spinner state.
- [`Input.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Input.jsx): Rounded-xl input with 1px `#E2E4F3` border, leading icon prefix, helper text, and accessible error state.
- [`Card.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Card.jsx): Elevated surface card with resting and hover shadows.
- [`Badge.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Badge.jsx): Category and status pill tag with live dot indicator.
- [`ErrorAlert.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/ErrorAlert.jsx): ARIA `role="alert"` container for clear DRF error feedback.
- [`JnUHubMark.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/JnUHubMark.jsx): Reusable brand mark supporting header squircle icon and radiant orbital planetary hub.
- [`LoadingState.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/LoadingState.jsx): Accessible spinner for full-screen and section loading.
- [`EmptyState.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/EmptyState.jsx): Clean zero-state display for lists and searches.

### 5. Week 3 Club Discovery & Membership UI Views (Stitch Redesign)
The Week 3 UI was refined directly against the official Google Stitch exports located in `docs/ui/stitch-export/stitch_jnuverse_campus_community_platform/`:

- **Shared Responsive Navigation ([`Navbar.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Navbar.jsx)):**
  - *Reference:* `jnuverse_explore_clubs/code.html` and user reference screenshot.
  - *Design Features:* 80px fixed height (`h-20`), white background with subtle blur (`bg-surface-white/90 backdrop-blur-xl border-b border-surface-lavender`), 3-part mathematically centered grid (`lg:grid-cols-[1fr_auto_1fr]`), left brand mark with lavender `STUDENT PORTAL` badge, center rounded lavender container with `Overview`, `Explore Clubs`, `My Clubs`, and `Events` (deep-indigo active pill `#0810A4`), and right-side controls with notification bell (unread indicator), user profile stack (name + batch/department), circular person profile icon, and logout button. Fully responsive with mobile drawer navigation on tablet/mobile.
- **Club Explorer & Directory ([`ExploreClubs.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/ExploreClubs.jsx)):**
  - *Reference:* `jnuverse_explore_clubs/code.html` and target desktop reference screenshot.
  - *Design Features:* Atmospheric blurred gradient canvas blobs, balanced two-column hero layout (~60% left context, ~40% right floating community cards constellation matching reference screenshot: IT Society, Debating, Science Club, Rover Scout, Cultural Wing, Film & Drama with trailing dot, standalone Sports and Photography squircle badges, and ambient periwinkle dot with subtle staggered vertical floating animations), bold headline wrapping intentionally after "Follow" ("Find your people. Follow" / "your passion.") with saturated indigo-to-periwinkle gradient and tight tracking, enlarged search & filter container (102px height, 14px padding, 76px search input with soft lavender surface, 52px category chips in exact order), redesigned asymmetrical featured community banner (soft lavender-white gradient, ~40px rounded corners, translucent lavender ambient circle, deep-indigo squircle tile, inline handle, verified metadata, and elevated white statistics card with real API metrics), clean `+ Follow` button pairing (Material Symbols `add` icon cleanly paired with `Follow` label text without duplicate plus characters), 3-column card grid, and bottom advisory FAQ banner. Fully responsive from mobile to ultra-wide displays.
- **Club Profile & Management ([`ClubDetail.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/ClubDetail.jsx)):**
  - *Reference:* `jnuverse_club_profile_management/code.html`.
  - *Design Features:* Asymmetric 12-column layout (7 cols left, 5 cols right). Left column features the official club insignia squircle, university verification charter status banner ("Verified Student Guild · Active Charter"), and editable profile form for operators (or rich description view for students). Right column features the "Live Public Preview" student viewport mirror card with cover gradient banner, overlapping avatar, category badges, metrics ribbon, and follow/membership action controls.
- **Student Club Portal ([`MyClubs.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/MyClubs.jsx)):**
  - *Reference:* `jnuverse_my_clubs/code.html`.
  - *Design Features:* Editorial header, 3-card linear overview metric ribbon (Approved Memberships, Pending Requests, Following), filter tab pills with counts, search filter input, and 3-column card grid with status badges.
- **Operator Member Management ([`OperatorMembers.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorMembers.jsx)):**
  - *Reference:* `jnuverse_member_management_redesigned/code.html`.
  - *Design Features:* Editorial context header with club identity card, 3-card key stats bar (Total Enrolled Members, Departments Represented, Pending Applications), search input and department filter pills, clean tabular roster rows with student initials avatars, font-mono student IDs, single-click approve/reject actions for pending requests, and revocation confirmation modal dialog.
  - *Student Privacy Protection:* Strictly adheres to university student data privacy rules: **student email addresses are never exposed or rendered in operator views**.
- **Living Campus Experience Dashboard ([`Dashboard.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Dashboard.jsx)):**
  - *Reference:* `jnuverse_student_dashboard_living_campus_experience/code.html`.
  - *Design Features:* Hero section with ambient glow, floating constellation interest tiles (Tech & Code, Debate & Eloquence, Sports, Photography, Drama), personal greeting pill, quick-action discovery hubs, and roadmap tiles.

### 6. Week 4 Events & RSVP UI Views
The Week 4 UI implements the official Google Stitch event designs in `docs/ui/stitch-export/stitch_jnuverse_campus_community_platform/jnuverse_events/`:

- **Campus Events Discovery & Explorer ([`ExploreEvents.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/ExploreEvents.jsx)):**
  - *Reference:* `jnuverse_events/code.html` and `jnuverse_art_directed_typography_layout_refinement/code.html`.
  - *Design Features:* Atmospheric blurred gradient canvas glow, eyebrow badge (`CAMPUS LIFE, HAPPENING NOW`), bold headline (`Discover what’s happening.`), asymmetric featured "UP NEXT" event card with real scheduling and capacity stats, search input, status filter pills (`All Events`, `Upcoming`, `Ongoing`, `Past`), 3-column responsive card grid (`lg:grid-cols-3 md:grid-cols-2`), animated loading skeletons, empty zero-state with filter reset, error retry state, paginated navigation, and direct navigation links to `/events/:id`.
  - *Event Filter Accuracy & Pagination:*
    - **Upcoming Filter:** Fetches active events and strictly filters `status === "published" && starts_at > now`. Ongoing events are strictly excluded.
    - **Ongoing Filter:** Fetches the complete active dataset (`upcoming=true` across pages if necessary) and filters `status === "published" && starts_at <= now && ends_at > now`. Accurately paginates and avoids false total counts or partial page claims.
    - **Featured "UP NEXT" Spotlight:** Strictly selects the earliest published event with `starts_at > now`. Already-started events are never labeled "UP NEXT". If no future event exists, the section is gracefully omitted.
    - **Capacity Wording:** Displays standardized "Unlimited Capacity" whenever `capacity` is null.
  - *Dhaka Timezone Handling:* All timestamps parsed as ISO 8601 and formatted consistently in `Asia/Dhaka` (+06:00 BST).

- **Event Details & Student RSVP ([`EventDetail.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/EventDetail.jsx)):**
  - *Reference:* `jnuverse_events/code.html` and `jnuverse_student_event_feedback/code.html`.
  - *Route:* `/events/:id` (public browsing, authenticated student RSVP).
  - *Design Features:* Asymmetric 12-column layout (7 cols left, 5 cols right), breadcrumb navigation back to discovery, neutral organizing club attribution ("Organized by <club>"), branded visual backdrop plate, full description with preserved formatting, host club spotlight card, and sticky logistics & RSVP sidebar.
  - *Student RSVP Registration (`POST /api/events/:id/register/`):*
    - Interactive confirmation modal before reservation.
    - Idempotent handling (201 Created or 200 OK).
    - Authoritative event state refresh via `eventsAPI.getById(id)` updating `registered_count`, `remaining_capacity`, and `is_registered: true`, with graceful fallback for network disruptions.
    - Confirmed attendance badge displaying: *"Your registration has been confirmed. We look forward to seeing you!"*.
  - *RSVP Cancellation (`DELETE /api/events/:id/register/`):*
    - Confirmation modal preventing accidental cancellations.
    - Idempotent 204 No Content response handling.
    - Authoritative event state refresh via `eventsAPI.getById(id)` and seat release.
    - Blocked after start time (`starts_at <= now`).
  - *Authentication & Role Handling:*
    - Anonymous visitors receive clear "Log in to register" prompt preserving target event destination.
    - Club operators receive clear non-student executive notice.
    - Students have full access to registration/cancellation when open.
  - *HTTP 409 Conflict Handling:* Renders exact backend conflict `detail` messages for full capacity ("This event is full."), closed registration ("Registration is closed because the event has started."), and post-start cancellation attempts.

- **Club Operator Event Creation & Editing ([`OperatorEventForm.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorEventForm.jsx)):**
  - *Reference:* `jnuverse_club_profile_management/code.html` and `jnuverse_events/code.html`.
  - *Routes:* `/operator/events/new` (create mode) and `/operator/events/:id/edit` (edit mode).
  - *Access Control:* Protected by `ProtectedRoute` restricted to `club_operator` role accounts.
  - *Design Features:* Asymmetric 12-column layout (7 cols form left, 5 cols real-time "Live Public Preview" mirror card right), breadcrumb trail, Plus Jakarta Sans typography, and responsive controls.
  - *Create Mode:* Calls `eventsAPI.create(payload)`; backend automatically initializes event as `draft` assigned to the operator's own club.
  - *Edit Mode:* Calls `eventsAPI.getById(id)` to prefill existing fields; calls `eventsAPI.update(id, payload)` on save. Enforces backend restrictions (cancelled or ended events are read-only with a descriptive alert banner).
  - *Field Specifications & Exact Names:*
    - `title`: Required text (max 200 characters with character counter).
    - `description`: Optional rich textarea with character counter.
    - `venue`: Required text (max 200 characters).
    - `starts_at` & `ends_at`: Required HTML `datetime-local` inputs evaluated strictly in `Asia/Dhaka` (+06:00 BST).
    - `capacity`: Numeric input with "Unlimited Capacity" checkbox sending `null`. On edit, validated against `registered_count`.
  - *Timezone Handling:* Conversion helpers (`isoToDhakaInput` and `dhakaInputToIso`) evaluate wall-clock values strictly in `Asia/Dhaka` using `Intl.DateTimeFormat` and submit explicit `+06:00` ISO 8601 strings.
  - *Validation & Error Mapping:* Comprehensive client-side validation with real-time field error clearance and automatic mapping of backend `400` validation errors and `409` conflict details.

- **Operator Event Management Workspace ([`OperatorEvents.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorEvents.jsx)):**
  - *Route:* `/operator/events` (protected for `club_operator` role).
  - *Design Features:* Editorial header with context description, "Create New Event" primary action (`/operator/events/new`), 5-card metric ribbon (Total Events, Live Published, Drafts, Completed, Total Attendees), search input (title/venue/description), lifecycle status filters (`All Events`, `Draft`, `Published`, `Completed`, `Cancelled`), responsive event management rows with status badges, capacity/fill gauges, and quick action ribbon.
  - *Complete Dataset Retrieval & Pagination:* Paginates across all pages of `GET /api/events/?mine=true` using the backend-supported maximum `page_size: 50`, removes duplicate IDs, and calculates metrics from the full dataset. Search, status tabs, and local page slicing operate on the complete deduplicated array. Publish, cancellation, manual refresh, and error retry trigger fresh multi-page API requests.
  - *Summary Metrics & Status Consistency:* The Completed summary metric, Completed filter tab, and status badges strictly use `status === "published" && (is_completed || ends_at <= now)`. Cancelled and draft events are never counted as completed simply because their scheduled end time has passed.
  - *Event Lifecycle & Management Actions:*
    - **View:** Direct link to public preview page (`/events/:id`).
    - **Edit:** Direct link to unified event editor (`/operator/events/:id/edit`). Locked for cancelled or completed events. Drafts with passed times remain editable so operators can update dates.
    - **Attendees:** Direct link to attendee roster (`/operator/events/:id/attendees`) with current registration count badge.
    - **Publish Action:** Interactive modal before publishing drafts (`POST /api/events/:id/publish/`). Explains public visibility, includes start-time-in-past warning guard, and triggers authoritative backend refresh.
    - **Cancel Action:** Interactive modal for permanent cancellation (`POST /api/events/:id/cancel/`). Warns of permanent irreversibility, confirms that existing student registrations remain recorded on the roster, and handles backend 409 conflict responses.

- **Operator Event Attendee Roster ([`OperatorEventAttendees.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorEventAttendees.jsx)):**
  - *Route:* `/operator/events/:id/attendees` (protected for `club_operator` role).
  - *Design Features:* Breadcrumb link back to Manage Events, event metadata header (title, host club, Asia/Dhaka schedule, venue, status badge), quick metric summary (Confirmed RSVPs, Venue Capacity, Remaining Seats), and tabular student roster with initials avatars, monospace student IDs, department, batch, formatted registration timestamps, and status badges.
  - *Pagination:* Supports backend DRF `EventPagination` (`page`, `page_size: 20`) with previous/next controls, page numbers, item range counts, and page loading overlays.
  - *Student Privacy Compliance:* Features a neutral privacy notice: *"Student email addresses and contact details are not displayed in this roster."* Strictly displays only serializer-confirmed fields (`id`, `student_id`, `name`, `department`, `batch`, `status`, `registered_at`).
  - *Status Badge Consistency:* Follows the identical lifecycle condition: Draft events remain labeled `Draft`, Cancelled events `Cancelled`, and only Published events with passed end time or `is_completed: true` display as `Completed`.
  - *Authorization Guard:* Catches backend 403 Forbidden responses ("Only this club's operator can do this.") and renders a dedicated access denied state with navigation back to `/operator/events`.

### 7. Week 5 Notices & Notifications (API Service Foundation & Navbar Bell)
The Week 5 API layer integrates club broadcast announcements, audience scoping (`public`, `followers`, `members`, `department`), in-app personal notifications, unread count polling, and mark-as-read actions:

- **Notices Service (`noticesAPI` in [`api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js)):**
  - `getAll(params)`: `GET /api/notices/` with query params `club` (slug), `mine` (boolean, operator only), `page`, `page_size`. Audience-scoped server-side filtering.
  - `getById(id)`: `GET /api/notices/<id>/` returning notice detail or 404 for unpermitted audience.
  - `create(payload)`: `POST /api/notices/` accepting `{ title, body, audience, department? }`. Publishes immediately (no drafts) and dispatches notifications automatically.
  - `update(id, payload)`: `PATCH /api/notices/<id>/` accepting `{ title?, body? }`. Audience and department are immutable post-creation.
  - `delete(id)`: `DELETE /api/notices/<id>/` returning 204 No Content. Cascades deletion to related notifications.

- **Notifications Service (`notificationsAPI` in [`api.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/services/api.js)):**
  - `getAll(params)`: `GET /api/notifications/` with query params `unread` (boolean), `page`, `page_size`. Chronological personal feed.
  - `getUnreadCount()`: `GET /api/notifications/unread-count/` returning lightweight `{ unread_count: N }` for header bell badge.
  - `markRead(id)`: `POST /api/notifications/<id>/read/` (idempotent mark-as-read preserving first `read_at`).
  - `markAllRead()`: `POST /api/notifications/read-all/` returning `{ updated: N }`.

- **Notification Bell & Poller ([`NotificationBell.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/NotificationBell.jsx)):**
  - *Dynamic Unread Badge:* Real-time unread count indicator (capped at `99+`) hidden when count is 0.
  - *Background Poller:* Periodic unread counter polling every 45s with tab visibility change detection (`document.visibilityState === 'hidden'` pauses polling; returning to visible triggers immediate fetch) and in-flight request guard (`isPollingRef`).
  - *Preview Popover Dropdown:* Displays latest 5 notifications with loading skeleton, empty state ("You're all caught up!"), and retryable error state.
  - *Optimistic Mark-as-Read & Deep Navigation:* Clicking an unread item immediately decrements the badge, updates read styling, sends `POST /api/notifications/<id>/read/`, and routes to the relevant entity (`/events/:id` for events, `/operator/members` or `/my-clubs` for memberships, `/clubs/:slug` with `state: { noticeId }` for notices via asynchronous `noticesAPI.getById(id)` resolution, with fallback to `/clubs`). If the request fails, changes are automatically rolled back to their exact snapshot and an error alert is presented without leaving an inconsistent unread badge.
  - *Account Switching & Concurrency Guard:* Tracks `currentIdentity` (`${id/email}:${role}`) paired with monotonic `generationRef` to instantly wipe stale notifications upon session changes, ignore lingering in-flight responses from prior accounts, and prevent older requests from resetting active polling guards. Listens to `notifications:updated` event for instant badge synchronization. Footer link navigates to `/notifications`.

- **Full Notifications Inbox ([`Notifications.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Notifications.jsx)):**
  - *Route:* `/notifications` protected for authenticated users (`student`, `club_operator`).
  - *Server-Side Filtering:* `All` (read and unread) and `Unread` (`unread=true`) filter tabs with real-time backend counts.
  - *Server-Side Pagination:* 15 items per page with Previous/Next controls, total counts, and filter-preservation across page turns.
  - *Bulk & Individual Read Actions:* One-click "Mark all as read" button (`POST /api/notifications/read-all/`) with confirmation-first execution, and card/inline mark-as-read actions (`POST /api/notifications/<id>/read/`) with shared synchronous in-flight locking (`inFlightIdsRef`) and immediate Navbar bell synchronization via `notifications:updated`.
  - *Deep Navigation Mapping:* Routes `event_*` to `/events/:id`, `membership_update` to `/my-clubs` (student) or `/operator/members` (operator), `collaboration_update` safely to `/notifications`, and resolves `notice` club slug via `noticesAPI.getById(id)` to `/clubs/:slug` with `state: { noticeId }` (fallback `/clubs`).
  - *Stitch System UI States:* Loading pulse skeletons, custom empty states for "All" and "Unread", and action error banners with rollback protections.

- **Club Notice Board ([`ClubDetail.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/ClubDetail.jsx)):**
  - *Route:* `/clubs/:slug` (accessible to anonymous visitors, students, and club operators).
  - *Placement & Design:* Embedded within the 7-column main profile section directly beneath the "About This Society" overview card, preserving the sticky 5-column Student Viewport sidebar. Styled using Stitch tokens (`bg-surface-white`, `border-border-subtle`, `bg-surface-lavender`, `text-primary`).
  - *Backend Query:* Invokes `noticesAPI.getAll({ club: slug, page, page_size: 5 })` querying `GET /api/notices/?club=<slug>&page=...&page_size=5`.
  - *Audience Visibility & Scoping:* Strictly trusts DRF backend permissions with zero client bypass (`public` visible to all, `followers` visible to followers/members, `members` to approved members, `department` to matching department students, and operator seeing all club notices). Audience badges cleanly mapped (`Public`, `Followers`, `Club Members`, `Department: [Dept]` or `Department`).
  - *Timestamps:* Formatted explicitly in `Asia/Dhaka` (+06:00 BST) via `Intl.DateTimeFormat`.
  - *UI States:* Pulse skeleton loading cards (`NoticeSkeletons`), customized empty state (*"No announcements yet"* / *"This club hasn't published any notices yet. Check back later for updates."*), and isolated retryable error state that leaves the rest of the Club Detail page completely functional.
  - *Pagination:* Compact "Load More Announcements" button appending deduplicated records (`new Set(prev.map(n => n.id))`), hidden when only a single page exists.
  - *Notifications Inbox Integration:* Reads `location.state?.noticeId` or query params (`?notice=<id>`, `?notice_id=<id>`) to automatically scroll to and visually highlight the designated notice card with a highlighted badge and ring.
  - *Read-Only Scope:* Free of notice creation, editing, or deletion controls (reserved for Stage 5).

- **Operator Notice Management ([`OperatorNotices.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/OperatorNotices.jsx)):**
  - *Route:* `/operator/notices` (protected for `club_operator` role).
  - *Stitch-Inspired Design Alignment:* Built directly against official Stitch operator workspace references (`jnuverse_member_management_redesigned/code.html`, `jnuverse_club_operator_dashboard_minimal_redesign/code.html`, and `jnuverse_collaboration_requests_management/code.html`).
  - *Editorial Header:* Art-directed editorial layout featuring uppercase tracking-wider eyebrow badge (`YOUR CLUB COMMUNITY · OFFICIAL BROADCASTS`), dual-style headline (*"Manage your <span class="font-normal italic text-primary">announcements</span>"*), dynamic authenticated club context badge (`{clubName} · Official Dispatch`) with live pulsing blue beacon, and compact pill action buttons (`Refresh`, `Create New Notice`).
  - *Linear Metric Ribbon:* Replaced 4 bulky, disconnected dashboard cards with a single cohesive white ribbon (`p-4 sm:p-5`, `rounded-2xl`, hairline dividers `divide-x divide-border-subtle/70` on desktop, 2x2 grid on mobile). Displays 20-24px figures, 11px uppercase labels, and 10x10 soft lavender icon boxes for Total Announcements, Public Dispatches, Members & Followers, and Department Targeted notices, calculated 100% across the complete operator dataset.
  - *Unified Search & Segmented Filter Toolbar:* Integrated search input with clear button paired with 5 distinct audience filter pill tabs (`All`, `Public`, `Followers`, `Members`, `Department`). Each tab displays a live item count chip (`All (N)`, `Public (N)`, etc.) computing counts from the full deduplicated dataset.
  - *Notice Cards & Quiet Empty States:* Compact `rounded-2xl p-4 sm:p-5` cards with subtle hover shadow. Clean audience badges (`Public`, `Followers`, `Club Members`, `Department: [Dept]`), formatted Asia/Dhaka timestamps, direct preview links to public club board, and compact Edit/Delete actions. Removed noisy technical `UUID: ...` strings and replaced with informative audience scope metadata. Implemented quiet Stitch zero-state (`py-10 text-center`) and filter-mismatch state with a "Clear Filters" action.
  - *Compact Modal Dialogs:* Refined Create, Edit, and Delete modals to compact `max-w-lg` (`max-w-md` for delete), `rounded-2xl p-6` structures. Replaced harsh alert boxes with subtle Stitch policy strips. In Edit modal, audience and department scope are presented as a compact badge row.
  - *Data Retrieval & Concurrency:* Consumes `noticesAPI.getAll({ mine: true, page, page_size: 50 })` querying `GET /api/notices/?mine=true` with an automated multi-page retrieval loop, assembling the complete operator dataset into `allNotices` with ID deduplication and monotonic `generationRef` / `identityRef` request guards.
  - *Pagination Completeness, Honest Metrics & Safe Continuation:* Detects when the initial 20-page safety cap (1,000 notices) is reached while additional notices exist on the backend. When retrieval is incomplete, displays an unobtrusive warning: *"Showing the latest N of Total notices. Some older notices are not loaded."*, dynamically switches metric ribbon labels to honest loaded indicators (*"Loaded Notices"*, *"Loaded Public"*, *"Loaded Members & Followers"*, *"Loaded Department"*), dispatches a search & filter disclosure informing operators that older notices are excluded from search, and provides an explicit user-controlled *"Load More Records"* action fetching subsequent batches safely with in-flight concurrency locks. When full retrieval completes, normal *"Total Notices"* labels and states are automatically restored.
  - *Department Handling & Strict Validation:* Department options are loaded dynamically from `authAPI.getDepartments()`. On failure, displays an explicit error alert with an interactive Retry button. Department-targeted notice submission is disabled until valid department data is loaded. Switching away from the department audience immediately resets `department: ""` to avoid stale payload submission.
  - *Publish Notice Workflow:* Modal dialog validating title (max 200 characters) and body text, audience selector (`public`, `followers`, `members`, `department`), verified university department selection, immediate publication policy strip, and in-flight submission lock.
  - *Edit Notice Workflow:* Modal dialog allowing title and body modifications only per `NoticeUpdateSerializer`. Audience and department are strictly rendered as read-only immutable badges with governance policy notices.
  - *Delete Notice Workflow:* Modal confirmation identifying notice title and timestamp, explaining cascading student in-app notification deletion, and executing `DELETE /api/notices/:id/` with backend-confirmation-first (HTTP 204) list removal.
  - *Navbar Integration:* Updated operator center navigation pill to: `Overview` (`/dashboard`), `Explore Clubs` (`/clubs`), `Members` (`/operator/members`), `Events` (`/operator/events`), `Notices` (`/operator/notices`). Added secondary `Explore Events` link (`/events`) on desktop and mobile drawer to preserve public event discovery. Student navigation remains completely unchanged.

---

## 8. Implementation Status Matrix

| Module / Feature | Planned Week | Frontend Status | Backend API Status | Reference Documentation |
|:---|:---:|:---:|:---:|:---|
| **Project Foundation & Audit** | Week 1 | **Completed** | **Completed** | [Week 1 Workflow](docs/workflow/WEEK_01_REPOSITORY_AUDIT_AND_DESIGN_FOUNDATION.md) |
| **Authentication & Login UI** | Week 2 | **Completed** | **Completed** | [Week 2 Workflow](docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md) |
| **Club Discovery & Memberships** | Week 3 | **Completed** | **Completed** | [Week 3 Workflow](docs/workflow/WEEK_03_CLUB_DISCOVERY_AND_MEMBERSHIP.md) |
| **Events & RSVP Registration** | Week 4 | **In Progress** (Stage 7 Integrated: Architecture & Frontend Audited; Backend Tests & Demo Data Blocked) | **Completed & Verified** | [Week 4 Workflow](docs/workflow/WEEK_04_EVENTS_AND_REGISTRATION.md) |
| **Notices & Notifications** | Week 5 | **Completed** (Implementation complete; authenticated runtime QA, backend automated tests and owner-side deployment remain pending) | **Completed & Verified** | [Week 5 Workflow](docs/workflow/WEEK_05_NOTICES_AND_NOTIFICATIONS.md) |
| **Ratings & Collaboration** | Week 6 | Not Started | Models Exist (No Endpoints) | [Week 6 Workflow](docs/workflow/WEEK_06_RATINGS_AND_COLLABORATION.md) |
| **Reports & Dashboards** | Week 7 | Not Started | Models Exist (No Endpoints) | [Week 7 Workflow](docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md) |
| **Five Analytical Reports** | Week 8 | Not Started | Not Started | [Week 8 Workflow](docs/workflow/WEEK_08_ANALYTICAL_REPORTS.md) |
| **Integration & End-to-End Testing** | Week 9 | Not Started | Not Started | [Week 9 Workflow](docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md) |
| **Finalization & Production Delivery** | Week 10 | Not Started | Not Started | [Week 10 Workflow](docs/workflow/WEEK_10_FINALIZATION_AND_DELIVERY.md) |

---

## 9. Weekly Workflow Documentation Directory

Detailed implementation notes, acceptance criteria, verified test commands, and files changed for each development stage are preserved in:

- [Week 1: Repository Audit & Design Foundation](docs/workflow/WEEK_01_REPOSITORY_AUDIT_AND_DESIGN_FOUNDATION.md)
- [Week 2: Authentication, Registration & Login UI](docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md)
- [Week 3: Club Discovery, Profiles & Memberships](docs/workflow/WEEK_03_CLUB_DISCOVERY_AND_MEMBERSHIP.md)
- [Week 4: Events & Registration](docs/workflow/WEEK_04_EVENTS_AND_REGISTRATION.md)
- [Week 5: Notices & Notifications](docs/workflow/WEEK_05_NOTICES_AND_NOTIFICATIONS.md)
- [Week 6: Ratings & Collaboration](docs/workflow/WEEK_06_RATINGS_AND_COLLABORATION.md)
- [Week 7: Reports & Dashboards](docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md)
- [Week 8: Analytical Reports](docs/workflow/WEEK_08_ANALYTICAL_REPORTS.md)
- [Week 9: Integration & Testing](docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md)
- [Week 10: Finalization & Delivery](docs/workflow/WEEK_10_FINALIZATION_AND_DELIVERY.md)

---

## 10. Backend Handoff Reference

The consolidated backend API contract and handoff document is located at:  
👉 **[`backend/FRONTEND_REQUIREMENTS.md`](../backend/FRONTEND_REQUIREMENTS.md)**  
And weekly handoff specifications are located in:  
👉 **[`backend/docs/frontend-handoff/`](../backend/docs/frontend-handoff/)**
