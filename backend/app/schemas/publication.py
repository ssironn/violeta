import uuid
from datetime import datetime

from pydantic import BaseModel


class PublicationCreate(BaseModel):
    title: str
    abstract: str | None = None
    type: str
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


class PublicPublicationResponse(BaseModel):
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


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    publication_count: int
    follower_count: int
    following_count: int
    is_following: bool = False
