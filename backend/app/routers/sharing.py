import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
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
