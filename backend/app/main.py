from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables
from app.routers.auth import router as auth_router
from app.routers.documents import router as documents_router
from app.routers.sharing import router as sharing_router
from app.routers.google_drive import router as google_drive_router


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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
