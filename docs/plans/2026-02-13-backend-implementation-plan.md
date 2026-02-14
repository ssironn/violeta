# Violeta Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Python/FastAPI backend to Violeta with user authentication, document persistence, document sharing, and Google Drive integration.

**Architecture:** Monolithic FastAPI application with PostgreSQL via SQLModel ORM. JWT-based authentication with access + refresh tokens. Frontend moved to `frontend/` subdirectory, backend lives in `backend/`. Docker Compose orchestrates everything.

**Tech Stack:** Python 3.12, FastAPI, SQLModel, Alembic, PostgreSQL 16, python-jose, passlib, google-api-python-client, Docker Compose

**Design doc:** `docs/plans/2026-02-13-backend-design.md`

---

## Task 1: Reorganize Project — Move Frontend to `frontend/`

**Files:**
- Move: all root-level frontend files → `frontend/`
- Keep at root: `docs/`, `docker-compose.yml`, `.env`, `.gitignore`

**Step 1: Create `frontend/` directory and move files**

```bash
mkdir -p frontend
# Move frontend files into frontend/
git mv src/ frontend/src/
git mv public/ frontend/public/
git mv index.html frontend/
git mv package.json frontend/
git mv package-lock.json frontend/
git mv vite.config.ts frontend/
git mv tsconfig.json frontend/
git mv tsconfig.app.json frontend/
git mv tsconfig.node.json frontend/
git mv eslint.config.js frontend/
git mv README.md frontend/
```

**Step 2: Verify frontend still works**

```bash
cd frontend && npm install && npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Update root `.gitignore`**

Add `backend/__pycache__/`, `backend/.venv/`, `.env` to root `.gitignore`. Keep `node_modules` entry (it still applies under `frontend/`).

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: move frontend into frontend/ subdirectory for monorepo structure"
```

---

## Task 2: Backend Scaffolding — FastAPI Project Setup

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/requirements.txt`

**Step 1: Create `requirements.txt`**

```
fastapi==0.115.12
uvicorn[standard]==0.34.2
sqlmodel==0.0.24
asyncpg==0.30.0
alembic==1.15.2
python-jose[cryptography]==3.4.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
pydantic[email]==2.11.3
httpx==0.28.1
```

**Step 2: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://violeta:violeta@localhost:5432/violeta"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/google/callback"
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_file": "../.env"}


settings = Settings()
```

**Step 3: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="Violeta API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

**Step 4: Create virtual env, install deps, and test**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings
uvicorn app.main:app --reload --port 8000 &
sleep 2
curl http://localhost:8000/api/health
# Expected: {"status":"ok"}
kill %1
```

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: scaffold FastAPI backend with config and health endpoint"
```

---

## Task 3: Database Setup — Models and Migrations

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/document.py`
- Create: `backend/alembic.ini`
- Create: `backend/migrations/env.py`

**Step 1: Create `backend/app/database.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    async with async_session() as session:
        yield session


async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
```

**Step 2: Create `backend/app/models/user.py`**

```python
import uuid
from datetime import datetime

from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    email: str = Field(max_length=255, unique=True, index=True)
    password_hash: str = Field(max_length=255)
    google_refresh_token: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Step 3: Create `backend/app/models/document.py`**

```python
import uuid
from datetime import datetime
from typing import Any

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=255, default="Untitled")
    content: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    is_public: bool = Field(default=False)
    share_token: str | None = Field(default=None, max_length=64, unique=True)
    copied_from_id: uuid.UUID | None = Field(default=None, foreign_key="documents.id")
    google_drive_file_id: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Step 4: Create `backend/app/models/__init__.py`**

```python
from app.models.user import User
from app.models.document import Document

__all__ = ["User", "Document"]
```

**Step 5: Initialize Alembic**

```bash
cd backend
source .venv/bin/activate
alembic init migrations
```

Then edit `backend/alembic.ini` to set `sqlalchemy.url` to use env var, and edit `backend/migrations/env.py` to import the models and use the async engine.

**Step 6: Update `backend/app/main.py`** to add startup event

Add to main.py:
```python
from contextlib import asynccontextmanager
from app.database import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(title="Violeta API", version="0.1.0", lifespan=lifespan)
```

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add database models for users and documents with Alembic setup"
```

---

## Task 4: Auth Utilities — JWT and Password Hashing

**Files:**
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/security.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_security.py`

**Step 1: Write failing tests for security utilities**

```python
# backend/tests/test_security.py
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token


def test_hash_and_verify_password():
    hashed = hash_password("mypassword123")
    assert hashed != "mypassword123"
    assert verify_password("mypassword123", hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_access_token():
    token = create_access_token(subject="user-id-123")
    payload = decode_token(token)
    assert payload["sub"] == "user-id-123"
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    token = create_refresh_token(subject="user-id-456")
    payload = decode_token(token)
    assert payload["sub"] == "user-id-456"
    assert payload["type"] == "refresh"
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && source .venv/bin/activate
pip install pytest pytest-asyncio httpx
python -m pytest tests/test_security.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.utils.security'`

**Step 3: Implement security utilities**

```python
# backend/app/utils/security.py
from datetime import datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": subject, "type": "access", "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode({"sub": subject, "type": "refresh", "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return {}
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_security.py -v
```

Expected: 3 passed.

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add JWT and password hashing utilities with tests"
```

---

## Task 5: Auth Schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/user.py`

**Step 1: Create request/response schemas**

```python
# backend/app/schemas/user.py
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

**Step 2: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: add user auth request/response schemas"
```

---

## Task 6: Auth Router — Register, Login, Refresh, Me

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Create: `backend/app/utils/deps.py` (dependency for getting current user)
- Create: `backend/tests/test_auth.py`

**Step 1: Write failing tests for auth endpoints**

```python
# backend/tests/test_auth.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import create_db_and_tables, engine
from sqlmodel import SQLModel


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "secret123"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test User"
    assert data["email"] == "test@example.com"
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"name": "A", "email": "dup@example.com", "password": "secret123"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "name": "Test", "email": "login@example.com", "password": "secret123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "secret123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "name": "Test", "email": "wrong@example.com", "password": "secret123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@example.com", "password": "badpassword"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(client):
    await client.post("/api/auth/register", json={
        "name": "Me", "email": "me@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "me@example.com", "password": "secret123"
    })
    token = login.json()["access_token"]
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_auth.py -v
```

Expected: FAIL — routes don't exist yet.

**Step 3: Create `backend/app/utils/deps.py`** — current user dependency

```python
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.user import User
from app.utils.security import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await session.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

**Step 4: Create `backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, session: AsyncSession = Depends(get_session)):
    existing = await session.exec(select(User).where(User.email == data.email))
    if existing.first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, response: Response, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(User).where(User.email == data.email))
    user = result.first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True,
        max_age=7 * 24 * 60 * 60, samesite="lax"
    )
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response, session: AsyncSession = Depends(get_session),
                  refresh_token: str | None = None):
    # Read from cookie
    from fastapi import Request
    # Note: this will be refactored to use Request dependency
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    from app.utils.security import decode_token
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await session.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=new_access)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user
```

**Step 5: Register the router in `main.py`**

Add to `backend/app/main.py`:
```python
from app.routers.auth import router as auth_router
app.include_router(auth_router)
```

**Step 6: Run tests**

```bash
python -m pytest tests/test_auth.py -v
```

Expected: All tests pass. (Note: tests require a running PostgreSQL. For testing, configure `DATABASE_URL` to point to a test database or use SQLite for unit tests.)

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add auth endpoints — register, login, refresh, me"
```

---

## Task 7: Document Schemas

**Files:**
- Create: `backend/app/schemas/document.py`

**Step 1: Create document schemas**

```python
# backend/app/schemas/document.py
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str = "Untitled"
    content: dict[str, Any] = {}


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: dict[str, Any] | None = None


class DocumentResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    content: dict[str, Any]
    is_public: bool
    share_token: str | None
    copied_from_id: uuid.UUID | None
    google_drive_file_id: str | None
    created_at: datetime
    updated_at: datetime


class DocumentListItem(BaseModel):
    id: uuid.UUID
    title: str
    is_public: bool
    created_at: datetime
    updated_at: datetime


class ShareResponse(BaseModel):
    share_token: str
    share_url: str
```

**Step 2: Commit**

```bash
git add backend/app/schemas/document.py
git commit -m "feat: add document request/response schemas"
```

---

## Task 8: Documents Router — CRUD

**Files:**
- Create: `backend/app/routers/documents.py`
- Create: `backend/tests/test_documents.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_documents.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine
from sqlmodel import SQLModel


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/auth/register", json={
        "name": "Test", "email": "doc@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "doc@example.com", "password": "secret123"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_document(client, auth_headers):
    resp = await client.post("/api/documents/", json={
        "title": "My Doc",
        "content": {"type": "doc", "content": []}
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "My Doc"


@pytest.mark.asyncio
async def test_list_documents(client, auth_headers):
    await client.post("/api/documents/", json={"title": "Doc 1"}, headers=auth_headers)
    await client.post("/api/documents/", json={"title": "Doc 2"}, headers=auth_headers)
    resp = await client.get("/api/documents/", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Get Me"}, headers=auth_headers)
    doc_id = create.json()["id"]
    resp = await client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get Me"


@pytest.mark.asyncio
async def test_update_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Old"}, headers=auth_headers)
    doc_id = create.json()["id"]
    resp = await client.put(f"/api/documents/{doc_id}", json={"title": "New"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


@pytest.mark.asyncio
async def test_delete_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Delete Me"}, headers=auth_headers)
    doc_id = create.json()["id"]
    resp = await client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_users_document(client, auth_headers):
    # Create doc as first user
    create = await client.post("/api/documents/", json={"title": "Private"}, headers=auth_headers)
    doc_id = create.json()["id"]
    # Register second user
    await client.post("/api/auth/register", json={
        "name": "Other", "email": "other@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "other@example.com", "password": "secret123"
    })
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = await client.get(f"/api/documents/{doc_id}", headers=other_headers)
    assert resp.status_code == 404
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_documents.py -v
```

Expected: FAIL — routes don't exist.

**Step 3: Implement documents router**

```python
# backend/app/routers/documents.py
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListItem
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentListItem])
async def list_documents(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Document).where(Document.owner_id == user.id).order_by(Document.updated_at.desc())
    )
    return result.all()


@router.post("/", response_model=DocumentResponse, status_code=201)
async def create_document(
    data: DocumentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = Document(owner_id=user.id, title=data.title, content=data.content)
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: uuid.UUID,
    data: DocumentUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    if data.title is not None:
        doc.title = data.title
    if data.content is not None:
        doc.content = data.content
    doc.updated_at = datetime.utcnow()
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    await session.delete(doc)
    await session.commit()
```

**Step 4: Register router in `main.py`**

```python
from app.routers.documents import router as documents_router
app.include_router(documents_router)
```

**Step 5: Run tests**

```bash
python -m pytest tests/test_documents.py -v
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add document CRUD endpoints with tests"
```

---

## Task 9: Sharing Router — Share, View, Copy

**Files:**
- Create: `backend/app/routers/sharing.py`
- Create: `backend/tests/test_sharing.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_sharing.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine
from sqlmodel import SQLModel


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def user_and_doc(client):
    await client.post("/api/auth/register", json={
        "name": "Owner", "email": "owner@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "owner@example.com", "password": "secret123"
    })
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    doc = await client.post("/api/documents/", json={
        "title": "Shared Doc",
        "content": {"type": "doc", "content": [{"type": "paragraph"}]}
    }, headers=headers)
    return headers, doc.json()["id"]


@pytest.mark.asyncio
async def test_share_document(client, user_and_doc):
    headers, doc_id = user_and_doc
    resp = await client.post(f"/api/documents/{doc_id}/share", headers=headers)
    assert resp.status_code == 200
    assert "share_token" in resp.json()


@pytest.mark.asyncio
async def test_view_shared_document(client, user_and_doc):
    headers, doc_id = user_and_doc
    share = await client.post(f"/api/documents/{doc_id}/share", headers=headers)
    token = share.json()["share_token"]
    # No auth needed to view
    resp = await client.get(f"/api/shared/{token}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Shared Doc"


@pytest.mark.asyncio
async def test_copy_shared_document(client, user_and_doc):
    headers, doc_id = user_and_doc
    share = await client.post(f"/api/documents/{doc_id}/share", headers=headers)
    token = share.json()["share_token"]
    # Register a second user to make the copy
    await client.post("/api/auth/register", json={
        "name": "Copier", "email": "copier@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "copier@example.com", "password": "secret123"
    })
    copier_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = await client.post(f"/api/shared/{token}/copy", headers=copier_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Copy of Shared Doc"
    assert resp.json()["copied_from_id"] == doc_id


@pytest.mark.asyncio
async def test_revoke_share(client, user_and_doc):
    headers, doc_id = user_and_doc
    share = await client.post(f"/api/documents/{doc_id}/share", headers=headers)
    token = share.json()["share_token"]
    # Revoke
    resp = await client.delete(f"/api/documents/{doc_id}/share", headers=headers)
    assert resp.status_code == 204
    # Token should no longer work
    resp = await client.get(f"/api/shared/{token}")
    assert resp.status_code == 404
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_sharing.py -v
```

**Step 3: Implement sharing router**

```python
# backend/app/routers/sharing.py
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentResponse, ShareResponse
from app.utils.deps import get_current_user

router = APIRouter(tags=["sharing"])


@router.post("/api/documents/{doc_id}/share", response_model=ShareResponse)
async def share_document(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.share_token:
        doc.share_token = secrets.token_hex(16)
    doc.is_public = True
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return ShareResponse(
        share_token=doc.share_token,
        share_url=f"{settings.frontend_url}/shared/{doc.share_token}",
    )


@router.delete("/api/documents/{doc_id}/share", status_code=204)
async def revoke_share(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.share_token = None
    doc.is_public = False
    session.add(doc)
    await session.commit()


@router.get("/api/shared/{share_token}", response_model=DocumentResponse)
async def view_shared(share_token: str, session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(Document).where(Document.share_token == share_token, Document.is_public == True)
    )
    doc = result.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Shared document not found")
    return doc


@router.post("/api/shared/{share_token}/copy", response_model=DocumentResponse, status_code=201)
async def copy_shared(
    share_token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Document).where(Document.share_token == share_token, Document.is_public == True)
    )
    original = result.first()
    if not original:
        raise HTTPException(status_code=404, detail="Shared document not found")
    copy = Document(
        owner_id=user.id,
        title=f"Copy of {original.title}",
        content=original.content,
        copied_from_id=original.id,
    )
    session.add(copy)
    await session.commit()
    await session.refresh(copy)
    return copy
```

**Step 4: Register router in `main.py`**

```python
from app.routers.sharing import router as sharing_router
app.include_router(sharing_router)
```

**Step 5: Run tests**

```bash
python -m pytest tests/test_sharing.py -v
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add document sharing — share links, view shared, make copy"
```

---

## Task 10: Google Drive Integration — OAuth2 + Import/Export

**Files:**
- Create: `backend/app/utils/google_auth.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/google_drive.py`
- Create: `backend/app/routers/google_drive.py`

**Step 1: Create Google OAuth2 helpers**

```python
# backend/app/utils/google_auth.py
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

from app.config import settings

SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
]


def create_oauth_flow() -> Flow:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )
    return flow


def get_credentials(refresh_token: str) -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return creds
```

**Step 2: Add `google-api-python-client`, `google-auth-oauthlib`, `google-auth-httplib2` to `requirements.txt`**

```
google-api-python-client==2.166.0
google-auth-oauthlib==1.2.1
google-auth-httplib2==0.2.0
```

**Step 3: Create Google Drive service**

```python
# backend/app/services/google_drive.py
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload
from google.oauth2.credentials import Credentials


def list_drive_files(credentials: Credentials) -> list[dict]:
    service = build("drive", "v3", credentials=credentials)
    results = service.files().list(
        q="mimeType='application/vnd.google-apps.document'",
        fields="files(id, name, modifiedTime)",
        orderBy="modifiedTime desc",
        pageSize=50,
    ).execute()
    return results.get("files", [])


def export_google_doc_as_html(credentials: Credentials, file_id: str) -> str:
    service = build("drive", "v3", credentials=credentials)
    content = service.files().export(fileId=file_id, mimeType="text/html").execute()
    return content.decode("utf-8") if isinstance(content, bytes) else content


def get_file_name(credentials: Credentials, file_id: str) -> str:
    service = build("drive", "v3", credentials=credentials)
    file = service.files().get(fileId=file_id, fields="name").execute()
    return file["name"]


def create_google_doc(credentials: Credentials, title: str, html_content: str) -> str:
    service = build("drive", "v3", credentials=credentials)
    file_metadata = {"name": title, "mimeType": "application/vnd.google-apps.document"}
    media = MediaInMemoryUpload(html_content.encode("utf-8"), mimetype="text/html")
    file = service.files().create(body=file_metadata, media_body=media, fields="id").execute()
    return file["id"]
```

**Step 4: Create Google Drive router**

```python
# backend/app/routers/google_drive.py
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.document import Document
from app.models.user import User
from app.utils.deps import get_current_user
from app.utils.google_auth import create_oauth_flow, get_credentials
from app.services.google_drive import list_drive_files, export_google_doc_as_html, get_file_name, create_google_doc

router = APIRouter(prefix="/api/google", tags=["google-drive"])


@router.get("/auth")
async def google_auth(user: User = Depends(get_current_user)):
    flow = create_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=str(user.id),
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(code: str, state: str, session: AsyncSession = Depends(get_session)):
    flow = create_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    user = await session.get(User, uuid.UUID(state))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.google_refresh_token = credentials.refresh_token
    session.add(user)
    await session.commit()
    return RedirectResponse(url=f"{settings.frontend_url}?google_connected=true")


@router.get("/files")
async def google_files(user: User = Depends(get_current_user)):
    if not user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    creds = get_credentials(user.google_refresh_token)
    files = list_drive_files(creds)
    return files


@router.post("/import/{file_id}")
async def import_from_drive(
    file_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    creds = get_credentials(user.google_refresh_token)
    html = export_google_doc_as_html(creds, file_id)
    name = get_file_name(creds, file_id)
    # Basic HTML to TipTap JSON conversion
    # For now, store as a single paragraph with the HTML content
    # A proper converter will be built in a follow-up task
    content = {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": html}]}]
    }
    doc = Document(
        owner_id=user.id,
        title=name,
        content=content,
        google_drive_file_id=file_id,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.post("/export/{document_id}")
async def export_to_drive(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    doc = await session.get(Document, document_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    creds = get_credentials(user.google_refresh_token)
    # Basic TipTap JSON to HTML — extract text content
    # A proper converter will be built in a follow-up task
    html = f"<html><body><h1>{doc.title}</h1><p>Exported from Violeta</p></body></html>"
    drive_file_id = create_google_doc(creds, doc.title, html)
    doc.google_drive_file_id = drive_file_id
    session.add(doc)
    await session.commit()
    return {"google_drive_file_id": drive_file_id}
```

**Step 5: Register router in `main.py`**

```python
from app.routers.google_drive import router as google_drive_router
app.include_router(google_drive_router)
```

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add Google Drive integration — OAuth2, import, export"
```

---

## Task 11: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml` (at project root)
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `.env.example`

**Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: Create `frontend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Step 3: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Step 4: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: violeta
      POSTGRES_USER: violeta
      POSTGRES_PASSWORD: ${DB_PASSWORD:-violeta}
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://violeta:${DB_PASSWORD:-violeta}@db:5432/violeta
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-production}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:80"

volumes:
  pgdata:
```

**Step 5: Create `.env.example`**

```
DB_PASSWORD=violeta
JWT_SECRET=change-this-to-a-random-string
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:3000
```

**Step 6: Test Docker Compose builds**

```bash
docker compose build
```

Expected: Both images build successfully.

**Step 7: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile frontend/nginx.conf .env.example
git commit -m "feat: add Docker Compose setup for dev and production"
```

---

## Task 12: Frontend — Add API Proxy and Vite Dev Config

**Files:**
- Modify: `frontend/vite.config.ts`

**Step 1: Update Vite proxy to include backend API**

Add a proxy for `/api` to the Vite dev server so that the frontend can call the backend during development:

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    proxy: {
      '/texlive-api': {
        target: 'https://texlive.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/texlive-api/, ''),
        followRedirects: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 2: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "feat: add backend API proxy to Vite dev server"
```

---

## Task 13: Frontend — Auth Context and API Client

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/contexts/AuthContext.tsx`

**Step 1: Create API client**

```typescript
// frontend/src/api/client.ts
const BASE_URL = '/api'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
  if (res.status === 401 && accessToken) {
    // Try refresh
    const refresh = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refresh.ok) {
      const data = await refresh.json()
      accessToken = data.access_token
      headers['Authorization'] = `Bearer ${accessToken}`
      return fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
    }
    accessToken = null
  }
  return res
}
```

**Step 2: Create auth API functions**

```typescript
// frontend/src/api/auth.ts
import { apiFetch, setAccessToken } from './client'

export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed')
  return res.json()
}

export async function login(email: string, password: string): Promise<User> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Login failed')
  const data = await res.json()
  setAccessToken(data.access_token)
  // Fetch user profile
  return getMe()
}

export async function getMe(): Promise<User> {
  const res = await apiFetch('/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export function logout() {
  setAccessToken(null)
}
```

**Step 3: Create AuthContext**

```typescript
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { type User, getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    setUser(u)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await apiRegister(name, email, password)
    const u = await apiLogin(email, password)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

**Step 4: Wrap App in AuthProvider in `main.tsx`**

Update `frontend/src/main.tsx`:
```typescript
import { AuthProvider } from './contexts/AuthContext'
// ... wrap <App /> with <AuthProvider>
```

**Step 5: Commit**

```bash
git add frontend/src/api/ frontend/src/contexts/
git commit -m "feat: add API client, auth API functions, and AuthContext"
```

---

## Task 14: Frontend — Login/Register Page

**Files:**
- Create: `frontend/src/components/auth/LoginPage.tsx`
- Modify: `frontend/src/App.tsx` — show LoginPage when not authenticated

**Step 1: Create LoginPage component**

Build a login/register form component with:
- Toggle between login and register modes
- Name field (register only), email, password fields
- Error display
- Loading state
- Uses `useAuth()` hook
- Matches Violeta's dark purple theme (use `colors.ts` tokens)

**Step 2: Update App.tsx**

Wrap the existing editor UI in an auth check:
```typescript
const { user, loading } = useAuth()
if (loading) return <LoadingSpinner />
if (!user) return <LoginPage />
return </* existing editor UI */>
```

**Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: add login/register page with auth gating"
```

---

## Task 15: Frontend — Document List and Management

**Files:**
- Create: `frontend/src/api/documents.ts`
- Create: `frontend/src/components/documents/DocumentList.tsx`
- Modify: `frontend/src/App.tsx` — add document selection flow
- Modify: `frontend/src/components/layout/Sidebar.tsx` — show document list

**Step 1: Create documents API**

```typescript
// frontend/src/api/documents.ts
import { apiFetch } from './client'

export interface DocumentListItem {
  id: string
  title: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface DocumentFull extends DocumentListItem {
  owner_id: string
  content: Record<string, any>
  share_token: string | null
  copied_from_id: string | null
  google_drive_file_id: string | null
}

export async function listDocuments(): Promise<DocumentListItem[]> {
  const res = await apiFetch('/documents/')
  if (!res.ok) throw new Error('Failed to list documents')
  return res.json()
}

export async function getDocument(id: string): Promise<DocumentFull> {
  const res = await apiFetch(`/documents/${id}`)
  if (!res.ok) throw new Error('Failed to get document')
  return res.json()
}

export async function createDocument(title?: string): Promise<DocumentFull> {
  const res = await apiFetch('/documents/', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'Untitled' }),
  })
  if (!res.ok) throw new Error('Failed to create document')
  return res.json()
}

export async function updateDocument(id: string, data: { title?: string; content?: any }): Promise<DocumentFull> {
  const res = await apiFetch(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update document')
  return res.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete document')
}
```

**Step 2: Build DocumentList component and integrate with Sidebar**

The sidebar should show a list of the user's documents, with ability to create new ones, and a delete option. Clicking a document loads it into the editor.

**Step 3: Update App.tsx to manage current document state**

Add state for `currentDocumentId`. When a document is selected, load its content into the editor. Auto-save content changes back to the API (debounced).

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add document list, create, load, auto-save in sidebar"
```

---

## Task 16: Frontend — Document Sharing UI

**Files:**
- Create: `frontend/src/api/sharing.ts`
- Create: `frontend/src/components/documents/ShareModal.tsx`
- Create: `frontend/src/components/documents/SharedDocumentView.tsx`

**Step 1: Create sharing API**

```typescript
// frontend/src/api/sharing.ts
import { apiFetch } from './client'

export async function shareDocument(docId: string) {
  const res = await apiFetch(`/documents/${docId}/share`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to share')
  return res.json() // { share_token, share_url }
}

export async function revokeShare(docId: string) {
  const res = await apiFetch(`/documents/${docId}/share`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to revoke')
}

export async function getSharedDocument(shareToken: string) {
  const res = await fetch(`/api/shared/${shareToken}`)
  if (!res.ok) throw new Error('Document not found')
  return res.json()
}

export async function copySharedDocument(shareToken: string) {
  const res = await apiFetch(`/shared/${shareToken}/copy`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to copy')
  return res.json()
}
```

**Step 2: Build ShareModal** — shows share link, copy-to-clipboard, revoke button

**Step 3: Build SharedDocumentView** — read-only TipTap editor with "Make a copy" button (requires login)

**Step 4: Add basic routing** — detect `/shared/{token}` URL paths to show SharedDocumentView. Use a simple URL-based check (no react-router needed for now, just `window.location.pathname`).

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add document sharing UI — share modal, shared view, copy"
```

---

## Task 17: Frontend — Google Drive Integration UI

**Files:**
- Create: `frontend/src/api/google.ts`
- Create: `frontend/src/components/google/GoogleDriveModal.tsx`

**Step 1: Create Google Drive API**

```typescript
// frontend/src/api/google.ts
import { apiFetch } from './client'

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await apiFetch('/google/auth')
  if (!res.ok) throw new Error('Failed to get auth URL')
  const data = await res.json()
  return data.auth_url
}

export async function listGoogleFiles() {
  const res = await apiFetch('/google/files')
  if (!res.ok) throw new Error('Failed to list files')
  return res.json()
}

export async function importFromDrive(fileId: string) {
  const res = await apiFetch(`/google/import/${fileId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to import')
  return res.json()
}

export async function exportToDrive(documentId: string) {
  const res = await apiFetch(`/google/export/${documentId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to export')
  return res.json()
}
```

**Step 2: Build GoogleDriveModal**

A modal that:
- Shows "Connect Google Drive" button if not connected
- Lists Google Drive files when connected
- Each file has an "Import" button
- Has an "Export current document" button
- Shows loading/error states

**Step 3: Add Google Drive button to toolbar or sidebar**

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add Google Drive integration UI — connect, import, export"
```

---

## Task 18: Final Integration and Smoke Test

**Step 1: Start everything with Docker Compose**

```bash
cp .env.example .env
docker compose up --build
```

**Step 2: Manual smoke test**

1. Open `http://localhost:3000`
2. Register a new account
3. Create a document, type some content
4. Refresh the page — document should persist
5. Share the document, open the share link in incognito
6. Make a copy from the shared view (requires second account)
7. (If Google credentials configured) Test Google Drive import/export

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from smoke testing"
```

---

## Summary

| Task | What | Est. Steps |
|------|------|------------|
| 1 | Move frontend to `frontend/` | 4 |
| 2 | Backend scaffolding (FastAPI + config) | 5 |
| 3 | Database models + Alembic | 7 |
| 4 | Auth utilities (JWT + bcrypt) with tests | 5 |
| 5 | Auth schemas | 2 |
| 6 | Auth router (register/login/refresh/me) with tests | 7 |
| 7 | Document schemas | 2 |
| 8 | Documents router (CRUD) with tests | 6 |
| 9 | Sharing router with tests | 6 |
| 10 | Google Drive integration | 6 |
| 11 | Docker Compose setup | 7 |
| 12 | Frontend Vite proxy config | 2 |
| 13 | Frontend auth context + API client | 5 |
| 14 | Frontend login/register page | 3 |
| 15 | Frontend document list + management | 4 |
| 16 | Frontend sharing UI | 5 |
| 17 | Frontend Google Drive UI | 4 |
| 18 | Integration smoke test | 3 |
