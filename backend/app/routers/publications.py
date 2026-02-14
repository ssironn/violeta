import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.publication import Publication, PublicationLike, PublicationType
from app.models.follow import Follow
from app.models.user import User
from app.schemas.publication import PublicationResponse, PublicPublicationResponse
from app.services.thumbnail import save_pdf, generate_thumbnail, delete_publication_files
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/publications", tags=["publications"])
public_router = APIRouter(tags=["publications-public"])


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
    try:
        pub_type = PublicationType(type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid publication type. Must be one of: {[t.value for t in PublicationType]}",
        )

    pub_id = uuid.uuid4()
    pdf_bytes = await pdf.read()
    pdf_path = save_pdf(str(pub_id), pdf_bytes)
    thumbnail_path = generate_thumbnail(str(pub_id))
    share_token = secrets.token_hex(16)

    doc_uuid = uuid.UUID(document_id) if document_id else None

    publication = Publication(
        id=pub_id,
        author_id=user.id,
        document_id=doc_uuid,
        title=title,
        abstract=abstract,
        type=pub_type,
        pdf_path=pdf_path,
        thumbnail_path=thumbnail_path,
        share_token=share_token,
    )
    session.add(publication)
    await session.commit()
    await session.refresh(publication)

    return _pub_response(publication, user.name)


@router.get("/feed", response_model=list[PublicationResponse])
async def feed(
    cursor: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
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
        cursor_dt = datetime.fromisoformat(cursor)
        query = query.where(Publication.created_at < cursor_dt)

    result = await session.exec(query)
    rows = result.all()

    pub_ids = [row[0].id for row in rows]

    if pub_ids:
        liked_result = await session.exec(
            select(PublicationLike.publication_id).where(
                PublicationLike.user_id == user.id,
                col(PublicationLike.publication_id).in_(pub_ids),
            )
        )
        liked_set = set(liked_result.all())
    else:
        liked_set = set()

    return [
        _pub_response(pub, author_name, liked=pub.id in liked_set)
        for pub, author_name in rows
    ]


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
        cursor_dt = datetime.fromisoformat(cursor)
        query = query.where(Publication.created_at < cursor_dt)

    result = await session.exec(query)
    rows = result.all()

    pub_ids = [row[0].id for row in rows]

    if pub_ids:
        liked_result = await session.exec(
            select(PublicationLike.publication_id).where(
                PublicationLike.user_id == user.id,
                col(PublicationLike.publication_id).in_(pub_ids),
            )
        )
        liked_set = set(liked_result.all())
    else:
        liked_set = set()

    return [
        _pub_response(pub, author_name, liked=pub.id in liked_set)
        for pub, author_name in rows
    ]


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

    return _pub_response(pub, author_name, liked=liked)


@router.delete("/{pub_id}", status_code=204)
async def delete_publication(
    pub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    if pub.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    delete_publication_files(str(pub.id))
    await session.delete(pub)
    await session.commit()


@router.get("/{pub_id}/pdf")
async def get_publication_pdf(
    pub_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    return FileResponse(
        pub.pdf_path,
        media_type="application/pdf",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/{pub_id}/thumbnail")
async def get_publication_thumbnail(
    pub_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
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
    await session.refresh(pub)

    return {"liked": liked, "like_count": pub.like_count}


# --- Public router (no auth) ---

@public_router.get("/api/p/{share_token}", response_model=PublicPublicationResponse)
async def get_public_publication(
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
