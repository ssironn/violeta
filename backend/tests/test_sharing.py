import pytest


@pytest.mark.asyncio
async def test_share_document(client, auth_headers):
    doc = await client.post("/api/documents/", json={
        "title": "Shared Doc",
        "content": {"type": "doc", "content": [{"type": "paragraph"}]}
    }, headers=auth_headers)
    doc_id = doc.json()["id"]
    resp = await client.post(f"/api/documents/{doc_id}/share", headers=auth_headers)
    assert resp.status_code == 200
    assert "share_token" in resp.json()


@pytest.mark.asyncio
async def test_view_shared_document(client, auth_headers):
    doc = await client.post("/api/documents/", json={
        "title": "Shared Doc",
        "content": {"type": "doc", "content": [{"type": "paragraph"}]}
    }, headers=auth_headers)
    doc_id = doc.json()["id"]
    share = await client.post(f"/api/documents/{doc_id}/share", headers=auth_headers)
    token = share.json()["share_token"]
    # No auth needed to view
    resp = await client.get(f"/api/shared/{token}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Shared Doc"


@pytest.mark.asyncio
async def test_copy_shared_document(client, auth_headers):
    doc = await client.post("/api/documents/", json={
        "title": "Shared Doc",
        "content": {"type": "doc", "content": [{"type": "paragraph"}]}
    }, headers=auth_headers)
    doc_id = doc.json()["id"]
    share = await client.post(f"/api/documents/{doc_id}/share", headers=auth_headers)
    token = share.json()["share_token"]
    # Register second user
    await client.post("/api/auth/register", json={
        "name": "Copier", "email": "copier@example.com", "password": "secret123"
    })
    login = await client.post("/api/auth/login", json={
        "email": "copier@example.com", "password": "secret123"
    })
    copier_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = await client.post(f"/api/shared/{token}/copy", headers=copier_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Copy of Shared Doc"
    assert resp.json()["copied_from_id"] == doc_id


@pytest.mark.asyncio
async def test_revoke_share(client, auth_headers):
    doc = await client.post("/api/documents/", json={
        "title": "Shared Doc",
        "content": {"type": "doc", "content": []}
    }, headers=auth_headers)
    doc_id = doc.json()["id"]
    share = await client.post(f"/api/documents/{doc_id}/share", headers=auth_headers)
    token = share.json()["share_token"]
    # Revoke
    resp = await client.delete(f"/api/documents/{doc_id}/share", headers=auth_headers)
    assert resp.status_code == 204
    # Token should no longer work
    resp = await client.get(f"/api/shared/{token}")
    assert resp.status_code == 404
