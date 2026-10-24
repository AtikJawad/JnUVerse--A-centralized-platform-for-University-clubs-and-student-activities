# Week 02 — Backend Handoff: Authentication, Registration & Student Verification

**To:** Atik Jawad (Backend MVP Coder) & Development Team  
**From:** Anik Khondokar (Frontend MVP Coder)  
**Topic:** JWT Authentication, Dual-Identifier Login, Student Registration & Registrar Sync  
**Status:** **Completed & Verified**  

---

## 1. Required Backend Capabilities
- Dual-identifier authentication supporting either JnU Student ID (e.g. `B220305043`) or student email address.
- Student registration strictly validated against pre-populated `ValidStudentRecord` database entries.
- SimpleJWT token generation (`access` + `refresh`), token refresh handling, and token verification.
- Authenticated user session retrieval (`/api/auth/me/`) returning profile data and role.
- Dynamic academic departments choices list matching `DEPARTMENT_CHOICES`.

## 2. Existing Verified API Endpoints & Contracts

### A. Student Registration: `POST /api/auth/register/student/`
- **Auth:** None (`AllowAny`)
- **Request Body (JSON):**
  ```json
  {
    "student_id": "B220305047",
    "email": "anik12@gmail.com",
    "department": "Computer Science and Engineering (CSE)",
    "batch": 22,
    "password": "Str0ng-Pass-123",
    "password_confirm": "Str0ng-Pass-123"
  }
  ```
- **Expected Success (HTTP 201 Created):**
  ```json
  {
    "id": "uuid-here",
    "email": "anik12@gmail.com",
    "student_id": "B220305047",
    "name": "Anik Khondokar",
    "department": "Computer Science and Engineering (CSE)",
    "batch": 22,
    "role": "student"
  }
  ```
- **Validation Errors (HTTP 400 Bad Request):**
  - Mismatch with `ValidStudentRecord`: `{"non_field_errors": ["Student ID and email do not match a valid JnU student record."]}`
  - Existing account: `{"non_field_errors": ["An account already exists for this student."]}`
  - Password mismatch: `{"password_confirm": ["Passwords do not match."]}`

### B. User Login: `POST /api/auth/login/`
- **Auth:** None (`AllowAny`)
- **Request Body (JSON):**
  ```json
  {
    "identifier": "B220305043",
    "password": "Str0ng-Pass-123"
  }
  ```
  *(Note: `identifier` accepts either email or `student_id`).*
- **Success (HTTP 200 OK):**
  ```json
  {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi...",
    "user": {
      "id": "5458c6e6-345e-486f-af68-e03de1a223e6",
      "email": "atikjawad@gmail.com",
      "student_id": "B220305043",
      "name": "Atik Jawad",
      "department": "Computer Science and Engineering (CSE)",
      "batch": 22,
      "role": "student"
    }
  }
  ```

### C. Token Refresh: `POST /api/auth/refresh/`
- **Auth:** None (`AllowAny`)
- **Request Body (JSON):** `{"refresh": "<refresh_token>"}`
- **Success (HTTP 200 OK):** `{"access": "<new_access_token>"}`

### D. Current User Session: `GET /api/auth/me/`
- **Auth:** Bearer JWT (`IsAuthenticated`)
- **Success (HTTP 200 OK):** Returns authenticated `user` object.

### E. Department Choices: `GET /api/auth/departments/`
- **Auth:** None (`AllowAny`)
- **Success (HTTP 200 OK):** `{"departments": ["Bangla", "English", ..., "Computer Science and Engineering (CSE)", ...]}` (38 departments).

## 3. Permissions & Role Restrictions
- Exactly two user roles: `student` and `club_operator`.
- `is_staff = True` is reserved for Django admin access only; no separate API admin role exists.

## 4. Data Privacy Constraints
- `ValidStudentRecord` table is reference-only and must never be exposed via an API endpoint.
- Student password hash is never serialized.

## 5. Testing Expectations & Evidence
- Live tested and verified against local running server (`http://127.0.0.1:8000`):
  - Login by email: HTTP 200 OK
  - Login by Student ID: HTTP 200 OK
  - JWT profile fetch: HTTP 200 OK
  - Refresh token: HTTP 200 OK

## 6. Status & Decisions
- **Status:** **Completed & Verified**.
- **Decisions:** University Admin role was removed; club accounts are verified upon creation.
