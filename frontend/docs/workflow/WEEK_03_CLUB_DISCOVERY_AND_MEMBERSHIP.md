# Week 03 — Club Discovery, Profiles & Membership Management

**Focus:** Club catalog explorer, search/pagination, club profile details, follow/unfollow toggle, student membership applications, and operator member management  
**Status:** **Completed** (Frontend & Backend Week 3 Implementation & Verification Complete)  
**Assigned:** Anik Khondokar (Frontend MVP Coder)  
**Target:** October 2026  

---

## 1. Objectives
- Implement the Club Explorer screen (`ExploreClubs.jsx`) consuming `GET /api/clubs/` with live search, interest category filtering, and pagination.
- Implement the detailed Club Profile view (`ClubDetail.jsx`) displaying verified badge, follower count, member count, and action controls.
- Implement student Follow / Unfollow toggle (`POST/DELETE /api/clubs/<slug>/follow/`) with optimistic UI updates.
- Implement the student membership application workflow (`POST/GET/DELETE /api/clubs/<slug>/membership/`).
- Implement Club Operator Dashboard (`OperatorMembers.jsx`) for reviewing pending membership requests (`GET/POST .../membership-requests/`) and managing approved members (`GET/DELETE .../members/`).
- Strictly enforce student privacy: never display or expose student email addresses to club operators.
- Implement unified responsive navigation header (`Navbar.jsx`) across all authenticated and discovery screens.

## 2. Scope & Exclusions
- **In Scope:** `Navbar.jsx`, `ExploreClubs.jsx`, `ClubDetail.jsx`, `MyClubs.jsx`, `OperatorMembers.jsx`, `Dashboard.jsx` route integration, follow buttons, membership request dialogs, operator inline profile edit, and student privacy controls.
- **Exclusions:** Events (Week 4), Notices (Week 5), Ratings (Week 6), direct backend modifications, database schema edits.

## 3. Planned Tasks & Completion Status
1. [x] Build `ExploreClubs.jsx` using Stitch grid cards with search bar, interest category chips, and pagination controls.
2. [x] Build `ClubDetail.jsx` showing club description, social links, follower count, member count, and membership status badge.
3. [x] Wire interactive Follow/Unfollow toggle with optimistic state updates on explorer and club detail views.
4. [x] Build student Membership application modal with status preview (`pending`, `approved`, `rejected`) and cancellation/leave controls.
5. [x] Build `OperatorMembers.jsx` enabling club operators to approve/reject requests and remove members.
6. [x] Implement "My Clubs" screen (`MyClubs.jsx`) partitioning joined societies, pending applications, and followed clubs for students.

## 4. Files Created & Modified

### Created Files
- [`frontend/src/components/Navbar.jsx`](../../src/components/Navbar.jsx): Sticky, responsive navigation header featuring the JnUVerse brand mark, role pill tag, role-aware navigation links (`Overview`, `Explore Clubs`, `My Clubs`, `Manage Members`), mobile navigation drawer, and session sign in/out.
- [`frontend/src/pages/ExploreClubs.jsx`](../../src/pages/ExploreClubs.jsx): Full club catalog explorer consuming `GET /api/clubs/?search=&page=`. Features category interest filter chips, verified badges, real-time follower/member counts, optimistic follow/unfollow toggle with clean `+ Follow` button pairing (Material Symbols `add` icon + `Follow` label, eliminating duplicate plus symbols), and accessible pagination.
- [`frontend/src/pages/ClubDetail.jsx`](../../src/pages/ClubDetail.jsx): Detailed club profile view consuming `GET /api/clubs/<slug>/`. Features official verification mark, follower/member stats, interactive follow/unfollow, student membership application modal (`POST /api/clubs/<slug>/membership/`), application cancellation / leave club controls (`DELETE /api/clubs/<slug>/membership/`), and inline profile editor for authorized club operators (`PATCH /api/clubs/<slug>/`).
- [`frontend/src/pages/MyClubs.jsx`](../../src/pages/MyClubs.jsx): Dedicated student portal partitioning memberships into "Joined Societies", "Pending Applications", and "Following", with quick links, un-follow controls, and empty states.
- [`frontend/src/pages/OperatorMembers.jsx`](../../src/pages/OperatorMembers.jsx): Protected operator console for reviewing pending membership requests (`GET /api/clubs/<slug>/membership-requests/`), approving requests (`POST .../approve/`), rejecting requests (`POST .../reject/`), and managing approved members (`GET .../members/`, `DELETE .../`).

### Modified Files
- [`frontend/src/App.jsx`](../../src/App.jsx): Registered `/clubs`, `/explore`, `/clubs/:slug`, `/my-clubs`, `/operator/members`, and `/clubs/:slug/members` routes.
- [`frontend/src/pages/Dashboard.jsx`](../../src/pages/Dashboard.jsx): Integrated `<Navbar />`, replaced hardcoded static header, added quick navigation links to Explorer, My Clubs, and Member Management, and updated Week 3 roadmap status.
- [`frontend/src/services/api.js`](../../src/services/api.js): Updated error extraction fallback to reference dynamic `API_BASE_URL` rather than hardcoded localhost.
- [`frontend/FRONTEND_README.md`](../../FRONTEND_README.md): Documented new components, Week 3 UI features, and updated implementation status matrix.
- [`README.md`](../../../README.md): Updated project status line to record Week 3 frontend completion.

## 5. Backend Dependencies & Endpoints
- `GET /api/clubs/` (Paginated, `?search=`, annotated with `follower_count`, `member_count`, `is_following`, `my_membership`)
- `GET /api/clubs/<slug>/` (Club detail)
- `PATCH /api/clubs/<slug>/` (Operator only: description, logo, contact_email)
- `POST/DELETE /api/clubs/<slug>/follow/` (Student follow/unfollow)
- `GET/POST/DELETE /api/clubs/<slug>/membership/` (Student membership status/request/leave)
- `GET /api/clubs/<slug>/members/` (Operator view: approved members; email omitted for privacy)
- `GET /api/clubs/<slug>/membership-requests/` (Operator view: pending requests)
- `POST /api/clubs/<slug>/memberships/<uuid>/approve/` (Approve request)
- `POST /api/clubs/<slug>/memberships/<uuid>/reject/` (Reject request)
- `DELETE /api/clubs/<slug>/memberships/<uuid>/` (Remove approved member)

## 6. Acceptance Criteria Verification
- [x] Students can browse and search verified JnU clubs (`ExploreClubs.jsx`).
- [x] Students can follow/unfollow with real-time follower count updates and optimistic cache updates (`ExploreClubs.jsx`, `ClubDetail.jsx`).
- [x] Students can submit membership requests and see `pending` status (`ClubDetail.jsx`, `MyClubs.jsx`).
- [x] Club operators can approve or reject pending requests (`OperatorMembers.jsx`).
- [x] Operator member list strictly omits student email addresses, honoring the student privacy constraint.
- [x] Unauthorized users cannot perform operator actions (`ProtectedRoute` role guard and frontend UI authorization checks).

## 7. Verification Commands & Results

### Automated Static Analysis & Bundling Quality Gates
```bash
# 1. ESLint Static Analysis (zero errors, zero warnings)
npm run lint
# Output: Exit code 0 (clean run)

# 2. Vite Production Build
npm run build
# Output:
# vite v5.3.5 building for production...
# transforming...
# ✓ 1845 modules transformed.
# rendering chunks...
# computing gzip size...
# dist/index.html                   1.34 kB │ gzip:   0.62 kB
# dist/assets/index-D4oCZM3w.css   27.76 kB │ gzip:   5.64 kB
# dist/assets/index-D4oCZM3w.js   356.34 kB │ gzip: 104.42 kB
# ✓ built in 844ms
# Exit code 0
```

## 8. Decisions & Recommendations for Backend Developer

1. **Category Taxonomy in Backend Model (`backend/apps/clubs/models.py`):**
   - **Current Implementation:** DRF `SearchFilter` searches only `name`. The `Club` model does not contain a `category` column.
   - **Frontend Approach:** The frontend provides Stitch category filter chips (`Technology`, `Debate`, `Arts & Culture`, `Sports`, `Academic`, `Social Welfare`) and filters dynamically based on club name and description keywords.
   - **Recommendation for Backend:** Add a `category` choice field to `Club` model (`CHOICES = [...]`) and add `'category'` to `filterset_fields` in `ClubViewSet` so filtering can be handled directly by PostgreSQL on large catalogs.

2. **Dedicated Student Memberships / Follows Endpoint:**
   - **Current Implementation:** `GET /api/clubs/` returns `is_following` and `my_membership` annotations. `MyClubs.jsx` queries the club catalog to partition clubs into "Joined", "Pending", and "Following".
   - **Recommendation for Backend:** For high-volume catalogs, provide a dedicated endpoint (e.g. `GET /api/clubs/my/` or `GET /api/clubs/?filter=my_clubs`) to return only the authenticated student's joined and followed clubs in a single compact response.

3. **Club Operator Associated Club Information in `/api/auth/me/`:**
   - **Current Implementation:** `GET /api/auth/me/` returns `user.name` which contains the club name for club operators, but does not provide `user.club_slug`.
   - **Frontend Approach:** `OperatorMembers.jsx` fetches `/api/clubs/` and matches `user.name` to resolve the operator's `club_slug`.
   - **Recommendation for Backend:** Include `club_slug` and `club_id` in `UserSerializer` when `role === 'club_operator'`.

4. **Student Privacy Protection:**
   - **Verified:** Backend `MembershipSerializer` explicitly excludes email addresses, returning only `student_id`, `name`, `department`, `batch`, and `status`.
   - **Frontend Strict Compliance:** `OperatorMembers.jsx` strictly respects this privacy boundary and renders only the verified university academic profile.

---

## 9. Stitch Design Refinement & Fidelity Review

Following the initial Week 3 functional delivery, all Week 3 views were redesigned against the Google Stitch HTML references in `docs/ui/stitch-export/stitch_jnuverse_campus_community_platform/`:

### Stitch References Used
1. `jnuverse_explore_clubs/code.html`: Used for `ExploreClubs.jsx` (atmospheric background, editorial header, white search & chips bar, asymmetric featured club banner, 3-column card grid, and FAQ banner).
2. `jnuverse_club_profile_management/code.html`: Used for `ClubDetail.jsx` (asymmetric 7/5-column grid, verification status banner, insignia presentation, and student viewport live mirror card).
3. `jnuverse_my_clubs/code.html`: Used for `MyClubs.jsx` (3-card overview metric ribbon, filter tab pills with counts, search filter, and 3-column membership cards).
4. `jnuverse_member_management_redesigned/code.html`: Used for `OperatorMembers.jsx` (3-card metrics ribbon, table rows with initials avatars, font-mono IDs, single-click approve/reject actions, and student revocation modal).
5. `jnuverse_student_dashboard_living_campus_experience/code.html`: Used for `Navbar.jsx` (80px fixed height, translucent backdrop, pill container, user profile indicator) and `Dashboard.jsx` (hero section with constellation interest tiles).

### Differences Addressed & Sections Reproduced
- **Atmospheric Background Canvas:** Replaced flat containers with subtle ambient gradient blobs (`bg-secondary-container/20` and `bg-tertiary-fixed-dim/25`).
- **Editorial Typography:** Recreated the Stitch headline styles ("Find your people. Follow your passion.") with gradient text fills and eyebrow badges with live pulsing dots.
- **Asymmetric Featured Showcase:** Replaced standard card with the 12-column asymmetric banner featuring decorative SVG geometry and right-side statistics panel.
- **Card Styling:** Updated cards to use Stitch squircle icon containers, verified badges, category tags, followers count with `group` icon, and dual pill action buttons.
- **Student Viewport Live Mirror:** Implemented the live mirror card in `ClubDetail.jsx` simulating the public view for students while operators edit profile details.
- **Prototype Switcher Omitted:** The floating developer state toolbar (`Live Data`, `Skeleton`, `Empty State`, `API Error`) from the Stitch export was deliberately not added to production; states are driven by real React state.

### Verification Quality Gate
- `npm run lint`: **Passed** (0 errors, 0 warnings).
- `npm run build`: **Passed** (0 errors; built in 787ms).
- *Note:* In accordance with testing policy, automatic headless browser sessions and screenshots were not launched. Visual fidelity is grounded in static inspection against the Stitch HTML templates.

---

## 10. Explore Clubs Section Redesign Against User Reference Images

Following user review, the **Explore Clubs** section was specifically refined against the user's provided reference images and Stitch design authority:

### Scope of Changes
- Confined strictly to `ExploreClubs.jsx` and narrow color token synchronization in `tailwind.config.js`.
- Surrounding layouts (Navbar, footer, Dashboard, Club Detail, My Clubs, Operator Members) were preserved without unauthorized redesigns.
- Existing functional integrations (backend API queries, client search and category filtering, follow/unfollow mutations, pagination, role-based controls) were completely retained.

### Specific Visual Alignments Made
1. **Primary Palette Alignment ([`tailwind.config.js`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/tailwind.config.js)):**
   - Configured `primary` to `#0810A4` (deep indigo from Stitch) and `primary-container` to `#2B34B9`, matching the reference screenshot's active pills, CTA buttons, and brand anchors.
   - Configured `secondary` to `#58579D`, `secondary-fixed` to `#E2DFFF`, and `on-secondary-fixed` to `#130E56`.

2. **Hero Positioning, Typography & Spacing:**
   - Increased outer desktop padding to `2xl:px-[100px]` and top spacing to `2xl:pt-[65px]` at ~2048px desktop width.
   - Retained uppercase eyebrow pill `• FIND YOUR COMMUNITY` with live pulsing dot.
   - Reconfigured hero into a balanced two-column desktop composition: ~60% left column (`lg:col-span-7`) containing the eyebrow pill, headline, and supporting copy; ~40% right column (`lg:col-span-5`) containing an ambient floating community icon constellation.
   - Refined headline line breaking to wrap strictly after **"Follow"**: Line 1 displays `Find your people. Follow` with `Find your people.` in dark navy and `Follow` in saturated gradient; Line 2 displays `your passion.` flush left with saturated gradient (`#2028C8` -> `#424BD6` -> `#6668E8`) and vertical spacing via `lg:mt-1 2xl:mt-2`. On mobile, it wraps naturally without forced breaks.
   - Designed a decorative right-side 5-icon community constellation representing Technology (`terminal`), Debate (`forum`), Photography (`photo_camera`), Arts & Culture (`theater_comedy`), and Sports (`sports_cricket`) orbiting a central JnUVerse core hub with soft gradient aura and subtle orbit rings. Icons feature staggered organic floating animations (`animate-orbit-float-1` to `5`) and strict `prefers-reduced-motion` compliance.
   - Scaled supporting description to ~24px (`2xl:text-[24px] 2xl:leading-[38px]`) in muted grey-purple (`#686B7D`) with natural wrapping.
   - Expanded vertical spacing between hero content and search bar (`2xl:gap-14`).

3. **Search Bar & Category Chips Row (102px Outer Container, 76px Input, 52px Chips):**
   - Increased outer white container height to ~102px (`2xl:min-h-[102px]`) with ~14px internal padding (`2xl:p-[14px]`), large rounded corners (`2xl:rounded-[26px]`), and soft indigo shadow.
   - Scaled search input field to ~74-76px height (`2xl:h-[74px]`) with soft lavender background (`bg-canvas-base`), leading search icon (`2xl:text-[28px]`), comfortable padding, text placeholder `"Search clubs by name, niche, or department..."`, and an embedded dedicated **Search** button (`#club-search-submit-btn`, `bg-primary hover:bg-primary-hover text-white font-bold`) positioned on the right of the input for immediate search execution.
   - Preserved single horizontal desktop row layout with search on left and category pills on right.
   - Scaled category pills to ~52px height (`2xl:h-[52px] 2xl:px-7`) with `All Clubs` in active deep-indigo (`bg-primary text-white font-bold`) and inactive pills in pale lavender (`bg-surface-lavender text-on-surface-variant`).
   - Preserved exact category order: `All Clubs`, `Academic`, `Cultural`, `Sports`, `Social & Volunteering`, `Technology`.

3. **Featured Showcase Banner (Target Screenshot Alignment):**
   - **Showcase Container:** Soft lavender-white gradient (`bg-gradient-to-br from-[#FAFAFE] via-[#F3F4FD] to-[#ECEEFC]`), rounded corners ~40px (`rounded-[28px] sm:rounded-[36px] 2xl:rounded-[40px]`), generous internal padding (`p-6 sm:p-10 lg:p-12 2xl:p-14`), and subtle border/shadow (`border border-[#E8EAFF]/60 shadow-[0_4px_32px_-8px_rgba(43,52,185,0.05)]`).
   - **Soft Translucent Lavender Circle:** Replaced dark/spiky SVG geometry with a smooth, translucent lavender circular shape (`bg-[#E2E5FD]/75`) placed behind the right statistics panel and clipped to container bounds.
   - **Upper-Left Featured Labels:** `FEATURED COMMUNITY` pill in pale lavender with deep indigo text, alongside `Chartered Guild` white pill with blue verified badge.
   - **Left Identity & Metadata:** Solid deep-indigo rounded-square icon tile (`w-14 h-14 2xl:w-16 2xl:h-16 bg-primary text-white`), large bold dark navy club name with inline `@slug`, compact metadata row (`Followers` with `groups` icon, `Approved Members` with `verified_user` shield, and faculty/dept pill with subtle `•` separators), readable medium-sized description, and horizontal action pills (`Explore Club`, `Following`/`+ Follow`, `Request Membership`/`Active Member`/`Pending Request`).
   - **Elevated Right Statistics Panel:** Pure white card surface (`bg-white shadow-[0_8px_30px_rgba(43,52,185,0.06)] border border-[#E8EAFF]/60`), header `ACTIVE COHORTS` with `Fall 2025` pill, two side-by-side statistic tiles bound to real API data (`Approved Members` and `Club Followers`), and bottom student-avatar stack (`RA`, `SN`, `TK`, `+{count}`) with `Registered JnU Students` caption. Zero invented marketing data.

4. **Directory Grid & Cards (3-Column Desktop Grid):**
   - Implemented Stitch themed icon squircles with category-specific backgrounds and text colors (`terminal` in soft blue, `forum` in secondary indigo, `photo_camera` in soft amber, `theater_comedy` in soft pink, `volunteer_activism` in emerald, `business_center`, `biotech`, `sports_cricket`, `movie`).
   - Added stacked top-right status badges: `Chartered` / `Official Wing` / `Verified` alongside student membership status (`Member` with `check_circle` or `Pending Request` with `hourglass_top`).
   - Right-aligned handle (`@slug` or acronym) on the baseline next to the club name.
   - Matched dual action pill buttons:
     - Follow toggle: `Following` (`bg-surface-lavender text-primary`) or `+ Follow` (`bg-primary text-white shadow-sm`).
     - Details link: `View Details` (clean white pill with soft shadow, no hard borders).
   - Removed hard gray card borders in favor of Stitch's clean white card surface with soft elevation `shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(43,52,185,0.08)]`.

5. **Advisory / FAQ Strip ("Want to charter a new club?"):**
   - Recreated the exact strip from the bottom of the reference screenshot with graduation cap icon (`school` in primary blue circle), title `Want to charter a new club?`, subtitle `Applications for Fall 2025 new student guilds are open until November 30.`, and dual pill action buttons (`Charter Guidelines` and `Start an Application`).

### Verification Results
- `npm run lint`: **Passed** (0 errors, 0 warnings).
- `npm run build`: **Passed** (0 errors; production bundle built in 787ms).

---

## 11. Navbar Redesign Against Reference Screenshot

Following user instruction, [`Navbar.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Navbar.jsx) was updated to match the reference screenshot with high fidelity:

### Layout & Sizing
- **Header Dimensions & Styling:** 80px fixed height (`h-20`), white background with subtle blur (`bg-surface-white/90 backdrop-blur-xl border-b border-surface-lavender`), and subtle shadow `shadow-[0_1px_8px_rgba(43,52,185,0.04)]`.
- **Mathematical Horizontal Centering:** Configured desktop layout with CSS Grid (`lg:grid lg:grid-cols-[1fr_auto_1fr] items-center`), ensuring the center pill navigation is placed at the exact 50% midpoint regardless of differing left brand or right user control widths.
- **Left Brand Section:** JnUVerse circular hub logo (`w-9 h-9 rounded-full bg-surface-lavender text-primary`), bold wordmark (`JnUVerse` with indigo `Verse`), and rounded lavender badge (`STUDENT PORTAL` / `OPERATOR PORTAL`).
- **Center Navigation Section:** Rounded lavender pill container with balanced all-sides padding (`p-1.5 gap-1 rounded-full bg-surface-lavender`) housing `Overview`, `Explore Clubs`, `My Clubs` (or `Manage Members` for operator), and `Events`. Active route renders as a solid deep-indigo pill (`px-5 sm:px-6 py-2 rounded-full bg-primary text-white font-bold text-xs sm:text-sm shadow-sm`); inactive routes render with dark text (`px-4 sm:px-5 py-2 text-on-surface-variant hover:text-on-surface`).
- **Right User Controls Section:**
  - Notification bell with unread indicator dot (`w-10 h-10` with primary dot), opening an interactive status popover.
  - User details stack with real profile data: Primary name (`user.name` or email) and secondary batch/department line using department short forms (e.g. `Batch 22 CSE` for Computer Science and Engineering, or `Official Club Executive` for operators).
  - Circular primary profile icon (`w-8 h-8 rounded-full bg-primary text-white` with `person` icon).
  - Dedicated sign out button with logout icon (`w-9 h-9 rounded-full text-text-muted hover:bg-error-container hover:text-on-error-container`).
- **Responsive Behavior:** Gracefully switches to mobile header with compact user controls and an expandable mobile navigation drawer on tablet and phone viewports (`< lg`).

### Verification Results
- `npm run lint`: **Passed** (0 errors, 0 warnings).
- `npm run build`: **Passed** (0 errors; production bundle built in 796ms).

---

## 12. Explore Clubs Hero Community Constellation Refinement (Matched to Reference Photo)

Following the user's reference photograph, the right-side hero illustration in [`ExploreClubs.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/ExploreClubs.jsx) was updated to match the exact floating community constellation composed of branded club cards, standalone squircle category badges, and compact pills:

### Composition & Layout Elements
1. **IT Society (Top Left Card):**
   - White rounded card (`rounded-2xl shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08)] border border-white/90`).
   - Icon: Blue `terminal` icon in light blue squircle (`bg-[#EEF2FF] text-[#2529C8]`).
   - Text stack: **IT Society** (`text-xs sm:text-sm font-bold text-on-surface`) / `Tech & AI` (`text-[10px] sm:text-[11px] text-text-muted`).
2. **Debating (Top Right Card):**
   - White rounded card (`rounded-2xl`).
   - Icon: Purple `chat` icon in light purple squircle (`bg-[#F3F0FF] text-[#6366F1]`).
   - Text stack: **Debating** (`text-xs sm:text-sm font-bold text-on-surface`) / `Public Policy` (`text-[10px] sm:text-[11px] text-text-muted`).
3. **Sports Badge (Far Left):**
   - Standalone warm cream squircle badge (`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] shadow-sm`).
   - Icon: Warm amber `sports_cricket`.
4. **Science Club (Center Card — Transparent Surface over Dark Glowing Aura):**
   - Translucent/transparent glass surface (`bg-white/10 backdrop-blur-sm border border-white/80 shadow-[0_8px_24px_-4px_rgba(43,52,185,0.08)] rounded-2xl`).
   - Behind the card: Darker ambient blue-violet glowing aura (`bg-gradient-to-tr from-[#3B45D6]/30 via-[#5E67EE]/35 to-[#8A90F5]/25 blur-3xl`) which shines directly through the transparent surface.
   - Icon: Sky-blue `biotech` microscope icon in cyan squircle (`bg-[#F0F9FF]/80 text-[#0284C7]`).
   - Text stack: **Science Club** (`text-xs sm:text-sm font-bold text-on-surface`) / `Research` in bold royal blue font (`text-[10px] sm:text-[11px] font-semibold text-[#2529C8]`).
5. **Photography Badge (Far Right):**
   - Standalone warm peach squircle badge (`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] shadow-sm`).
   - Icon: Amber `photo_camera`.
6. **Rover Scout (Lower Left Card):**
   - White rounded card (`rounded-2xl`).
   - Icon: Emerald green `volunteer_activism` helping-hand icon in mint squircle (`bg-[#ECFDF5] text-[#059669]`).
   - Text stack: **Rover Scout** (`text-xs sm:text-sm font-bold text-on-surface`) / `Leadership` (`text-[10px] sm:text-[11px] text-text-muted`).
7. **Cultural Wing (Lower Right Card):**
   - White rounded card (`rounded-2xl`).
   - Icon: Rose `theater_comedy` drama masks icon in light rose squircle (`bg-[#FFF1F2] text-[#E11D48]`).
   - Text stack: **Cultural Wing** (`text-xs sm:text-sm font-bold text-on-surface`) / `Drama & Arts` (`text-[10px] sm:text-[11px] text-text-muted`).
8. **Film & Drama (Bottom Center Compact Pill):**
   - White compact rounded pill (`rounded-full px-3 py-1.5 shadow-sm border border-white/90`).
   - Left icon: Small rose `movie` clapper icon (`bg-[#FFF1F2] text-[#E11D48]`).
   - Text: **Film & Drama** (`text-xs font-bold text-on-surface`), clean without any trailing blue dot.
9. **Ambient Accent Dot (Bottom Right):**
   - Soft periwinkle/lavender dot (`w-2.5 h-2.5 rounded-full bg-[#C7D2FE]`) positioned below the Cultural Wing card.

### Motion & Accessibility
- Gentle vertical breathing/floating animations (`animate-orbit-float-1` through `animate-orbit-float-5`) with slow 5.8s–7.2s cycles.
- Automatically disabled under `prefers-reduced-motion: reduce`.

---

## 13. Navbar Navigation Link Padding & Discovery Search Enhancements

### 1. Navigation Pill Track & Button Padding Architecture ([`Navbar.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/components/Navbar.jsx))
- **Track Container Padding (`p-2`):** Enhanced the center pill `<nav>` container with generous 8px outer padding from all sides (`p-2 rounded-full bg-surface-lavender gap-1 sm:gap-1.5`). This ensures the active pill button (`Explore Clubs`) and adjacent nav items sit recessed inside the lavender capsule with uniform visual breathing room on all 4 sides.
- **Crisp Button Text Geometry:** Rather than bloating text padding inside individual buttons (`py-2 px-5/px-6`), reverted and refined link internal text padding to crisp, compact dimensions (`px-3.5 sm:px-4 py-1.5 text-xs font-semibold` for inactive items, `px-4 sm:px-4.5 py-1.5 text-xs font-bold bg-primary text-white shadow-sm` for active items).
- **Department Short Form Inference:** Maintained student badge formatting in the navbar user stack (e.g., `Batch 22 CSE` via `getDepartmentShortForm`).

### 2. Dedicated Club Search Action ([`ExploreClubs.jsx`](file:///Users/anikkhondokar/Desktop/Software/JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities/frontend/src/pages/ExploreClubs.jsx))
- Integrated dedicated `#club-search-submit-btn` within the hero search input container with primary blue fill, search icon, and responsive sizing.



