import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.document import Document
from app.models.user import User
from app.utils.deps import get_current_user
from app.utils.google_auth import create_oauth_flow, get_credentials
from app.services.google_drive import list_drive_files, export_google_doc_as_html, get_file_name, create_google_doc

router = APIRouter(prefix="/api/google", tags=["google-drive"])


@router.get("/auth")
async def google_auth(user: User = Depends(get_current_user)):
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=501,
            detail="Google Drive integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        )
    flow = create_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=str(user.id),
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(code: str, state: str, session: AsyncSession = Depends(get_session)):
    flow = create_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    user = await session.get(User, uuid.UUID(state))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.google_refresh_token = credentials.refresh_token
    session.add(user)
    await session.commit()
    return RedirectResponse(url=f"{settings.frontend_url}?google_connected=true")


@router.get("/files")
async def google_files(user: User = Depends(get_current_user)):
    if not user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    creds = get_credentials(user.google_refresh_token)
    files = list_drive_files(creds)
    return files


@router.post("/import/{file_id}")
async def import_from_drive(
    file_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    creds = get_credentials(user.google_refresh_token)
    html = export_google_doc_as_html(creds, file_id)
    name = get_file_name(creds, file_id)
    content = {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": html}]}]
    }
    doc = Document(
        owner_id=user.id,
        title=name,
        content=content,
        google_drive_file_id=file_id,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.post("/export/{document_id}")
async def export_to_drive(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    doc = await session.get(Document, document_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    creds = get_credentials(user.google_refresh_token)
    html = f"<html><body><h1>{doc.title}</h1><p>Exported from Violeta</p></body></html>"
    drive_file_id = create_google_doc(creds, doc.title, html)
    doc.google_drive_file_id = drive_file_id
    session.add(doc)
    await session.commit()
    return {"google_drive_file_id": drive_file_id}
