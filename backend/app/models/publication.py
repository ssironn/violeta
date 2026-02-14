import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, Enum, UniqueConstraint
from sqlmodel import SQLModel, Field


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
    type: PublicationType = Field(
        sa_column=Column(Enum(PublicationType), nullable=False)
    )
    pdf_path: str = Field(max_length=500)
    thumbnail_path: str = Field(max_length=500)
    share_token: str = Field(max_length=32, unique=True, index=True)
    like_count: int = Field(default=0)
    comment_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PublicationLike(SQLModel, table=True):
    __tablename__ = "publication_likes"
    __table_args__ = (
        UniqueConstraint("publication_id", "user_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publication_id: uuid.UUID = Field(foreign_key="publications.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PublicationComment(SQLModel, table=True):
    __tablename__ = "publication_comments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publication_id: uuid.UUID = Field(foreign_key="publications.id", index=True)
    author_id: uuid.UUID = Field(foreign_key="users.id")
    parent_id: uuid.UUID | None = Field(
        default=None, foreign_key="publication_comments.id"
    )
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
