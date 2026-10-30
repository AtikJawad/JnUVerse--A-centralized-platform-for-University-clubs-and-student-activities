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
│   │   ├── ExploreClubs.jsx         # Club directory explorer with search, category filtering & pagination
│   │   ├── Login.jsx                # Student & Club Operator login with animated orbital hub
│   │   ├── MyClubs.jsx              # Student portal: joined societies, pending requests, and followed clubs
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

### 2. Orbital Club Showcase & Login Page Refinements ([`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx), [`index.css`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/index.css))
On the login screen, five official campus club nodes orbit the stable central JnU planet hub, matching the exact club identities and icon mapping used on Registration:
- **Consistent Club Identities:**
  - `JnU IT Club` (`terminal`, `#2B34B9`, `animate-orbit-float-2`)
  - `Debating Society` (`record_voice_over`, `#4285F4`, `animate-orbit-float-3`)
  - `Photo Club` (`photo_camera`, `#EA4335`, `animate-orbit-float-5`)
  - `Cultural Cell` (`theater_comedy`, `#9333EA`, `animate-orbit-float-4`)
  - `Athletics Wing` (`sports_soccer`, `#D97706`, `animate-orbit-float-7`)
- **Readability & Badges:** Each orbiting node displays an accessible pill badge beneath the icon without overlapping the central JnU hub or neighboring nodes.
- **Continuous Organic Floating:** Gentle 2px–6px displacements on separate cycles (5.6s–7.2s) with negative animation delays. Child nodes scale smoothly on hover (`hover:scale-110`).
- **Balanced Login Form Width:** The login form card width is refined to `max-w-[420px]` (centered within `lg:col-span-5`), ensuring compact, balanced inputs on desktop, laptop, and mobile without horizontal overflow.
- **Accessibility:** Fully supports `@media (prefers-reduced-motion: reduce)`, disabling motion completely when requested by user OS settings.

### 3. Student & Club Operator Registration Pages ([`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx), [`RegisterClub.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/RegisterClub.jsx))
Both registration screens share a unified sibling architecture:
- **Two-Column Desktop Alignment:** Left orbital showcase illustration and right registration form aligned at the exact same vertical start position (`items-start`).
- **Mobile Stacking:** Registration form displays first (`order-1 lg:order-2`) for rapid input access, followed by the showcase below (`order-2 lg:order-1`).
- **Clean Form Presentations:** Uncluttered form headers (`Create your account.` for students; `Register Club Operator.` for operators) with clear subtitles and zero extraneous badges or banner links.
- **Club Operator Fields (`POST /api/auth/register/club/`):** `club_name` (req), `email` (req), `description` (opt, max 300 words), `contact_email` (opt), `password` (req), `password_confirm` (req), and authorized executive certification checkbox.
- **Showcase Content:** "Empower Your Campus Society", static verified metrics (`40+ Registered Societies`, `100% Council Synchronized`), 5 floating club nodes (`JnU IT Club`, `Debating Society`, `Photo Club`, `Cultural Cell`, `Athletics Wing`), and rotating benefit captions.
- **Clean Header Layout:** All three authentication screens (`Login.jsx`, `Register.jsx`, `RegisterClub.jsx`) feature a clean top header containing solely the official JnUVerse brand mark, removing non-essential items like "Community Gateway" and "Back to Portal".
- **Cross-Linking Navigation:** Both [`Login.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Login.jsx) ("Want to manage your club? Register as a Club Operator.") and [`Register.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/Register.jsx) ("Registering a club instead? Register as a Club Operator.") feature clear, accessible `<Link>` elements pointing directly to `/register/club`.

### 4. Reusable UI Components
- [`Navbar.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Navbar.jsx): Sticky responsive navigation bar with brand mark, role pill tags, role-aware navigation links (`Overview`, `Explore Clubs`, `My Clubs`, `Manage Members`), mobile navigation drawer, and session sign in/out.
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
  - *Design Features:* Atmospheric blurred gradient canvas glow, eyebrow badge (`CAMPUS LIFE, HAPPENING NOW`), bold headline (`Discover what’s happening.`), asymmetric featured "UP NEXT" event card with real scheduling and capacity stats, search input, status filter pills (`All Events`, `Upcoming`, `Ongoing`, `Past`), 3-column responsive card grid (`lg:grid-cols-3 md:grid-cols-2`), animated loading skeletons, empty zero-state with filter reset, error retry state, paginated navigation, and interactive event quick view dialog.
  - *Dhaka Timezone Handling:* All timestamps parsed as ISO 8601 and formatted consistently in `Asia/Dhaka` (+06:00 BST).

---

## 7. Implementation Status Matrix

| Module / Feature | Planned Week | Frontend Status | Backend API Status | Reference Documentation |
|:---|:---:|:---:|:---:|:---|
| **Project Foundation & Audit** | Week 1 | **Completed** | **Completed** | [Week 1 Workflow](docs/workflow/WEEK_01_REPOSITORY_AUDIT_AND_DESIGN_FOUNDATION.md) |
| **Authentication & Login UI** | Week 2 | **Completed** | **Completed** | [Week 2 Workflow](docs/workflow/WEEK_02_AUTHENTICATION_AND_LOGIN_UI.md) |
| **Club Discovery & Memberships** | Week 3 | **Completed** | **Completed** | [Week 3 Workflow](docs/workflow/WEEK_03_CLUB_DISCOVERY_AND_MEMBERSHIP.md) |
| **Events & RSVP Registration** | Week 4 | **In Progress** (Stage 3: `ExploreEvents.jsx` Discovery Page) | **Completed & Verified** | [Week 4 Workflow](docs/workflow/WEEK_04_EVENTS_AND_REGISTRATION.md) |
| **Notices & Notifications** | Week 5 | Not Started | Models Exist (No Endpoints) | [Week 5 Workflow](docs/workflow/WEEK_05_NOTICES_AND_NOTIFICATIONS.md) |
| **Ratings & Collaboration** | Week 6 | Not Started | Models Exist (No Endpoints) | [Week 6 Workflow](docs/workflow/WEEK_06_RATINGS_AND_COLLABORATION.md) |
| **Reports & Dashboards** | Week 7 | Not Started | Models Exist (No Endpoints) | [Week 7 Workflow](docs/workflow/WEEK_07_REPORTS_AND_DASHBOARDS.md) |
| **Five Analytical Reports** | Week 8 | Not Started | Not Started | [Week 8 Workflow](docs/workflow/WEEK_08_ANALYTICAL_REPORTS.md) |
| **Integration & End-to-End Testing** | Week 9 | Not Started | Not Started | [Week 9 Workflow](docs/workflow/WEEK_09_INTEGRATION_AND_TESTING.md) |
| **Finalization & Production Delivery** | Week 10 | Not Started | Not Started | [Week 10 Workflow](docs/workflow/WEEK_10_FINALIZATION_AND_DELIVERY.md) |

---

## 7. Weekly Workflow Documentation Directory

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

## 8. Backend Handoff Reference

The consolidated backend API contract and handoff document is located at:  
👉 **[`backend/FRONTEND_REQUIREMENTS.md`](../backend/FRONTEND_REQUIREMENTS.md)**  
And weekly handoff specifications are located in:  
👉 **[`backend/docs/frontend-handoff/`](../backend/docs/frontend-handoff/)**
