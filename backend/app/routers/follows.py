import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.follow import Follow
from app.models.publication import Publication
from app.models.user import User
from app.schemas.publication import UserProfileResponse
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["follows"])


async def _count_followers(user_id: uuid.UUID, session: AsyncSession) -> int:
    result = await session.exec(
        select(func.count()).where(Follow.following_id == user_id)
    )
    return result.one()


async def _count_following(user_id: uuid.UUID, session: AsyncSession) -> int:
    result = await session.exec(
        select(func.count()).where(Follow.follower_id == user_id)
    )
    return result.one()


async def _is_following(
    follower_id: uuid.UUID, following_id: uuid.UUID, session: AsyncSession
) -> bool:
    result = await session.exec(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
    )
    return result.first() is not None


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target_user = await session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    pub_count_result = await session.exec(
        select(func.count()).where(Publication.author_id == user_id)
    )
    publication_count = pub_count_result.one()

    follower_count = await _count_followers(user_id, session)
    following_count = await _count_following(user_id, session)
    is_following = await _is_following(user.id, user_id, session)

    return {
        "id": target_user.id,
        "name": target_user.name,
        "publication_count": publication_count,
        "follower_count": follower_count,
        "following_count": following_count,
        "is_following": is_following,
    }


@router.post("/{user_id}/follow")
async def toggle_follow(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target_user = await session.get(User, user_id)
    if not target_user:
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
        select(User.id, User.name)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == user_id)
    )
    rows = result.all()
    return [{"id": row[0], "name": row[1]} for row in rows]


@router.get("/{user_id}/following")
async def list_following(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(User.id, User.name)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == user_id)
    )
    rows = result.all()
    return [{"id": row[0], "name": row[1]} for row in rows]
