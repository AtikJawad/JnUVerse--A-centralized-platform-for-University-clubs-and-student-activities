# JnUVerse

**A Centralized Platform for University Clubs & Student Activities**
Jagannath University (JnU), Bangladesh — Software Engineering course project.

> Status: **Week 1 of 14 — Project Foundation.** No product features are
> implemented yet. This repository currently contains the initialized
> repository structure, frontend/backend scaffolding, and environment
> configuration only. See [Current Development Status](#current-development-status).

---

## 1. Project Description

JnUVerse is a centralized web platform, built specifically for Jagannath
University, that connects students with verified university clubs and the
activities those clubs organize. It brings club discovery, membership
(follow/join), event publishing and registration, notifications, club
collaboration, and post-event feedback into one system, under University
Admin oversight and moderation.

The system defines three locked system-level roles:

1. **Student**
2. **Club Officer / Club Operator** — exactly one authorized account per
   club for system-level club operations (executive-committee titles like
   President or Secretary are informational only, not separate system roles)
3. **University Admin**

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
│   │   ├── accounts/          # Users & the three system roles
│   │   ├── clubs/             # Clubs, membership, Club Officer workflow
│   │   ├── events/            # Event creation, browsing, registration
│   │   ├── notifications/     # MVP notification audiences
│   │   ├── feedback/          # Post-event feedback
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

## 6. Current Development Status

This repository reflects **Week 1 of the 14-week JnUVerse roadmap**:
project foundation only.

**Implemented this week:**
- Locked repository structure (backend, frontend, docs)
- Django project (`config`) and all seven planned app skeletons
  (`accounts`, `clubs`, `events`, `notifications`, `feedback`,
  `collaborations`, `reports`) — apps registered in `INSTALLED_APPS`, no
  business models yet except the `accounts` app's role definition
- Django settings reading all secrets/config from environment variables,
  pre-wired for Supabase PostgreSQL
- A minimal `/api/health/` endpoint
- React + Vite + Tailwind CSS + ESLint frontend scaffold, with a
  placeholder homepage that checks backend connectivity
- `.gitignore` covering secrets, dependencies, and build artifacts on both
  sides
- `requirements.txt` and `package.json` with the locked dependency set

**Not implemented yet (scheduled in later weeks per the roadmap):**
- Authentication, JWT issuance, and RBAC enforcement (Week 5)
- Any club, event, notification, feedback, collaboration, or report
  business logic or models beyond placeholders
- Real UI screens beyond the placeholder homepage
- OpenAPI/Swagger documentation generation

See `docs/weekly-progress/` for per-week updates as the project continues.

## 7. Team

| Role | Responsibility |
|---|---|
| Requirement Engineer | Requirements, use cases, requirement documentation |
| Database Designer | ERD, schema, relationships, database design |
| UML Designer | Use Case, Class, Activity, Sequence diagrams |
| UI Designer | Wireframes, UI/UX, design consistency |
| MVP Coder (Frontend) | React/Vite frontend implementation |
| MVP Coder (Backend, Database) | Django/DRF backend, APIs, business logic |
| Tester | Test cases, integration testing, validation |
