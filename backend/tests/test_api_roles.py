from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_supervisor_cannot_create_project(client, db):
    make_user(db, UserRole.supervisor, "sup@buildwise.example")
    headers = auth_headers(client, "sup@buildwise.example")
    response = client.post("/api/v1/projects", json={"name": "New Site"}, headers=headers)
    assert response.status_code == 403


def test_owner_can_create_project(client, db):
    make_user(db, UserRole.owner, "owner@buildwise.example")
    headers = auth_headers(client, "owner@buildwise.example")
    response = client.post("/api/v1/projects", json={"name": "New Site"}, headers=headers)
    assert response.status_code == 201
    assert response.json()["name"] == "New Site"


def test_accountant_cannot_mark_attendance(client, db):
    make_user(db, UserRole.owner, "owner2@buildwise.example")
    make_user(db, UserRole.accountant, "acct@buildwise.example")
    db.flush()

    owner_headers = auth_headers(client, "owner2@buildwise.example")
    project_resp = client.post("/api/v1/projects", json={"name": "Site X"}, headers=owner_headers)
    project_id = project_resp.json()["id"]
    worker_resp = client.post(
        "/api/v1/workers", json={"name": "Ramesh", "default_daily_rate": 500}, headers=owner_headers
    )
    worker_id = worker_resp.json()["id"]

    acct_headers = auth_headers(client, "acct@buildwise.example")
    response = client.post(
        "/api/v1/attendance",
        json={
            "project_id": project_id,
            "date": "2026-08-03",
            "entries": [{"worker_id": worker_id, "status": "present"}],
        },
        headers=acct_headers,
    )
    assert response.status_code == 403


def test_unauthenticated_request_rejected(client):
    response = client.get("/api/v1/projects")
    assert response.status_code == 401


def test_supervisor_blocked_from_unassigned_project(client, db):
    make_user(db, UserRole.owner, "owner3@buildwise.example")
    sup = make_user(db, UserRole.supervisor, "sup3@buildwise.example")
    db.flush()

    owner_headers = auth_headers(client, "owner3@buildwise.example")
    project_resp = client.post("/api/v1/projects", json={"name": "Site Y"}, headers=owner_headers)
    project_id = project_resp.json()["id"]

    sup_headers = auth_headers(client, "sup3@buildwise.example")
    response = client.get(f"/api/v1/projects/{project_id}", headers=sup_headers)
    assert response.status_code == 403

    client.post(
        f"/api/v1/projects/{project_id}/assign-supervisor",
        json={"user_id": sup.id},
        headers=owner_headers,
    )
    response = client.get(f"/api/v1/projects/{project_id}", headers=sup_headers)
    assert response.status_code == 200
