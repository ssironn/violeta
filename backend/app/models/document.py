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
