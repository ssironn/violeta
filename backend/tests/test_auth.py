import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "secret123"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test User"
    assert data["email"] == "test@example.com"
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"name": "A", "email": "dup@example.com", "password": "secret123"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "name": "Test", "email": "login@example.com", "password": "secret123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "secret123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "name": "Test", "email": "wrong@example.com", "password": "secret123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@example.com", "password": "badpassword"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(client):
    await client.post("/api/auth/register", json={
        "name": "Me", "email": "me@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "me@example.com", "password": "secret123"
    })
    token = login.json()["access_token"]
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"
