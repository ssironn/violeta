# Publications & Social Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a social layer to Violeta where users publish LaTeX documents as typed posts (article, exercise list, study material, proof), browse feeds, like, comment, follow authors, and share links.

**Architecture:** Snapshot-based publications with PDF stored on server filesystem. Thumbnails generated server-side with Poppler. Two feeds (following + explore) with cursor-based pagination. One level of comment replies. Toggle likes with counter cache. Follow system for personalized feed.

**Tech Stack:** FastAPI, SQLModel, PostgreSQL, pdf2image (Poppler), React 19, TypeScript, Tailwind CSS, React Router 7

---

### Task 1: Backend Models — Publication, Like, Comment, Follow

**Files:**
- Create: `backend/app/models/publication.py`
- Create: `backend/app/models/follow.py`
- Modify: `backend/app/main.py`

**Step 1: Create publication models**

Create `backend/app/models/publication.py`:

```python
import enum
import uuid
from datetime import datetime

from sqlmodel import SQLModel, Field, UniqueConstraint
from sqlalchemy import Column, Enum


class PublicationType(str, enum.Enum):
    article = "article"
    exercise_list = "exercise_list"
    study_material = "study_material"
    proof = "proof"


class Publication(SQLModel, table=True):
    __tablename__ = "publications"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    author_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    document_id: uuid.UUID | None = Field(default=None, foreign_key="documents.id")
    title: str = Field(max_length=255)
    abstract: str | None = Field(default=None)
    type: PublicationType = Field(sa_column=Column(Enum(PublicationType), nullable=False))
    pdf_path: str = Field(max_length=500)
    thumbnail_path: str = Field(max_length=500)
    share_token: str = Field(max_length=32, unique=True, index=True)
    like_count: int = Field(default=0)
    comment_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PublicationLike(SQLModel, table=True):
    __tablename__ = "publication_likes"
    __table_args__ = (UniqueConstraint("publication_id", "user_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publication_id: uuid.UUID = Field(foreign_key="publications.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PublicationComment(SQLModel, table=True):
    __tablename__ = "publication_comments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publication_id: uuid.UUID = Field(foreign_key="publications.id", index=True)
    author_id: uuid.UUID = Field(foreign_key="users.id")
    parent_id: uuid.UUID | None = Field(default=None, foreign_key="publication_comments.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**Step 2: Create follow model**

Create `backend/app/models/follow.py`:

```python
import uuid
from datetime import datetime

from sqlmodel import SQLModel, Field, UniqueConstraint


class Follow(SQLModel, table=True):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    follower_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    following_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**Step 3: Import models in main.py so SQLModel creates the tables**

In `backend/app/main.py`, add imports after the existing model imports (before the lifespan function). The models need to be imported so `SQLModel.metadata.create_all` picks them up:

```python
# Add these imports (models must be imported for table creation)
from app.models.publication import Publication, PublicationLike, PublicationComment  # noqa: F401
from app.models.follow import Follow  # noqa: F401
```

**Step 4: Verify tables are created**

Run: `cd /Users/rumotecnologias/violeta/backend && python -c "from app.models.publication import *; from app.models.follow import *; print('Models OK')"`

**Step 5: Commit**

```bash
git add backend/app/models/publication.py backend/app/models/follow.py backend/app/main.py
git commit -m "feat: add Publication, Like, Comment, Follow models"
```

---

### Task 2: Backend Schemas for Publications

**Files:**
- Create: `backend/app/schemas/publication.py`

**Step 1: Create publication schemas**

Create `backend/app/schemas/publication.py`:

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class PublicationCreate(BaseModel):
    title: str
    abstract: str | None = None
    type: str  # article, exercise_list, study_material, proof
    document_id: str | None = None


class PublicationResponse(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    document_id: uuid.UUID | None
    title: str
    abstract: str | None
    type: str
    share_token: str
    like_count: int
    comment_count: int
    created_at: datetime
    liked_by_me: bool = False


class PublicationDetailResponse(PublicationResponse):
    """Same as PublicationResponse but used in detail views."""
    pass


class PublicPublicationResponse(BaseModel):
    """For unauthenticated access via share link."""
    id: uuid.UUID
    author_name: str
    title: str
    abstract: str | None
    type: str
    like_count: int
    comment_count: int
    created_at: datetime


class CommentCreate(BaseModel):
    content: str
    parent_id: str | None = None


class CommentResponse(BaseModel):
    id: uuid.UUID
    publication_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    parent_id: uuid.UUID | None
    content: str
    created_at: datetime


class FollowResponse(BaseModel):
    id: uuid.UUID
    name: str
    follower_count: int
    following_count: int
    is_following: bool = False


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    publication_count: int
    follower_count: int
    following_count: int
    is_following: bool = False


class PaginatedResponse(BaseModel):
    items: list
    next_cursor: str | None = None
```

**Step 2: Commit**

```bash
git add backend/app/schemas/publication.py
git commit -m "feat: add publication schemas"
```

---

### Task 3: Thumbnail Generation Service

**Files:**
- Create: `backend/app/services/thumbnail.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/Dockerfile`

**Step 1: Add pdf2image dependency**

Add to `backend/requirements.txt`:
```
pdf2image==1.17.0
Pillow>=10.0.0
```

**Step 2: Update Dockerfile to install Poppler**

In `backend/Dockerfile`, add poppler-utils installation after the `WORKDIR` line:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 3: Create thumbnail service**

Create `backend/app/services/thumbnail.py`:

```python
import os
from pathlib import Path

from pdf2image import convert_from_path

UPLOAD_DIR = Path("uploads/publications")


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_pdf(publication_id: str, pdf_bytes: bytes) -> str:
    ensure_upload_dir()
    pdf_path = UPLOAD_DIR / f"{publication_id}.pdf"
    pdf_path.write_bytes(pdf_bytes)
    return str(pdf_path)


def generate_thumbnail(publication_id: str) -> str:
    ensure_upload_dir()
    pdf_path = UPLOAD_DIR / f"{publication_id}.pdf"
    thumb_path = UPLOAD_DIR / f"{publication_id}_thumb.png"
    images = convert_from_path(str(pdf_path), first_page=1, last_page=1, size=(400, None))
    if images:
        images[0].save(str(thumb_path), "PNG")
    return str(thumb_path)


def delete_publication_files(publication_id: str):
    pdf_path = UPLOAD_DIR / f"{publication_id}.pdf"
    thumb_path = UPLOAD_DIR / f"{publication_id}_thumb.png"
    for p in [pdf_path, thumb_path]:
        if p.exists():
            p.unlink()
```

**Step 4: Install dependencies locally for development**

Run: `cd /Users/rumotecnologias/violeta/backend && pip install pdf2image Pillow`

Note: You also need `poppler` installed on your Mac for local dev:
Run: `brew install poppler` (if not already installed)

**Step 5: Commit**

```bash
git add backend/app/services/thumbnail.py backend/requirements.txt backend/Dockerfile
git commit -m "feat: add thumbnail generation service with pdf2image"
```

---

### Task 4: Publications Router — Create, Get, Delete, List, Files

**Files:**
- Create: `backend/app/routers/publications.py`
- Modify: `backend/app/main.py`

**Step 1: Create publications router**

Create `backend/app/routers/publications.py`:

```python
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.publication import Publication, PublicationLike, PublicationType
from app.models.follow import Follow
from app.models.user import User
from app.schemas.publication import (
    PublicationResponse,
    PublicPublicationResponse,
)
from app.services.thumbnail import save_pdf, generate_thumbnail, delete_publication_files
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/publications", tags=["publications"])


def _pub_response(pub: Publication, author_name: str, liked: bool = False) -> dict:
    return {
        "id": pub.id,
        "author_id": pub.author_id,
        "author_name": author_name,
        "document_id": pub.document_id,
        "title": pub.title,
        "abstract": pub.abstract,
        "type": pub.type.value,
        "share_token": pub.share_token,
        "like_count": pub.like_count,
        "comment_count": pub.comment_count,
        "created_at": pub.created_at,
        "liked_by_me": liked,
    }


@router.post("/", response_model=PublicationResponse, status_code=201)
async def create_publication(
    title: str = Form(...),
    type: str = Form(...),
    abstract: str | None = Form(None),
    document_id: str | None = Form(None),
    pdf: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Validate type
    try:
        pub_type = PublicationType(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid type: {type}")

    pub_id = uuid.uuid4()
    pdf_bytes = await pdf.read()

    pdf_path = save_pdf(str(pub_id), pdf_bytes)
    thumbnail_path = generate_thumbnail(str(pub_id))
    share_token = secrets.token_hex(16)

    pub = Publication(
        id=pub_id,
        author_id=user.id,
        document_id=uuid.UUID(document_id) if document_id else None,
        title=title,
        abstract=abstract or None,
        type=pub_type,
        pdf_path=pdf_path,
        thumbnail_path=thumbnail_path,
        share_token=share_token,
    )
    session.add(pub)
    await session.commit()
    await session.refresh(pub)

    return _pub_response(pub, user.name)


@router.get("/feed", response_model=list[PublicationResponse])
async def feed(
    cursor: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Get IDs of users I follow
    following_result = await session.exec(
        select(Follow.following_id).where(Follow.follower_id == user.id)
    )
    following_ids = list(following_result.all())
    if not following_ids:
        return []

    query = (
        select(Publication, User.name)
        .join(User, Publication.author_id == User.id)
        .where(col(Publication.author_id).in_(following_ids))
        .order_by(Publication.created_at.desc())
        .limit(limit)
    )
    if cursor:
        from datetime import datetime
        cursor_dt = datetime.fromisoformat(cursor)
        query = query.where(Publication.created_at < cursor_dt)

    result = await session.exec(query)
    rows = result.all()

    # Check which ones the current user liked
    pub_ids = [r[0].id for r in rows]
    liked_result = await session.exec(
        select(PublicationLike.publication_id).where(
            PublicationLike.user_id == user.id,
            col(PublicationLike.publication_id).in_(pub_ids) if pub_ids else False,
        )
    ) if pub_ids else []
    liked_set = set(liked_result) if pub_ids else set()

    return [_pub_response(pub, name, pub.id in liked_set) for pub, name in rows]


@router.get("/explore", response_model=list[PublicationResponse])
async def explore(
    cursor: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = (
        select(Publication, User.name)
        .join(User, Publication.author_id == User.id)
        .order_by(Publication.created_at.desc())
        .limit(limit)
    )
    if cursor:
        from datetime import datetime
        cursor_dt = datetime.fromisoformat(cursor)
        query = query.where(Publication.created_at < cursor_dt)

    result = await session.exec(query)
    rows = result.all()

    pub_ids = [r[0].id for r in rows]
    liked_result = await session.exec(
        select(PublicationLike.publication_id).where(
            PublicationLike.user_id == user.id,
            col(PublicationLike.publication_id).in_(pub_ids) if pub_ids else False,
        )
    ) if pub_ids else []
    liked_set = set(liked_result) if pub_ids else set()

    return [_pub_response(pub, name, pub.id in liked_set) for pub, name in rows]


@router.get("/{pub_id}", response_model=PublicationResponse)
async def get_publication(
    pub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Publication, User.name)
        .join(User, Publication.author_id == User.id)
        .where(Publication.id == pub_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Publication not found")
    pub, author_name = row

    liked_result = await session.exec(
        select(PublicationLike).where(
            PublicationLike.publication_id == pub_id,
            PublicationLike.user_id == user.id,
        )
    )
    liked = liked_result.first() is not None

    return _pub_response(pub, author_name, liked)


@router.delete("/{pub_id}", status_code=204)
async def delete_publication(
    pub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub or pub.author_id != user.id:
        raise HTTPException(status_code=404, detail="Publication not found")
    delete_publication_files(str(pub_id))
    await session.delete(pub)
    await session.commit()


@router.get("/{pub_id}/pdf")
async def serve_pdf(pub_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    return FileResponse(
        pub.pdf_path,
        media_type="application/pdf",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/{pub_id}/thumbnail")
async def serve_thumbnail(pub_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    return FileResponse(
        pub.thumbnail_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/{pub_id}/like")
async def toggle_like(
    pub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    result = await session.exec(
        select(PublicationLike).where(
            PublicationLike.publication_id == pub_id,
            PublicationLike.user_id == user.id,
        )
    )
    existing = result.first()

    if existing:
        await session.delete(existing)
        pub.like_count = max(0, pub.like_count - 1)
        liked = False
    else:
        like = PublicationLike(publication_id=pub_id, user_id=user.id)
        session.add(like)
        pub.like_count += 1
        liked = True

    session.add(pub)
    await session.commit()
    return {"liked": liked, "like_count": pub.like_count}
```

**Step 2: Add public share link endpoint**

This goes in a separate router or can be added to the publications router. Add to the bottom of `publications.py` before the file ends. Actually, let's create a small separate section in the same file:

Add at the end of `backend/app/routers/publications.py`:

```python
# --- Public access (no auth) ---

from fastapi import APIRouter as _AR

public_router = APIRouter(tags=["publications-public"])


@public_router.get("/api/p/{share_token}", response_model=PublicPublicationResponse)
async def view_public_publication(
    share_token: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Publication, User.name)
        .join(User, Publication.author_id == User.id)
        .where(Publication.share_token == share_token)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Publication not found")
    pub, author_name = row
    return {
        "id": pub.id,
        "author_name": author_name,
        "title": pub.title,
        "abstract": pub.abstract,
        "type": pub.type.value,
        "like_count": pub.like_count,
        "comment_count": pub.comment_count,
        "created_at": pub.created_at,
    }
```

**Step 3: Register routers in main.py**

In `backend/app/main.py`, add:

```python
from app.routers.publications import router as publications_router, public_router as publications_public_router

# After existing include_router calls:
app.include_router(publications_router)
app.include_router(publications_public_router)
```

**Step 4: Commit**

```bash
git add backend/app/routers/publications.py backend/app/main.py
git commit -m "feat: add publications router with CRUD, feed, like, and public access"
```

---

### Task 5: Comments Router

**Files:**
- Create: `backend/app/routers/comments.py`
- Modify: `backend/app/main.py`

**Step 1: Create comments router**

Create `backend/app/routers/comments.py`:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.publication import Publication, PublicationComment
from app.models.user import User
from app.schemas.publication import CommentCreate, CommentResponse
from app.utils.deps import get_current_user

router = APIRouter(tags=["comments"])


@router.get("/api/publications/{pub_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    pub_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    query = (
        select(PublicationComment, User.name)
        .join(User, PublicationComment.author_id == User.id)
        .where(PublicationComment.publication_id == pub_id)
        .order_by(PublicationComment.created_at.asc())
        .limit(limit)
    )
    if cursor:
        from datetime import datetime
        cursor_dt = datetime.fromisoformat(cursor)
        query = query.where(PublicationComment.created_at > cursor_dt)

    result = await session.exec(query)
    rows = result.all()

    return [
        {
            "id": comment.id,
            "publication_id": comment.publication_id,
            "author_id": comment.author_id,
            "author_name": name,
            "parent_id": comment.parent_id,
            "content": comment.content,
            "created_at": comment.created_at,
        }
        for comment, name in rows
    ]


@router.post("/api/publications/{pub_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    pub_id: uuid.UUID,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    if data.parent_id:
        parent = await session.get(PublicationComment, uuid.UUID(data.parent_id))
        if not parent or parent.publication_id != pub_id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Cannot reply to a reply")

    comment = PublicationComment(
        publication_id=pub_id,
        author_id=user.id,
        parent_id=uuid.UUID(data.parent_id) if data.parent_id else None,
        content=data.content,
    )
    session.add(comment)
    pub.comment_count += 1
    session.add(pub)
    await session.commit()
    await session.refresh(comment)

    return {
        "id": comment.id,
        "publication_id": comment.publication_id,
        "author_id": comment.author_id,
        "author_name": user.name,
        "parent_id": comment.parent_id,
        "content": comment.content,
        "created_at": comment.created_at,
    }


@router.delete("/api/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    comment = await session.get(PublicationComment, comment_id)
    if not comment or comment.author_id != user.id:
        raise HTTPException(status_code=404, detail="Comment not found")

    pub = await session.get(Publication, comment.publication_id)
    if pub:
        pub.comment_count = max(0, pub.comment_count - 1)
        session.add(pub)

    await session.delete(comment)
    await session.commit()
```

**Step 2: Register in main.py**

```python
from app.routers.comments import router as comments_router
app.include_router(comments_router)
```

**Step 3: Commit**

```bash
git add backend/app/routers/comments.py backend/app/main.py
git commit -m "feat: add comments router with create, list, delete"
```

---

### Task 6: Follows & Profile Router

**Files:**
- Create: `backend/app/routers/follows.py`
- Modify: `backend/app/main.py`

**Step 1: Create follows router**

Create `backend/app/routers/follows.py`:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func, col
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.follow import Follow
from app.models.publication import Publication
from app.models.user import User
from app.schemas.publication import UserProfileResponse
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["follows"])


async def _count_followers(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.exec(
        select(func.count()).where(Follow.following_id == user_id)
    )
    return result.one()


async def _count_following(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.exec(
        select(func.count()).where(Follow.follower_id == user_id)
    )
    return result.one()


async def _is_following(session: AsyncSession, follower_id: uuid.UUID, following_id: uuid.UUID) -> bool:
    result = await session.exec(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
    )
    return result.first() is not None


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_profile(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    pub_count_result = await session.exec(
        select(func.count()).where(Publication.author_id == user_id)
    )
    pub_count = pub_count_result.one()

    return {
        "id": target.id,
        "name": target.name,
        "publication_count": pub_count,
        "follower_count": await _count_followers(session, user_id),
        "following_count": await _count_following(session, user_id),
        "is_following": await _is_following(session, user.id, user_id) if user.id != user_id else False,
    }


@router.post("/{user_id}/follow")
async def toggle_follow(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.exec(
        select(Follow).where(
            Follow.follower_id == user.id,
            Follow.following_id == user_id,
        )
    )
    existing = result.first()

    if existing:
        await session.delete(existing)
        following = False
    else:
        follow = Follow(follower_id=user.id, following_id=user_id)
        session.add(follow)
        following = True

    await session.commit()
    return {"following": following}


@router.get("/{user_id}/followers")
async def list_followers(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Follow, User.name)
        .join(User, Follow.follower_id == User.id)
        .where(Follow.following_id == user_id)
        .order_by(Follow.created_at.desc())
    )
    rows = result.all()

    return [
        {"id": f.follower_id, "name": name}
        for f, name in rows
    ]


@router.get("/{user_id}/following")
async def list_following(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Follow, User.name)
        .join(User, Follow.following_id == User.id)
        .where(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
    )
    rows = result.all()

    return [
        {"id": f.following_id, "name": name}
        for f, name in rows
    ]
```

**Step 2: Register in main.py**

```python
from app.routers.follows import router as follows_router
app.include_router(follows_router)
```

**Step 3: Commit**

```bash
git add backend/app/routers/follows.py backend/app/main.py
git commit -m "feat: add follows router with toggle, profile, list"
```

---

### Task 7: Backend Tests for Publications

**Files:**
- Create: `backend/app/tests/test_publications.py`

**Step 1: Write publication tests**

Create `backend/app/tests/test_publications.py`:

```python
import io
import pytest


@pytest.fixture
async def pdf_bytes():
    """Minimal valid PDF for testing."""
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF"


@pytest.mark.asyncio
async def test_create_publication(client, auth_headers, pdf_bytes):
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "My Article", "type": "article", "abstract": "A test article"}
    resp = await client.post("/api/publications/", files=files, data=data, headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "My Article"
    assert body["type"] == "article"
    assert "share_token" in body


@pytest.mark.asyncio
async def test_explore_feed(client, auth_headers, pdf_bytes):
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    await client.post("/api/publications/", files=files, data={"title": "Pub 1", "type": "article"}, headers=auth_headers)
    resp = await client.get("/api/publications/explore", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_toggle_like(client, auth_headers, pdf_bytes):
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    create = await client.post("/api/publications/", files=files, data={"title": "Likeable", "type": "proof"}, headers=auth_headers)
    pub_id = create.json()["id"]

    # Like
    resp = await client.post(f"/api/publications/{pub_id}/like", headers=auth_headers)
    assert resp.json()["liked"] is True
    assert resp.json()["like_count"] == 1

    # Unlike
    resp = await client.post(f"/api/publications/{pub_id}/like", headers=auth_headers)
    assert resp.json()["liked"] is False
    assert resp.json()["like_count"] == 0


@pytest.mark.asyncio
async def test_delete_publication(client, auth_headers, pdf_bytes):
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    create = await client.post("/api/publications/", files=files, data={"title": "Delete Me", "type": "article"}, headers=auth_headers)
    pub_id = create.json()["id"]
    resp = await client.delete(f"/api/publications/{pub_id}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_public_share_link(client, auth_headers, pdf_bytes):
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    create = await client.post("/api/publications/", files=files, data={"title": "Public", "type": "study_material"}, headers=auth_headers)
    token = create.json()["share_token"]
    # No auth needed
    resp = await client.get(f"/api/p/{token}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Public"
```

**Step 2: Run tests**

Run: `cd /Users/rumotecnologias/violeta/backend && python -m pytest app/tests/test_publications.py -v`

Note: Thumbnail generation will fail in tests because the minimal PDF isn't renderable by Poppler. You may need to mock `generate_thumbnail` in tests. If tests fail because of Poppler, add this mock at the top of the test file:

```python
from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_thumbnail():
    with patch("app.services.thumbnail.generate_thumbnail") as mock:
        mock.return_value = "uploads/publications/fake_thumb.png"
        yield mock
```

**Step 3: Commit**

```bash
git add backend/app/tests/test_publications.py
git commit -m "test: add publication tests"
```

---

### Task 8: Backend Tests for Comments and Follows

**Files:**
- Create: `backend/app/tests/test_comments.py`
- Create: `backend/app/tests/test_follows.py`

**Step 1: Write comment tests**

Create `backend/app/tests/test_comments.py`:

```python
import io
import pytest
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_thumbnail():
    with patch("app.services.thumbnail.generate_thumbnail") as mock:
        mock.return_value = "uploads/publications/fake_thumb.png"
        yield mock


@pytest.fixture
async def pdf_bytes():
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF"


@pytest.fixture
async def pub_id(client, auth_headers, pdf_bytes):
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    resp = await client.post("/api/publications/", files=files, data={"title": "For Comments", "type": "article"}, headers=auth_headers)
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_comment(client, auth_headers, pub_id):
    resp = await client.post(
        f"/api/publications/{pub_id}/comments",
        json={"content": "Great paper!"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["content"] == "Great paper!"


@pytest.mark.asyncio
async def test_reply_to_comment(client, auth_headers, pub_id):
    comment = await client.post(
        f"/api/publications/{pub_id}/comments",
        json={"content": "First"},
        headers=auth_headers,
    )
    comment_id = comment.json()["id"]
    resp = await client.post(
        f"/api/publications/{pub_id}/comments",
        json={"content": "Reply", "parent_id": comment_id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["parent_id"] == comment_id


@pytest.mark.asyncio
async def test_cannot_reply_to_reply(client, auth_headers, pub_id):
    c1 = await client.post(
        f"/api/publications/{pub_id}/comments",
        json={"content": "First"},
        headers=auth_headers,
    )
    c2 = await client.post(
        f"/api/publications/{pub_id}/comments",
        json={"content": "Reply", "parent_id": c1.json()["id"]},
        headers=auth_headers,
    )
    resp = await client.post(
        f"/api/publications/{pub_id}/comments",
        json={"content": "Nested", "parent_id": c2.json()["id"]},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_comments(client, auth_headers, pub_id):
    await client.post(f"/api/publications/{pub_id}/comments", json={"content": "A"}, headers=auth_headers)
    await client.post(f"/api/publications/{pub_id}/comments", json={"content": "B"}, headers=auth_headers)
    resp = await client.get(f"/api/publications/{pub_id}/comments", headers=auth_headers)
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_delete_comment(client, auth_headers, pub_id):
    c = await client.post(f"/api/publications/{pub_id}/comments", json={"content": "Delete me"}, headers=auth_headers)
    resp = await client.delete(f"/api/comments/{c.json()['id']}", headers=auth_headers)
    assert resp.status_code == 204
```

**Step 2: Write follow tests**

Create `backend/app/tests/test_follows.py`:

```python
import pytest


@pytest.fixture
async def second_user_headers(client):
    await client.post("/api/auth/register", json={
        "name": "Second", "email": "second@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "second@example.com", "password": "secret123"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def second_user_id(client, second_user_headers):
    resp = await client.get("/api/auth/me", headers=second_user_headers)
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_follow_user(client, auth_headers, second_user_id):
    resp = await client.post(f"/api/users/{second_user_id}/follow", headers=auth_headers)
    assert resp.json()["following"] is True


@pytest.mark.asyncio
async def test_unfollow_user(client, auth_headers, second_user_id):
    await client.post(f"/api/users/{second_user_id}/follow", headers=auth_headers)
    resp = await client.post(f"/api/users/{second_user_id}/follow", headers=auth_headers)
    assert resp.json()["following"] is False


@pytest.mark.asyncio
async def test_cannot_follow_self(client, auth_headers):
    me = await client.get("/api/auth/me", headers=auth_headers)
    my_id = me.json()["id"]
    resp = await client.post(f"/api/users/{my_id}/follow", headers=auth_headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_profile(client, auth_headers, second_user_id):
    resp = await client.get(f"/api/users/{second_user_id}/profile", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Second"
    assert resp.json()["is_following"] is False


@pytest.mark.asyncio
async def test_profile_shows_following_status(client, auth_headers, second_user_id):
    await client.post(f"/api/users/{second_user_id}/follow", headers=auth_headers)
    resp = await client.get(f"/api/users/{second_user_id}/profile", headers=auth_headers)
    assert resp.json()["is_following"] is True
```

**Step 3: Run all tests**

Run: `cd /Users/rumotecnologias/violeta/backend && python -m pytest app/tests/ -v`

**Step 4: Commit**

```bash
git add backend/app/tests/test_comments.py backend/app/tests/test_follows.py
git commit -m "test: add comment and follow tests"
```

---

### Task 9: Frontend API Client — Publications, Comments, Follows

**Files:**
- Create: `frontend/src/api/publications.ts`
- Create: `frontend/src/api/follows.ts`

**Step 1: Create publications API client**

Create `frontend/src/api/publications.ts`:

```typescript
import { apiFetch, getAccessToken } from './client'

export interface PublicationItem {
  id: string
  author_id: string
  author_name: string
  document_id: string | null
  title: string
  abstract: string | null
  type: 'article' | 'exercise_list' | 'study_material' | 'proof'
  share_token: string
  like_count: number
  comment_count: number
  created_at: string
  liked_by_me: boolean
}

export interface PublicPublication {
  id: string
  author_name: string
  title: string
  abstract: string | null
  type: string
  like_count: number
  comment_count: number
  created_at: string
}

export interface CommentItem {
  id: string
  publication_id: string
  author_id: string
  author_name: string
  parent_id: string | null
  content: string
  created_at: string
}

export async function createPublication(
  pdfBlob: Blob,
  metadata: { title: string; type: string; abstract?: string; document_id?: string },
): Promise<PublicationItem> {
  const formData = new FormData()
  formData.append('pdf', pdfBlob, 'document.pdf')
  formData.append('title', metadata.title)
  formData.append('type', metadata.type)
  if (metadata.abstract) formData.append('abstract', metadata.abstract)
  if (metadata.document_id) formData.append('document_id', metadata.document_id)

  const token = getAccessToken()
  const res = await fetch('/api/publications/', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to create publication')
  return res.json()
}

export async function getExploreFeed(cursor?: string): Promise<PublicationItem[]> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch(`/publications/explore?${params}`)
  if (!res.ok) throw new Error('Failed to load explore feed')
  return res.json()
}

export async function getFollowingFeed(cursor?: string): Promise<PublicationItem[]> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch(`/publications/feed?${params}`)
  if (!res.ok) throw new Error('Failed to load feed')
  return res.json()
}

export async function getPublication(id: string): Promise<PublicationItem> {
  const res = await apiFetch(`/publications/${id}`)
  if (!res.ok) throw new Error('Failed to get publication')
  return res.json()
}

export async function deletePublication(id: string): Promise<void> {
  const res = await apiFetch(`/publications/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete publication')
}

export async function getPublicPublication(shareToken: string): Promise<PublicPublication> {
  const res = await fetch(`/api/p/${shareToken}`)
  if (!res.ok) throw new Error('Publication not found')
  return res.json()
}

export async function toggleLike(pubId: string): Promise<{ liked: boolean; like_count: number }> {
  const res = await apiFetch(`/publications/${pubId}/like`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle like')
  return res.json()
}

export async function getComments(pubId: string, cursor?: string): Promise<CommentItem[]> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch(`/publications/${pubId}/comments?${params}`)
  if (!res.ok) throw new Error('Failed to load comments')
  return res.json()
}

export async function createComment(
  pubId: string,
  content: string,
  parentId?: string,
): Promise<CommentItem> {
  const res = await apiFetch(`/publications/${pubId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId || null }),
  })
  if (!res.ok) throw new Error('Failed to create comment')
  return res.json()
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await apiFetch(`/comments/${commentId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete comment')
}

export function getPdfUrl(pubId: string): string {
  return `/api/publications/${pubId}/pdf`
}

export function getThumbnailUrl(pubId: string): string {
  return `/api/publications/${pubId}/thumbnail`
}
```

**Step 2: Create follows API client**

Create `frontend/src/api/follows.ts`:

```typescript
import { apiFetch } from './client'

export interface UserProfile {
  id: string
  name: string
  publication_count: number
  follower_count: number
  following_count: number
  is_following: boolean
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await apiFetch(`/users/${userId}/profile`)
  if (!res.ok) throw new Error('Failed to get profile')
  return res.json()
}

export async function toggleFollow(userId: string): Promise<{ following: boolean }> {
  const res = await apiFetch(`/users/${userId}/follow`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle follow')
  return res.json()
}

export async function getFollowers(userId: string): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch(`/users/${userId}/followers`)
  if (!res.ok) throw new Error('Failed to get followers')
  return res.json()
}

export async function getFollowing(userId: string): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch(`/users/${userId}/following`)
  if (!res.ok) throw new Error('Failed to get following')
  return res.json()
}
```

**Step 3: Commit**

```bash
git add frontend/src/api/publications.ts frontend/src/api/follows.ts
git commit -m "feat: add frontend API clients for publications and follows"
```

---

### Task 10: PublishModal Component

**Files:**
- Create: `frontend/src/components/publications/PublishModal.tsx`

**Step 1: Create the publish modal**

Create `frontend/src/components/publications/PublishModal.tsx`:

```tsx
import { useState } from 'react'
import { X, FileText, BookOpen, GraduationCap, Lightbulb } from 'lucide-react'
import { createPublication } from '../../api/publications'

const PUBLICATION_TYPES = [
  { value: 'article', label: 'Artigo', icon: FileText },
  { value: 'exercise_list', label: 'Lista de Exercicios', icon: BookOpen },
  { value: 'study_material', label: 'Material de Estudo', icon: GraduationCap },
  { value: 'proof', label: 'Demonstracao', icon: Lightbulb },
] as const

interface PublishModalProps {
  pdfBlob: Blob | null
  documentId?: string
  documentTitle: string
  onPublished: (publicationId: string) => void
  onClose: () => void
}

export function PublishModal({ pdfBlob, documentId, documentTitle, onPublished, onClose }: PublishModalProps) {
  const [title, setTitle] = useState(documentTitle)
  const [abstract, setAbstract] = useState('')
  const [type, setType] = useState<string>('article')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePublish() {
    if (!pdfBlob) {
      setError('Compile o documento antes de publicar.')
      return
    }
    if (!title.trim()) {
      setError('Titulo e obrigatorio.')
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const pub = await createPublication(pdfBlob, {
        title: title.trim(),
        type,
        abstract: abstract.trim() || undefined,
        document_id: documentId,
      })
      onPublished(pub.id)
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] overflow-hidden w-full max-w-lg mx-4"
        style={{ background: 'linear-gradient(170deg, #2a1842 0%, #1a1028 40%, #150d22 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-semibold tracking-wide text-violet-200 uppercase">Publicar Documento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">Titulo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-violet-100 placeholder:text-violet-100/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {PUBLICATION_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    type === value
                      ? 'bg-violet-500/20 text-violet-200 border-violet-500/30'
                      : 'text-violet-300/40 hover:text-violet-300/70 hover:bg-white/[0.03] border-transparent'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">
              Resumo <span className="text-violet-400/30 normal-case tracking-normal">(opcional)</span>
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={3}
              className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-violet-100 placeholder:text-violet-100/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
              placeholder="Breve descricao do conteudo..."
            />
          </div>

          {!pdfBlob && (
            <p className="text-[12px] text-amber-400/80">Compile o documento primeiro para gerar o PDF.</p>
          )}

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-white/[0.06] bg-black/10 gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            disabled={!pdfBlob || publishing || !title.trim()}
            className="px-5 py-1.5 text-[13px] font-semibold bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:pointer-events-none"
          >
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/publications/PublishModal.tsx
git commit -m "feat: add PublishModal component"
```

---

### Task 11: FeedCard Component

**Files:**
- Create: `frontend/src/components/publications/FeedCard.tsx`

**Step 1: Create the feed card**

Create `frontend/src/components/publications/FeedCard.tsx`:

```tsx
import { Heart, MessageCircle } from 'lucide-react'
import { type PublicationItem, getThumbnailUrl } from '../../api/publications'

const TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  exercise_list: 'Exercicios',
  study_material: 'Material',
  proof: 'Demonstracao',
}

const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-500/20 text-blue-300',
  exercise_list: 'bg-emerald-500/20 text-emerald-300',
  study_material: 'bg-amber-500/20 text-amber-300',
  proof: 'bg-purple-500/20 text-purple-300',
}

interface FeedCardProps {
  publication: PublicationItem
  onClick: () => void
}

export function FeedCard({ publication, onClick }: FeedCardProps) {
  const initial = publication.author_name.charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all group"
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] max-h-[280px] bg-white overflow-hidden">
        <img
          src={getThumbnailUrl(publication.id)}
          alt={publication.title}
          className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${TYPE_COLORS[publication.type] || 'bg-gray-500/20 text-gray-300'}`}>
            {TYPE_LABELS[publication.type] || publication.type}
          </span>
        </div>
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">
          {publication.title}
        </h3>
        {publication.abstract && (
          <p className="text-[12px] text-text-secondary line-clamp-2">{publication.abstract}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300">
              {initial}
            </div>
            <span className="text-[11px] text-text-secondary">{publication.author_name}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <Heart size={12} className={publication.liked_by_me ? 'fill-red-400 text-red-400' : ''} />
              {publication.like_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={12} />
              {publication.comment_count}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/publications/FeedCard.tsx
git commit -m "feat: add FeedCard component"
```

---

### Task 12: CommentSection Component

**Files:**
- Create: `frontend/src/components/publications/CommentSection.tsx`

**Step 1: Create comment section**

Create `frontend/src/components/publications/CommentSection.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Send, Reply, Trash2 } from 'lucide-react'
import { type CommentItem, getComments, createComment, deleteComment } from '../../api/publications'
import { useAuth } from '../../contexts/AuthContext'

interface CommentSectionProps {
  publicationId: string
}

export function CommentSection({ publicationId }: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getComments(publicationId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [publicationId])

  async function handleSubmit() {
    if (!newComment.trim()) return
    try {
      const comment = await createComment(publicationId, newComment.trim(), replyTo?.id)
      setComments((prev) => [...prev, comment])
      setNewComment('')
      setReplyTo(null)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      console.error(err)
    }
  }

  // Group: top-level comments with their replies
  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = comments.filter((c) => c.parent_id)
  const repliesByParent = new Map<string, CommentItem[]>()
  for (const r of replies) {
    const arr = repliesByParent.get(r.parent_id!) || []
    arr.push(r)
    repliesByParent.set(r.parent_id!, arr)
  }

  if (loading) {
    return <div className="text-sm text-text-muted py-4">Carregando comentarios...</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Comentarios ({comments.length})</h3>

      {/* Comment list */}
      <div className="space-y-3">
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <CommentBubble
              comment={comment}
              isOwn={user?.id === comment.author_id}
              onReply={() => setReplyTo({ id: comment.id, name: comment.author_name })}
              onDelete={() => handleDelete(comment.id)}
            />
            {repliesByParent.get(comment.id)?.map((reply) => (
              <div key={reply.id} className="ml-8 mt-2">
                <CommentBubble
                  comment={reply}
                  isOwn={user?.id === reply.author_id}
                  onDelete={() => handleDelete(reply.id)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-surface-border pt-3">
        {replyTo && (
          <div className="flex items-center gap-2 text-[11px] text-violet-300/70 mb-2">
            <Reply size={12} />
            Respondendo a {replyTo.name}
            <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-primary ml-auto">cancelar</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Escreva um comentario..."
            className="flex-1 bg-surface-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="px-3 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentBubble({
  comment,
  isOwn,
  onReply,
  onDelete,
}: {
  comment: CommentItem
  isOwn: boolean
  onReply?: () => void
  onDelete: () => void
}) {
  const initial = comment.author_name.charAt(0).toUpperCase()
  const date = new Date(comment.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  return (
    <div className="group flex gap-2">
      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-violet-300">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-text-primary">{comment.author_name}</span>
          <span className="text-[10px] text-text-muted">{date}</span>
        </div>
        <p className="text-[13px] text-text-secondary mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && (
            <button onClick={onReply} className="text-[10px] text-text-muted hover:text-violet-300 flex items-center gap-1">
              <Reply size={10} /> Responder
            </button>
          )}
          {isOwn && (
            <button onClick={onDelete} className="text-[10px] text-text-muted hover:text-red-400 flex items-center gap-1">
              <Trash2 size={10} /> Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/publications/CommentSection.tsx
git commit -m "feat: add CommentSection component"
```

---

### Task 13: FeedPage and ExplorePage

**Files:**
- Create: `frontend/src/components/publications/FeedPage.tsx`
- Create: `frontend/src/components/publications/ExplorePage.tsx`

**Step 1: Create FeedPage**

Create `frontend/src/components/publications/FeedPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { type PublicationItem, getFollowingFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'

export function FeedPage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFollowingFeed()
      .then(setPublications)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function loadMore() {
    if (publications.length === 0) return
    const last = publications[publications.length - 1]
    getFollowingFeed(last.created_at)
      .then((more) => setPublications((prev) => [...prev, ...more]))
      .catch(console.error)
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Feed</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/feed')} className="px-3 py-1.5 text-[12px] font-medium bg-violet-500/20 text-violet-200 rounded-lg border border-violet-500/30">
              Seguindo
            </button>
            <button onClick={() => navigate('/explore')} className="px-3 py-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-white/[0.05] rounded-lg border border-transparent transition-colors">
              Explorar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : publications.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">Siga outros usuarios para ver publicacoes aqui.</p>
            <button onClick={() => navigate('/explore')} className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-400 transition-colors">
              Explorar publicacoes
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {publications.map((pub) => (
                <FeedCard key={pub.id} publication={pub} onClick={() => navigate(`/publication/${pub.id}`)} />
              ))}
            </div>
            {publications.length >= 20 && (
              <div className="flex justify-center mt-8">
                <button onClick={loadMore} className="px-4 py-2 text-sm text-violet-300 hover:text-violet-200 transition-colors">
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Create ExplorePage**

Create `frontend/src/components/publications/ExplorePage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { type PublicationItem, getExploreFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'

export function ExplorePage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExploreFeed()
      .then(setPublications)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function loadMore() {
    if (publications.length === 0) return
    const last = publications[publications.length - 1]
    getExploreFeed(last.created_at)
      .then((more) => setPublications((prev) => [...prev, ...more]))
      .catch(console.error)
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Explorar</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/feed')} className="px-3 py-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-white/[0.05] rounded-lg border border-transparent transition-colors">
              Seguindo
            </button>
            <button onClick={() => navigate('/explore')} className="px-3 py-1.5 text-[12px] font-medium bg-violet-500/20 text-violet-200 rounded-lg border border-violet-500/30">
              Explorar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {publications.map((pub) => (
                <FeedCard key={pub.id} publication={pub} onClick={() => navigate(`/publication/${pub.id}`)} />
              ))}
            </div>
            {publications.length >= 20 && (
              <div className="flex justify-center mt-8">
                <button onClick={loadMore} className="px-4 py-2 text-sm text-violet-300 hover:text-violet-200 transition-colors">
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/publications/FeedPage.tsx frontend/src/components/publications/ExplorePage.tsx
git commit -m "feat: add FeedPage and ExplorePage components"
```

---

### Task 14: PublicationPage (authenticated detail view)

**Files:**
- Create: `frontend/src/components/publications/PublicationPage.tsx`

**Step 1: Create publication detail page**

Create `frontend/src/components/publications/PublicationPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Share2, Trash2, ArrowLeft } from 'lucide-react'
import { type PublicationItem, getPublication, getPdfUrl, toggleLike, deletePublication } from '../../api/publications'
import { CommentSection } from './CommentSection'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  exercise_list: 'Lista de Exercicios',
  study_material: 'Material de Estudo',
  proof: 'Demonstracao',
}

export function PublicationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pub, setPub] = useState<PublicationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    getPublication(id)
      .then(setPub)
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  async function handleLike() {
    if (!pub) return
    const result = await toggleLike(pub.id)
    setPub({ ...pub, liked_by_me: result.liked, like_count: result.like_count })
  }

  async function handleDelete() {
    if (!pub || !confirm('Tem certeza que deseja excluir esta publicacao?')) return
    await deletePublication(pub.id)
    navigate('/explore')
  }

  function handleShare() {
    if (!pub) return
    const url = `${window.location.origin}/p/${pub.share_token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !pub) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAuthor = user?.id === pub.author_id

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border ${
                pub.liked_by_me
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'text-text-secondary hover:text-red-400 border-surface-border hover:border-red-500/20'
              }`}
            >
              <Heart size={14} className={pub.liked_by_me ? 'fill-current' : ''} />
              {pub.like_count}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-surface-border transition-colors"
            >
              <Share2 size={14} />
              {copied ? 'Copiado!' : 'Compartilhar'}
            </button>
            {isAuthor && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 border border-surface-border hover:border-red-500/20 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">{pub.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
            <button
              onClick={() => navigate(`/profile/${pub.author_id}`)}
              className="hover:text-violet-300 transition-colors"
            >
              {pub.author_name}
            </button>
            <span className="text-text-muted">{TYPE_LABELS[pub.type]}</span>
            <span className="text-text-muted">{new Date(pub.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          {pub.abstract && <p className="mt-2 text-sm text-text-secondary">{pub.abstract}</p>}
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-xl overflow-hidden border border-surface-border mb-6" style={{ height: '70vh' }}>
          <iframe
            src={getPdfUrl(pub.id)}
            className="w-full h-full"
            title={pub.title}
          />
        </div>

        {/* Comments */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <CommentSection publicationId={pub.id} />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/publications/PublicationPage.tsx
git commit -m "feat: add PublicationPage with PDF viewer, likes, comments"
```

---

### Task 15: PublicPublicationPage (public access via share link)

**Files:**
- Create: `frontend/src/components/publications/PublicPublicationPage.tsx`

**Step 1: Create public publication page**

Create `frontend/src/components/publications/PublicPublicationPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle } from 'lucide-react'
import { type PublicPublication, getPublicPublication } from '../../api/publications'

const TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  exercise_list: 'Lista de Exercicios',
  study_material: 'Material de Estudo',
  proof: 'Demonstracao',
}

export function PublicPublicationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [pub, setPub] = useState<PublicPublication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    getPublicPublication(token)
      .then(setPub)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !pub) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-bg gap-4">
        <p className="text-text-secondary">Publicacao nao encontrada.</p>
        <button onClick={() => navigate('/')} className="text-sm text-violet-400 hover:text-violet-300">
          Ir para Violeta
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-serif tracking-wide">
            Violeta
          </button>
          <button
            onClick={() => navigate('/signin')}
            className="px-4 py-1.5 text-[13px] font-semibold bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors"
          >
            Entrar
          </button>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">{pub.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
            <span>{pub.author_name}</span>
            <span className="text-text-muted">{TYPE_LABELS[pub.type]}</span>
            <span className="text-text-muted">{new Date(pub.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          {pub.abstract && <p className="mt-2 text-sm text-text-secondary">{pub.abstract}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1"><Heart size={14} /> {pub.like_count}</span>
            <span className="flex items-center gap-1"><MessageCircle size={14} /> {pub.comment_count}</span>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-xl overflow-hidden border border-surface-border" style={{ height: '80vh' }}>
          <iframe
            src={`/api/publications/${pub.id}/pdf`}
            className="w-full h-full"
            title={pub.title}
          />
        </div>

        <div className="text-center py-8">
          <p className="text-sm text-text-secondary mb-3">Entre no Violeta para curtir, comentar e publicar.</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors text-sm font-medium"
          >
            Criar conta gratis
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/publications/PublicPublicationPage.tsx
git commit -m "feat: add PublicPublicationPage for share links"
```

---

### Task 16: ProfilePage Component

**Files:**
- Create: `frontend/src/components/publications/ProfilePage.tsx`

**Step 1: Create profile page**

Create `frontend/src/components/publications/ProfilePage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react'
import { type UserProfile, getUserProfile, toggleFollow } from '../../api/follows'
import { type PublicationItem, getExploreFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'
import { useAuth } from '../../contexts/AuthContext'

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getUserProfile(id),
      // For now, use explore feed filtered client-side by author
      // A dedicated endpoint would be better but YAGNI for v1
      getExploreFeed(),
    ])
      .then(([prof, pubs]) => {
        setProfile(prof)
        setPublications(pubs.filter((p) => p.author_id === id))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleFollow() {
    if (!id || !profile) return
    const result = await toggleFollow(id)
    setProfile({
      ...profile,
      is_following: result.following,
      follower_count: profile.follower_count + (result.following ? 1 : -1),
    })
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMe = user?.id === id
  const initial = profile.name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6">
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center text-2xl font-bold text-violet-300">
            {initial}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-text-primary">{profile.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
              <span><strong className="text-text-primary">{profile.publication_count}</strong> publicacoes</span>
              <span><strong className="text-text-primary">{profile.follower_count}</strong> seguidores</span>
              <span><strong className="text-text-primary">{profile.following_count}</strong> seguindo</span>
            </div>
          </div>
          {!isMe && (
            <button
              onClick={handleFollow}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                profile.is_following
                  ? 'bg-surface-card text-text-primary border-surface-border hover:border-red-500/30 hover:text-red-400'
                  : 'bg-violet-500 text-white border-violet-500 hover:bg-violet-400'
              }`}
            >
              {profile.is_following ? <><UserMinus size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}
            </button>
          )}
        </div>

        {/* Publications */}
        {publications.length === 0 ? (
          <p className="text-center text-text-muted py-12">Nenhuma publicacao ainda.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {publications.map((pub) => (
              <FeedCard key={pub.id} publication={pub} onClick={() => navigate(`/publication/${pub.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/publications/ProfilePage.tsx
git commit -m "feat: add ProfilePage component"
```

---

### Task 17: Wire Routes and Publish Button in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add imports**

At the top of `App.tsx`, add:

```typescript
import { FeedPage } from './components/publications/FeedPage'
import { ExplorePage } from './components/publications/ExplorePage'
import { PublicationPage } from './components/publications/PublicationPage'
import { PublicPublicationPage } from './components/publications/PublicPublicationPage'
import { ProfilePage } from './components/publications/ProfilePage'
import { PublishModal } from './components/publications/PublishModal'
```

**Step 2: Add routes**

In the `<Routes>` section of the `App` component, add the new routes:

```tsx
<Route path="/feed" element={<RequireAuth><FeedPage /></RequireAuth>} />
<Route path="/explore" element={<RequireAuth><ExplorePage /></RequireAuth>} />
<Route path="/publication/:id" element={<RequireAuth><PublicationPage /></RequireAuth>} />
<Route path="/p/:token" element={<PublicPublicationPage />} />
<Route path="/profile/:id" element={<RequireAuth><ProfilePage /></RequireAuth>} />
```

Place them before the `<Route path="*"` catch-all.

**Step 3: Add PublishModal state and trigger in EditorApp**

In the `EditorApp` component, add state:

```typescript
const [publishModalOpen, setPublishModalOpen] = useState(false)
```

Add the modal in the JSX (after the existing modals):

```tsx
{publishModalOpen && (
  <PublishModal
    pdfBlob={pdfBlob}
    documentId={currentDocId ?? undefined}
    documentTitle={documentTitle}
    onPublished={(pubId) => {
      setPublishModalOpen(false)
      navigate(`/publication/${pubId}`)
    }}
    onClose={() => setPublishModalOpen(false)}
  />
)}
```

Note: You need `navigate` in EditorApp. It's already available in `EditorPage` which passes `onGoHome`. Add a new prop `onPublish` or use `useNavigate` directly in EditorApp. The simplest approach: add `const navigate = useNavigate()` at the top of EditorApp (it's already used via `onGoHome`). Actually, looking at the code, EditorApp receives `onGoHome` but doesn't have direct access to `navigate`. Add it:

```typescript
function EditorApp({ initialDocId, onGoHome }: { initialDocId: string; onGoHome: () => void }) {
  const navigate = useNavigate()
  // ... rest of component
```

**Step 4: Pass publish trigger to Toolbar**

The Toolbar needs a new prop `onPublish`. Add `onPublish={() => setPublishModalOpen(true)}` to the Toolbar in the JSX. The Toolbar component will need to accept and render a "Publicar" button — that modification is in the next task.

**Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire publication routes and PublishModal in App"
```

---

### Task 18: Add Publish Button to Toolbar

**Files:**
- Modify: `frontend/src/components/toolbar/Toolbar.tsx`

**Step 1: Add onPublish prop to Toolbar**

In the Toolbar props interface, add:

```typescript
onPublish?: () => void
```

**Step 2: Add Publish button in the toolbar**

Add a "Publicar" button near the compile/download area of the toolbar. Use the `Globe` icon from lucide-react. Example placement — after the compile button:

```tsx
{onPublish && (
  <button
    onClick={onPublish}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white text-[12px] font-semibold rounded-lg hover:bg-violet-400 transition-colors shadow-sm"
    title="Publicar documento"
  >
    <Globe size={14} />
    Publicar
  </button>
)}
```

Import `Globe` from lucide-react at the top of the file.

**Step 3: Commit**

```bash
git add frontend/src/components/toolbar/Toolbar.tsx
git commit -m "feat: add Publish button to toolbar"
```

---

### Task 19: Add Feed/Explore Navigation to HomeScreen

**Files:**
- Modify: `frontend/src/components/home/HomeScreen.tsx`

**Step 1: Add navigation links**

In the HomeScreen header area, add navigation links to Feed and Explore. Add buttons or tabs near the greeting area:

```tsx
import { useNavigate } from 'react-router-dom'

// Inside HomeScreen component:
const navigate = useNavigate()

// In the JSX, near the header/greeting:
<div className="flex items-center gap-3">
  <button onClick={() => navigate('/feed')} className="text-sm text-text-secondary hover:text-violet-300 transition-colors">
    Feed
  </button>
  <button onClick={() => navigate('/explore')} className="text-sm text-text-secondary hover:text-violet-300 transition-colors">
    Explorar
  </button>
</div>
```

**Step 2: Commit**

```bash
git add frontend/src/components/home/HomeScreen.tsx
git commit -m "feat: add Feed/Explore navigation to HomeScreen"
```

---

### Task 20: Vite Proxy Configuration for Publication File Endpoints

**Files:**
- Modify: `frontend/vite.config.ts`

**Step 1: Verify proxy config**

Check that the Vite dev server proxies `/api` to the backend. The existing config likely already proxies `/api` to `http://localhost:8000`. Verify by checking `frontend/vite.config.ts`.

The publication PDF and thumbnail endpoints (`/api/publications/{id}/pdf`, `/api/publications/{id}/thumbnail`) should work automatically if `/api` is already proxied.

If not configured, add:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
},
```

**Step 2: Commit if changed**

```bash
git add frontend/vite.config.ts
git commit -m "feat: ensure API proxy for publication endpoints"
```

---

### Task 21: Build Verification

**Step 1: TypeScript check**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx tsc --noEmit`

**Step 2: Vite build**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vite build`

**Step 3: Backend test suite**

Run: `cd /Users/rumotecnologias/violeta/backend && python -m pytest app/tests/ -v`

**Step 4: Fix any errors and commit**

```bash
git add -A
git commit -m "fix: resolve build errors"
```

---

### Task 22: Docker Compose Volume for Uploads

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add uploads volume**

In the `backend` service in `docker-compose.yml`, add a volume for persistent PDF storage:

```yaml
backend:
  build: ./backend
  depends_on:
    - db
  volumes:
    - uploads:/app/uploads
  environment:
    # ... existing env vars
```

And in the `volumes` section:

```yaml
volumes:
  pgdata:
  uploads:
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add uploads volume to docker-compose for publication PDFs"
```

---

### Task 23: End-to-End Manual Testing

**Step 1: Start backend**

Run: `cd /Users/rumotecnologias/violeta/backend && uvicorn app.main:app --reload`

**Step 2: Start frontend**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vite`

**Step 3: Manual test checklist**

1. Open editor, write a document, compile PDF
2. Click "Publicar" in toolbar → PublishModal opens
3. Fill title, pick type, write abstract → Publish
4. Redirected to PublicationPage with PDF viewer
5. Click like → counter increments
6. Write a comment → appears in list
7. Reply to comment → appears indented
8. Copy share link → open in incognito → PublicPublicationPage shows PDF
9. Navigate to /explore → see all publications
10. Click author name → ProfilePage shows
11. Click Follow → button changes to "Seguindo"
12. Navigate to /feed → see followed user's publications
13. Delete publication → removed from feed

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: publications & social feed complete"
```
