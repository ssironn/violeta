import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
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
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
    )
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, session: AsyncSession = Depends(get_session)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await session.get(User, uuid.UUID(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=new_access)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="refresh_token")
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user
