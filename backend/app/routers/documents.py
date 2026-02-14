from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListItem
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentListItem])
async def list_documents(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Document).where(Document.owner_id == user.id).order_by(Document.updated_at.desc())
    )
    return result.all()


@router.post("/", response_model=DocumentResponse, status_code=201)
async def create_document(
    data: DocumentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = Document(owner_id=user.id, title=data.title, content=data.content)
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: uuid.UUID,
    data: DocumentUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    if data.title is not None:
        doc.title = data.title
    if data.content is not None:
        doc.content = data.content
    doc.updated_at = datetime.now(timezone.utc)
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    doc = await session.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    await session.delete(doc)
    await session.commit()
