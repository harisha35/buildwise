import re

from sqlalchemy.orm import Session

from app.models.enums import UserRole
from tests.conftest import make_user


def test_forgot_password_sends_reset_email_with_working_link(client, db: Session, monkeypatch):
    make_user(db, UserRole.owner, "resetme@buildwise.example")
    db.flush()

    sent = {}

    def fake_send_email(to, subject, body):
        sent["to"] = to
        sent["subject"] = subject
        sent["body"] = body

    monkeypatch.setattr("app.api.v1.auth.send_email", fake_send_email)

    resp = client.post("/api/v1/auth/forgot-password", json={"email": "resetme@buildwise.example"})
    assert resp.status_code == 204
    assert sent["to"] == "resetme@buildwise.example"

    match = re.search(r"reset-password\?token=([\w-]+)", sent["body"])
    assert match is not None
    token = match.group(1)

    reset_resp = client.post(
        "/api/v1/auth/reset-password", json={"token": token, "new_password": "brandnewpassword"}
    )
    assert reset_resp.status_code == 204

    login_resp = client.post(
        "/api/v1/auth/login", json={"email": "resetme@buildwise.example", "password": "brandnewpassword"}
    )
    assert login_resp.status_code == 200

    # token is single-use
    reused_resp = client.post(
        "/api/v1/auth/reset-password", json={"token": token, "new_password": "anotherpassword"}
    )
    assert reused_resp.status_code == 400


def test_forgot_password_unknown_email_sends_nothing(client, db: Session, monkeypatch):
    called = False

    def fake_send_email(to, subject, body):
        nonlocal called
        called = True

    monkeypatch.setattr("app.api.v1.auth.send_email", fake_send_email)

    resp = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@buildwise.example"})
    assert resp.status_code == 204
    assert called is False


def test_send_email_logs_instead_of_sending_when_smtp_unconfigured(caplog):
    from app.core.email import send_email

    with caplog.at_level("INFO"):
        send_email(to="someone@buildwise.example", subject="Test", body="Body text")

    assert any("SMTP not configured" in record.message for record in caplog.records)
