"""Phase 4 (docs/implementation-plan.md §9): remaining report gaps, CSV export,
dashboard overdue-invoices tile, and auth rate limiting."""

from app.core.config import get_settings
from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_attendance_and_material_reports_reachable_by_owner(client, db):
    make_user(db, UserRole.owner, "owner@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner@buildwise.example")

    attendance_resp = client.get("/api/v1/reports/attendance", headers=headers)
    assert attendance_resp.status_code == 200
    assert attendance_resp.json()["rows"] == []

    payments_resp = client.get("/api/v1/reports/payments", headers=headers)
    assert payments_resp.status_code == 200

    materials_resp = client.get("/api/v1/reports/materials", headers=headers)
    assert materials_resp.status_code == 200


def test_invoice_report_csv_export(client, db):
    make_user(db, UserRole.owner, "owner2@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner2@buildwise.example")

    project = client.post("/api/v1/projects", json={"name": "CSV Site"}, headers=headers).json()
    client.post(
        "/api/v1/invoices",
        json={
            "project_id": project["id"],
            "client_name": "CSV Client",
            "invoice_date": "2026-08-01",
            "line_items": [{"description": "Work", "quantity": 1, "rate": 1000}],
        },
        headers=headers,
    )

    csv_resp = client.get("/api/v1/reports/invoices", params={"format": "csv"}, headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in csv_resp.headers["content-disposition"]
    lines = csv_resp.text.strip().splitlines()
    assert lines[0] == (
        "invoice_id,project_id,project_name,client_name,invoice_date,due_date,"
        "total_amount,amount_received,amount_outstanding,status"
    )
    assert "CSV Client" in lines[1]


def test_dashboard_overdue_invoices_count(client, db):
    make_user(db, UserRole.owner, "owner3@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner3@buildwise.example")

    project = client.post("/api/v1/projects", json={"name": "Overdue Site"}, headers=headers).json()
    invoice = client.post(
        "/api/v1/invoices",
        json={
            "project_id": project["id"],
            "client_name": "Late Client",
            "invoice_date": "2026-06-01",
            "due_date": "2026-06-15",
            "line_items": [{"description": "Work", "quantity": 1, "rate": 2000}],
        },
        headers=headers,
    ).json()
    assert invoice["status"] == "unpaid"

    before = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert before["overdue_invoices_count"] == 0

    sweep = client.post("/api/v1/admin/jobs/run-invoice-overdue-sweep", headers=headers)
    assert sweep.status_code == 200
    assert sweep.json()["flipped_to_overdue"] == 1

    after = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert after["overdue_invoices_count"] == 1
    assert after["overdue_invoices_total"] == 2000


def test_login_rate_limited_after_repeated_attempts(client, db):
    make_user(db, UserRole.owner, "rl@buildwise.example")
    db.flush()
    settings = get_settings()

    responses = []
    for _ in range(settings.auth_rate_limit_attempts + 1):
        responses.append(
            client.post(
                "/api/v1/auth/login",
                json={"email": "rl@buildwise.example", "password": "wrong-password"},
            )
        )

    assert all(r.status_code == 401 for r in responses[:-1])
    assert responses[-1].status_code == 429
    assert "Retry-After" in responses[-1].headers
