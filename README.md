# JnUVerse

**A Centralized Platform for University Clubs & Student Activities**
Jagannath University (JnU), Bangladesh — Software Engineering course project.

> Status: **Week 3 of 10: clubs and memberships (backend complete, frontend pending)** 
Verified by the team on a real Supabase database:
The migrations for all 7 apps applied cleanly.
check reports no issues.
All 14 database constraints were tested and rolled back.
Student registration, club registration, login by email or Student ID, token refresh and me all work.
Swagger loads, and spectacular --validate prints no warnings.
Built but with no endpoints yet: ClubFollow, ClubMembership, Event, EventRegistration, Notice, Notification, EventRating, CollaborationRequest and ContentReport.
Not done yet: the Week 2 frontend (Antigravity), and the use-case, class and architecture diagrams.

---

## 1. Project Description

JnUVerse is a centralized web platform, built specifically for Jagannath
University, that connects students with verified university clubs and the
activities those clubs organize. It brings club discovery, membership
(follow/join), event publishing and registration, notifications, club
collaboration, and post-event rating feedback into one system.

The system defines two system-level roles:

1. **Student**
2. **Club Officer / Club Operator** — exactly one authorized account per
   club for system-level club operations (executive-committee titles like
   President or Secretary are informational only, not separate system roles)

### Updated requirements (10-week plan)

- There is **no University Admin role**. A club is considered **verified
  as soon as its account is successfully created** — there is no separate
  admin approval step.
- **Student verification**: Student ID + email must match a valid JnU
  student record stored in the database (records imported by the team;
  implemented in Week 2).
- **Event feedback is rating-only** — no written comments.
- **Five analytical reports** are planned; their specifications will be
  decided in a later week (Week 8 in the plan).

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + JavaScript + Tailwind CSS + ESLint |
| Backend | Python + Django + Django REST Framework |
| Database | PostgreSQL, hosted on **Supabase** |
| API | REST API, documented with OpenAPI/Swagger |
| Authentication | JWT with Role-Based Access Control (RBAC) |
| Version Control | Git + GitHub |
| Architecture | Modular monolith |

## 3. High-Level Architecture

```
React + Vite (frontend)
        |
        v
Django + Django REST Framework (backend API)
        |
        v
Supabase PostgreSQL (hosted database)
```

The React frontend **never** connects to PostgreSQL/Supabase directly — it
only ever calls the Django/DRF API, which is the sole owner of the database
connection and all business logic.

The backend is a **modular monolith**: a single Django project, internally
organized into independent apps by business domain (`accounts`, `clubs`,
`events`, `notifications`, `feedback`, `collaborations`, `reports`), rather
than separate microservices.

## 4. Repository Structure

```
JnUVerse/
│
├── backend/                 # Django + DRF API
│   ├── manage.py
│   ├── config/               # Django project settings, root URLs, WSGI/ASGI
│   ├── apps/
│   │   ├── accounts/          # Users & the two system roles
│   │   ├── clubs/             # Clubs, membership, Club Operator workflow
│   │   ├── events/            # Event creation, browsing, registration
│   │   ├── notifications/     # MVP notification audiences
│   │   ├── feedback/          # Post-event ratings (rating-only)
│   │   ├── collaborations/    # Club-to-club collaboration requests
│   │   └── reports/           # Reporting inappropriate clubs/events
│   ├── requirements.txt
│   └── .env.example           # copy to .env locally — never commit .env
│
├── frontend/                # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/              # Route-level pages
│   │   ├── layouts/            # Shared page layouts
│   │   ├── services/           # API client / fetch wrappers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── context/             # React context providers
│   │   ├── utils/               # Helper functions
│   │   └── assets/              # Images, icons, static assets
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── requirements/          # Requirement Engineer's deliverables
│   ├── uml/                   # UML Designer's diagrams
│   ├── database/              # Database Designer's ERD/schema docs
│   ├── ui/                    # UI Designer's wireframes/mockups
│   └── weekly-progress/       # Weekly progress documentation
│
├── .gitignore
├── README.md
└── LICENSE
```

## 5. Setup & Run Instructions
after migrate, run python manage.py import_student_records data\student_records_sample.csv, with the team’s real list kept out of git.

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and pip
- A Supabase project (for the hosted PostgreSQL database)
- Git

### Backend (Django + DRF)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env with your real Supabase DB credentials and a real
# DJANGO_SECRET_KEY — never commit this file

python manage.py migrate
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/`. A basic health-check
endpoint is available at `http://127.0.0.1:8000/api/health/`.

### Frontend (React + Vite)

```bash
cd frontend
npm install

cp .env.example .env
# defaults to VITE_API_BASE_URL=http://127.0.0.1:8000, adjust if needed

npm run dev
```

The app will be available at `http://localhost:5173/`.

### Both together
Run the backend and frontend commands above in two separate terminals. The
placeholder homepage will show whether the frontend can successfully reach
the backend's health-check endpoint.

### Running tests
cd backend
pip install -r requirements-dev.txt
# local PostgreSQL only; defaults: user postgres, password postgres, localhost:5432
# override with TEST_DB_PASSWORD / TEST_DB_PORT / TEST_DB_USER if needed
python -m pytest


## 6. Development Plan & Current Status

The project follows the **10-week development plan** (`10_week_development_plan.pdf`):

| Week | Focus |
|---|---|
| 1 | Project foundation |
| 2 | Database design & authentication (models, migrations, registration, login, JWT, student verification, diagrams) |
| 3 | Clubs & memberships |
| 4 | Events & registration |
| 5 | Notices & notifications |
| 6 | Ratings & collaboration |
| 7 | Reports (inappropriate club/event) & dashboards |
| 8 | Five analytical reports |
| 9 | Integration & testing |
| 10 | Finalization & delivery |

**Week 1 — what exists in the repository:**
- Locked repository structure (backend, frontend, docs)
- Django project (`config`) and seven app skeletons, registered in
  `INSTALLED_APPS`; the only model is a placeholder `accounts.User` role
  definition (Student / Club Officer)
- Settings read from environment variables, pre-wired for Supabase PostgreSQL
- A minimal `/api/health/` endpoint
- React + Vite + Tailwind + ESLint scaffold with a placeholder page that
  calls `/api/health/`
- `.gitignore`, `requirements.txt`, `package.json`

**Verification status (be honest about it):**
- club list, detail and update; follow and unfollow; the full membership workflow (request, approve, reject, leave, remove, rejoin); and 57 automated tests on a local PostgreSQL.

**Not implemented yet (later weeks):**  events, notices and notifications, ratings, collaboration, reports, and the five analytical reports.

## 7. Team & Roles

Responsibilities come from the team's role matrix. Individual Week 1
contributions have **not** been recorded in this repository yet — each owner
should add theirs to `docs/weekly-progress/` rather than have them assumed here.

| Member | Course role | Responsibility | Week 1 contribution |
|---|---|---|---|
| Tahmida Aziza | Requirement Engineer | Requirements, use cases, documentation | TBD by member |
| Md Sohag | Database Designer | ERD, schema, relationships | TBD by member |
| Lutfun Nahar | UML Designer | Use Case, Class, Activity, Sequence diagrams | TBD by member |
| Md Jahid Hasan | UI Designer | Wireframes, UI/UX consistency | TBD by member |
| Anik Khondokar | MVC Coder (Frontend) | React/Vite implementation | TBD by member |
| Atik Jawad | MVC Coder (Backend, Database) | Django/DRF, APIs, business logic | TBD by member |
| Sheak Noor Muhammad Nabil | Tester | Test cases, integration testing, validation | TBD by member |


