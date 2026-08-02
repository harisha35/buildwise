"""Exit criteria (docs/implementation-plan.md §9, Phase 1):
create project, add workers, mark a week of attendance across two projects for a
shared worker, generate Sunday payment, mark paid with UPI proof, see ledger update.
"""

from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_full_phase1_flow(client, db):
    make_user(db, UserRole.owner, "owner@buildwise.example")
    supervisor = make_user(db, UserRole.supervisor, "supervisor@buildwise.example")
    db.flush()
    owner_headers = auth_headers(client, "owner@buildwise.example")

    # 1. Create two projects
    site_a = client.post("/api/v1/projects", json={"name": "Site A"}, headers=owner_headers).json()
    site_b = client.post("/api/v1/projects", json={"name": "Site B"}, headers=owner_headers).json()

    # Assign supervisor to both
    for site in (site_a, site_b):
        resp = client.post(
            f"/api/v1/projects/{site['id']}/assign-supervisor",
            json={"user_id": supervisor.id},
            headers=owner_headers,
        )
        assert resp.status_code == 201

    # 2. Add a worker type + a worker shared across both projects
    worker_type = client.post(
        "/api/v1/worker-types",
        json={"name": "Mason", "default_daily_rate": 600, "default_ot_rate": 50},
        headers=owner_headers,
    ).json()
    worker = client.post(
        "/api/v1/workers",
        json={"name": "Ravi Kumar", "worker_type_id": worker_type["id"]},
        headers=owner_headers,
    ).json()

    sup_headers = auth_headers(client, "supervisor@buildwise.example")

    # 3. Mark a week of attendance (Mon-Sun) split across the two projects
    week_dates = [f"2026-08-{day:02d}" for day in range(3, 10)]  # Mon Aug 3 - Sun Aug 9, 2026
    for i, d in enumerate(week_dates):
        project = site_a if i % 2 == 0 else site_b
        entry = {"worker_id": worker["id"], "status": "present", "ot_hours": 1 if i == 0 else 0}
        resp = client.post(
            "/api/v1/attendance",
            json={"project_id": project["id"], "date": d, "entries": [entry]},
            headers=sup_headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["saved"][0]["status"] == "present"

    # 4. Generate the Sunday payment (manual trigger, admin endpoint)
    gen_resp = client.post(
        "/api/v1/admin/jobs/run-weekly-payments",
        params={"week_start": "2026-08-03"},
        headers=owner_headers,
    )
    assert gen_resp.status_code == 200, gen_resp.text
    payments = gen_resp.json()
    assert len(payments) == 1
    payment = payments[0]
    # 7 present days * 600 + 1 OT hour * 50 = 4250
    assert payment["gross_wage_due"] == 4250
    assert len(payment["breakdown"]) == 2  # split across both projects

    due_resp = client.get(
        "/api/v1/payments/due", params={"week_start": "2026-08-03"}, headers=owner_headers
    )
    assert due_resp.status_code == 200
    assert len(due_resp.json()) == 1

    # 5. Mark paid via UPI with a transaction reference as proof
    mark_paid_resp = client.post(
        f"/api/v1/payments/{payment['id']}/mark-paid",
        json={
            "advance_deduction_amount": 0,
            "payment_mode": "upi",
            "proof_reference": "UPI-TXN-12345",
        },
        headers=sup_headers,
    )
    assert mark_paid_resp.status_code == 200, mark_paid_resp.text
    paid = mark_paid_resp.json()
    assert paid["status"] == "paid"
    assert paid["net_paid"] == 4250
    assert paid["proof_reference"] == "UPI-TXN-12345"

    # 6. Ledger reflects the wage + payment
    ledger_resp = client.get(f"/api/v1/workers/{worker['id']}/ledger", headers=owner_headers)
    assert ledger_resp.status_code == 200
    ledger = ledger_resp.json()
    assert ledger["outstanding_advance_balance"] == 0
    types = [e["type"] for e in ledger["entries"]]
    assert "wage" in types
    assert "payment" in types


def test_advance_deduction_reduces_outstanding_balance(client, db):
    make_user(db, UserRole.owner, "owner4@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner4@buildwise.example")

    site = client.post("/api/v1/projects", json={"name": "Site C"}, headers=headers).json()
    worker = client.post(
        "/api/v1/workers", json={"name": "Suresh", "default_daily_rate": 500}, headers=headers
    ).json()

    advance_resp = client.post(
        f"/api/v1/workers/{worker['id']}/advances",
        json={"amount": 1000, "date": "2026-08-01", "note": "Emergency advance"},
        headers=headers,
    )
    assert advance_resp.status_code == 201
    assert advance_resp.json()["outstanding_amount"] == 1000

    client.post(
        "/api/v1/attendance",
        json={
            "project_id": site["id"],
            "date": "2026-08-03",
            "entries": [{"worker_id": worker["id"], "status": "present"}],
        },
        headers=headers,
    )
    gen_resp = client.post(
        "/api/v1/admin/jobs/run-weekly-payments",
        params={"week_start": "2026-08-03"},
        headers=headers,
    )
    payment = gen_resp.json()[0]

    mark_paid_resp = client.post(
        f"/api/v1/payments/{payment['id']}/mark-paid",
        json={"advance_deduction_amount": 200, "payment_mode": "cash"},
        headers=headers,
    )
    assert mark_paid_resp.status_code == 200
    result = mark_paid_resp.json()
    assert result["advance_deducted"] == 200
    assert result["net_paid"] == 300  # 500 gross - 200 deducted

    advances_resp = client.get(f"/api/v1/workers/{worker['id']}/advances", headers=headers)
    assert advances_resp.json()[0]["outstanding_amount"] == 800


def test_same_day_double_project_attendance_warns_not_blocks(client, db):
    make_user(db, UserRole.owner, "owner5@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner5@buildwise.example")

    site_a = client.post("/api/v1/projects", json={"name": "Site D"}, headers=headers).json()
    site_b = client.post("/api/v1/projects", json={"name": "Site E"}, headers=headers).json()
    worker = client.post(
        "/api/v1/workers", json={"name": "Anil", "default_daily_rate": 450}, headers=headers
    ).json()

    resp1 = client.post(
        "/api/v1/attendance",
        json={
            "project_id": site_a["id"],
            "date": "2026-08-04",
            "entries": [{"worker_id": worker["id"], "status": "present"}],
        },
        headers=headers,
    )
    assert resp1.status_code == 200
    assert resp1.json()["warnings"] == []

    resp2 = client.post(
        "/api/v1/attendance",
        json={
            "project_id": site_b["id"],
            "date": "2026-08-04",
            "entries": [{"worker_id": worker["id"], "status": "present"}],
        },
        headers=headers,
    )
    assert resp2.status_code == 200  # not blocked
    assert len(resp2.json()["warnings"]) == 1
    assert resp2.json()["saved"][0]["status"] == "present"  # still saved
