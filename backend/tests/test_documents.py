import pytest


@pytest.mark.asyncio
async def test_create_document(client, auth_headers):
    resp = await client.post("/api/documents/", json={
        "title": "My Doc",
        "content": {"type": "doc", "content": []}
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "My Doc"


@pytest.mark.asyncio
async def test_list_documents(client, auth_headers):
    await client.post("/api/documents/", json={"title": "Doc 1"}, headers=auth_headers)
    await client.post("/api/documents/", json={"title": "Doc 2"}, headers=auth_headers)
    resp = await client.get("/api/documents/", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Get Me"}, headers=auth_headers)
    doc_id = create.json()["id"]
    resp = await client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get Me"


@pytest.mark.asyncio
async def test_update_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Old"}, headers=auth_headers)
    doc_id = create.json()["id"]
    resp = await client.put(f"/api/documents/{doc_id}", json={"title": "New"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


@pytest.mark.asyncio
async def test_delete_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Delete Me"}, headers=auth_headers)
    doc_id = create.json()["id"]
    resp = await client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_users_document(client, auth_headers):
    create = await client.post("/api/documents/", json={"title": "Private"}, headers=auth_headers)
    doc_id = create.json()["id"]
    await client.post("/api/auth/register", json={
        "name": "Other", "email": "other@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "other@example.com", "password": "secret123"
    })
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = await client.get(f"/api/documents/{doc_id}", headers=other_headers)
    assert resp.status_code == 404
