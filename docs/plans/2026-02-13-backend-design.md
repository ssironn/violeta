# Violeta Backend Design

## Overview

Add a backend to Violeta (Visual LaTeX Editor) to support user accounts, document persistence, document sharing, and Google Drive integration.

## Tech Stack

- **Backend:** Python + FastAPI
- **Database:** PostgreSQL 16
- **ORM:** SQLModel (SQLAlchemy + Pydantic)
- **Migrations:** Alembic
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **Google API:** google-api-python-client, google-auth-oauthlib
- **Deployment:** Docker Compose

## Architecture

Monolithic FastAPI application. Single codebase handling auth, documents, sharing, and Google Drive integration.

## Project Structure

```
violeta/
├── frontend/                    # React app (moved from root)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings (env vars)
│   │   ├── database.py          # PostgreSQL connection + session
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   └── document.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   └── document.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   ├── sharing.py
│   │   │   └── google_drive.py
│   │   ├── services/
│   │   │   ├── auth.py
│   │   │   ├── document.py
│   │   │   └── google_drive.py
│   │   └── utils/
│   │       ├── security.py      # JWT + password hashing
│   │       └── google_auth.py   # Google OAuth2 helpers
│   ├── migrations/              # Alembic DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── .env
```

## Database Schema

### Users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Required |
| email | VARCHAR(255) | Unique, indexed |
| password_hash | VARCHAR(255) | bcrypt hash |
| google_refresh_token | TEXT | Encrypted, nullable |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

### Documents

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| owner_id | UUID | FK to users |
| title | VARCHAR(255) | Document title |
| content | JSONB | TipTap editor JSON |
| is_public | BOOLEAN | Default false |
| share_token | VARCHAR(64) | Unique, nullable |
| copied_from_id | UUID | FK to documents, nullable |
| google_drive_file_id | VARCHAR(255) | Nullable |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

## API Endpoints

### Auth (`/api/auth`)

- `POST /register` — Create account (name, email, password)
- `POST /login` — Get JWT access + refresh tokens
- `POST /refresh` — Refresh access token
- `GET /me` — Get current user profile

Auth: JWT with 15-min access tokens + 7-day refresh tokens. Access token in Authorization header, refresh token in httpOnly cookie.

### Documents (`/api/documents`)

- `GET /` — List user's documents (paginated)
- `POST /` — Create new document
- `GET /{id}` — Get document by ID (owner only)
- `PUT /{id}` — Update document content/title
- `DELETE /{id}` — Delete document
- `POST /{id}/share` — Generate share link
- `DELETE /{id}/share` — Revoke share link

### Sharing (`/api/shared`)

- `GET /{share_token}` — View shared document (no auth required)
- `POST /{share_token}/copy` — Make a personal copy (auth required)

### Google Drive (`/api/google`)

- `GET /auth` — Start Google OAuth2 flow
- `GET /callback` — OAuth2 callback
- `GET /files` — List user's Google Drive files
- `POST /import/{file_id}` — Import Google Doc into Violeta
- `POST /export/{document_id}` — Export Violeta doc to Google Drive

## Google Drive Integration

### OAuth2 Flow
1. User clicks "Connect Google Drive"
2. Backend redirects to Google OAuth consent screen (scopes: drive.file, drive.readonly)
3. User grants permission, Google redirects to callback
4. Backend stores encrypted refresh token in user record

### Import (Google Drive → Violeta)
1. User browses Drive files, selects a Google Doc
2. Backend exports doc as HTML via Google Docs API
3. Backend converts HTML to TipTap JSON
4. New Violeta document created with google_drive_file_id stored

### Export (Violeta → Google Drive)
1. User clicks "Export to Google Drive"
2. Backend converts TipTap JSON to HTML
3. Backend creates new Google Doc with HTML content
4. google_drive_file_id stored for reference

### Limitations
- No real-time sync (import/export are one-time operations)
- Math/LaTeX exported as images or plain text (Google Docs doesn't support LaTeX)
- Complex Google Docs features (comments, suggestions) not imported

## Document Sharing

### Share Flow
1. Owner clicks "Share" → backend generates 32-char hex share_token, sets is_public=true
2. Shareable URL: `/shared/{share_token}`
3. Anyone with the link can view (read-only TipTap editor)

### "Make a Copy" Flow
1. Logged-in viewer clicks "Make a personal copy"
2. Backend deep-copies JSONB content to new document
3. New document: owner_id=current user, copied_from_id=original, title="Copy of {original}"

### Revoking
- Owner clears share_token and sets is_public=false
- Existing copies are unaffected (independent documents)

## Docker Setup

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: violeta
      POSTGRES_USER: violeta
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  backend:
    build: ./backend
    depends_on: [db]
    environment:
      DATABASE_URL: postgresql+asyncpg://violeta:${DB_PASSWORD}@db/violeta
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
```

Development: Vite dev server proxies API calls to FastAPI backend.

## Document Storage

TipTap JSON stored in PostgreSQL JSONB column. This preserves the full editing state and is the format the frontend works with directly. LaTeX is generated client-side from the JSON when needed.
