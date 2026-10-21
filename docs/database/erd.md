# JnUVerse — ER Diagram (Week 2)

Generated from the final Django models (accounts, clubs, events, notifications, feedback, collaborations, reports).
`VALID_STUDENT_RECORD` has no foreign keys: it is reference data matched by Student ID + email at registration.
GitHub renders the diagram below; `erd.png` is the same diagram as an image.

```mermaid
erDiagram
    USER ||--o| STUDENT_PROFILE : "has (students)"
    USER ||--o| CLUB : "operates (club operators)"
    STUDENT_PROFILE }o--o{ INTEREST : "has interests"
    STUDENT_PROFILE ||--o{ CLUB_FOLLOW : follows
    CLUB ||--o{ CLUB_FOLLOW : "followed by"
    STUDENT_PROFILE ||--o{ CLUB_MEMBERSHIP : requests
    CLUB ||--o{ CLUB_MEMBERSHIP : has
    USER |o--o{ CLUB_MEMBERSHIP : reviewed_by
    CLUB ||--o{ EVENT : organizes
    USER ||--o{ EVENT : created_by
    EVENT ||--o{ EVENT_REGISTRATION : has
    STUDENT_PROFILE ||--o{ EVENT_REGISTRATION : registers
    EVENT ||--o{ EVENT_RATING : receives
    STUDENT_PROFILE ||--o{ EVENT_RATING : gives
    CLUB ||--o{ NOTICE : publishes
    USER ||--o{ NOTICE : created_by
    USER ||--o{ NOTIFICATION : receives
    NOTICE |o--o{ NOTIFICATION : "source"
    EVENT |o--o{ NOTIFICATION : "source"
    CLUB ||--o{ COLLABORATION_REQUEST : "requesting"
    CLUB ||--o{ COLLABORATION_REQUEST : "target"
    EVENT |o--o{ COLLABORATION_REQUEST : "related event"
    USER ||--o{ CONTENT_REPORT : reports
    CLUB |o--o{ CONTENT_REPORT : "reported club"
    EVENT |o--o{ CONTENT_REPORT : "reported event"

    USER {
        uuid id PK
        string email UK
        string role "student | club_operator"
        bool is_active
        bool is_staff "dev admin only"
        datetime created_at
        datetime updated_at
    }
    VALID_STUDENT_RECORD {
        uuid id PK
        string student_id UK
        string full_name
        string email
        bool is_active
    }
    STUDENT_PROFILE {
        uuid id PK
        uuid user_id FK,UK
        string jnu_student_id UK
        string full_name
        string department
        int batch
        datetime verified_at
    }
    INTEREST {
        uuid id PK
        string name UK
    }
    CLUB {
        uuid id PK
        uuid operator_id FK,UK
        string name "unique, case-insensitive"
        string slug UK
        text description
        url logo
        email contact_email
    }
    CLUB_FOLLOW {
        uuid id PK
        uuid student_id FK
        uuid club_id FK
        datetime created_at
    }
    CLUB_MEMBERSHIP {
        uuid id PK
        uuid student_id FK
        uuid club_id FK
        string status "pending|approved|rejected|left|removed"
        datetime requested_at
        datetime reviewed_at
        uuid reviewed_by_id FK
    }
    EVENT {
        uuid id PK
        uuid club_id FK
        uuid created_by_id FK
        string title
        text description
        string venue
        datetime starts_at
        datetime ends_at
        int capacity
        string status "draft|published|cancelled"
    }
    EVENT_REGISTRATION {
        uuid id PK
        uuid event_id FK
        uuid student_id FK
        datetime registered_at
        string status "registered|cancelled"
    }
    EVENT_RATING {
        uuid id PK
        uuid event_id FK
        uuid student_id FK
        int rating "1 to 5, no comments"
    }
    NOTICE {
        uuid id PK
        uuid club_id FK
        uuid created_by_id FK
        string title
        text body
        string audience "public|followers|members|department"
        string target_department
    }
    NOTIFICATION {
        uuid id PK
        uuid recipient_id FK
        uuid notice_id FK
        uuid event_id FK
        string title
        text message
        string type
        datetime read_at
    }
    COLLABORATION_REQUEST {
        uuid id PK
        uuid requesting_club_id FK
        uuid target_club_id FK
        uuid event_id FK
        string title
        string status "pending|accepted|rejected|cancelled"
        datetime responded_at
    }
    CONTENT_REPORT {
        uuid id PK
        uuid reporter_id FK
        uuid club_id FK
        uuid event_id FK
        string reason
        string status "open|under_review|resolved|dismissed"
    }
```
