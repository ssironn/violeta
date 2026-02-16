from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables
from app.models.publication import Publication, PublicationLike, PublicationComment  # noqa: F401
from app.models.follow import Follow  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.documents import router as documents_router
from app.routers.sharing import router as sharing_router
from app.routers.google_drive import router as google_drive_router
from app.routers.publications import router as publications_router, public_router as publications_public_router
from app.routers.comments import router as comments_router
from app.routers.follows import router as follows_router
from app.routers.compile import router as compile_router


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    await create_db_and_tables()
    yield


app = FastAPI(title="Violeta API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(sharing_router)
app.include_router(google_drive_router)
app.include_router(publications_router)
app.include_router(publications_public_router)
app.include_router(comments_router)
app.include_router(follows_router)
app.include_router(compile_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
