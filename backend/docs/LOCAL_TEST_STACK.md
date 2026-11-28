# Local test stack — step by step (Windows PowerShell)

Goal: run the backend on **your own computer** with its **own empty PostgreSQL database**, so you can test uploads, approvals, attendance and reports without touching the shared Supabase database.

You need: PostgreSQL installed and running (the same one `pytest` already uses), the backend `venv`, and Node for the frontend.

Every backend command below ends with `--settings=config.settings_local`. That flag is what points Django at the local database. **Never leave it out**, or the command uses the shared Supabase database.

---

## Part A. One-time setup

### Step 1. Create the empty local database
Pick one way.

**Way 1, pgAdmin:** open pgAdmin, right-click *Databases*, *Create*, *Database*, name it `jnuverse_local`, Save.

**Way 2, PowerShell:**
```
psql -U postgres -c "CREATE DATABASE jnuverse_local;"
```
(If `psql` is not found, use Way 1.) Enter your postgres password when asked.

### Step 2. Open the backend folder with the venv on
```
cd "E:\JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities\backend"
venv\Scripts\activate
```
You should see `(venv)` at the start of the line.

### Step 3. Tell Django your postgres password (only if it is not `postgres`)
The defaults are user `postgres`, password `postgres`, host `localhost`, port `5432`. If yours differ, set them (this window only):
```
$env:LOCAL_DB_PASSWORD="your-password"
```
Other optional names: `LOCAL_DB_USER`, `LOCAL_DB_PORT`, `LOCAL_DB_NAME`.

### Step 4. Check that you are on the LOCAL database (important)
```
python manage.py shell --settings=config.settings_local -c "from django.conf import settings; d=settings.DATABASES['default']; print(d['HOST'], d['NAME'])"
```
It must print: `localhost jnuverse_local`. If it prints anything else (like a supabase address), stop.

### Step 5. Create the tables
```
python manage.py migrate --settings=config.settings_local
```

### Step 6. Add the demo data
```
python manage.py bootstrap_local_demo --settings=config.settings_local
```
It prints "Local demo ready". This imports the sample student records, creates the operator `club1@example.com`, and seeds the `[DEMO]` clubs, events, students, attendance and ratings.

---

## Part B. Every time you want to test

### Terminal 1, backend
```
cd "E:\JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities\backend"
venv\Scripts\activate
python manage.py runserver --settings=config.settings_local
```
Leave it running. Check it works: open http://127.0.0.1:8000/api/health/ in the browser. You should see `{"status": "ok", ...}`.

### Terminal 2, frontend
```
cd "E:\JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities\frontend"
npm run dev
```
Make sure `frontend\.env` contains `VITE_API_BASE_URL=http://127.0.0.1:8000`. Open http://localhost:5173 and log in.

### Logins (password for all: `Str0ng-Pass-123`)
| Who | Login |
|---|---|
| Club operator | `club1@example.com` |
| Students | `demo1@demo.jnuverse.test` to `demo5@demo.jnuverse.test` |

Anything you change (uploads, approvals, attendance, reports) stays in your local database only.

### Run the frontend automated tests (Terminal 3)
With the backend and frontend running:
```
cd "E:\JnUVerse--A-centralized-platform-for-University-clubs-and-student-activities\frontend"
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:resilience
npm run audit:api
```
All 9 resilience checks should print `PASS`.

---

## Part C. Reset or start over

Restore the demo data to its original state (keeps your database):
```
python manage.py seed_demo_events --reset --settings=config.settings_local
python manage.py seed_demo_events --settings=config.settings_local
```
Start completely fresh: stop the server, delete the database (pgAdmin: right-click `jnuverse_local`, Delete; or `psql -U postgres -c "DROP DATABASE jnuverse_local;"`), then repeat Part A from Step 1.

Uploaded images are saved in `backend\media_local\` (ignored by git).

---

## Problems and fixes
| Message | Meaning and fix |
|---|---|
| `password authentication failed for user "postgres"` | Wrong password. Do Step 3. |
| `database "jnuverse_local" does not exist` | Do Step 1. |
| `connection refused` / `could not connect` | PostgreSQL is not running. Start the PostgreSQL service. |
| `settings_local only works with a LOCAL PostgreSQL` | `LOCAL_DB_HOST` is set to something that is not localhost. Clear it. |
| `Club/operator not found` when seeding | You skipped `bootstrap_local_demo`. Run Step 6. |
| Frontend shows the real (Supabase) data | The backend was started without `--settings=config.settings_local`. Stop it and restart with the flag. |

Backend automated tests are separate: `python -m pytest` (from `backend\`) creates and removes its own temporary database each time.
