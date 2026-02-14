import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_session

# Use SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_maker = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def get_test_session():
    async with test_session_maker() as session:
        yield session


# Override the dependency
app.dependency_overrides[get_session] = get_test_session


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/auth/register", json={
        "name": "Test", "email": "doc@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "doc@example.com", "password": "secret123"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
