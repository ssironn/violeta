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
