from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_login_and_me(client, db):
    make_user(db, UserRole.owner, "owner@buildwise.example")
    headers = auth_headers(client, "owner@buildwise.example")
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["role"] == "owner"
