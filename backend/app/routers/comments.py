import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.publication import Publication, PublicationComment
from app.models.user import User
from app.schemas.publication import CommentCreate, CommentResponse
from app.utils.deps import get_current_user

router = APIRouter(tags=["comments"])


@router.get(
    "/api/publications/{pub_id}/comments",
    response_model=list[CommentResponse],
)
async def list_comments(
    pub_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = (
        select(PublicationComment, User.name)
        .join(User, PublicationComment.author_id == User.id)
        .where(PublicationComment.publication_id == pub_id)
        .order_by(PublicationComment.created_at.asc())
        .limit(limit)
    )

    if cursor:
        cursor_dt = datetime.fromisoformat(cursor)
        query = query.where(PublicationComment.created_at > cursor_dt)

    result = await session.exec(query)
    rows = result.all()

    return [
        {
            "id": comment.id,
            "publication_id": comment.publication_id,
            "author_id": comment.author_id,
            "author_name": author_name,
            "parent_id": comment.parent_id,
            "content": comment.content,
            "created_at": comment.created_at,
        }
        for comment, author_name in rows
    ]


@router.post(
    "/api/publications/{pub_id}/comments",
    response_model=CommentResponse,
    status_code=201,
)
async def create_comment(
    pub_id: uuid.UUID,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    pub = await session.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    parent_uuid = None
    if data.parent_id:
        parent_uuid = uuid.UUID(data.parent_id)
        parent = await session.get(PublicationComment, parent_uuid)
        if not parent or parent.publication_id != pub_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Cannot reply to a reply. Only one level of nesting is allowed.",
            )

    comment = PublicationComment(
        publication_id=pub_id,
        author_id=user.id,
        parent_id=parent_uuid,
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
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    pub = await session.get(Publication, comment.publication_id)
    if pub:
        pub.comment_count = max(0, pub.comment_count - 1)
        session.add(pub)

    await session.delete(comment)
    await session.commit()
