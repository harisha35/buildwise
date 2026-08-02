"""Exit criteria (docs/implementation-plan.md §9, Phase 2):
stock and spend numbers for a project are traceable and match manual reconciliation.
"""

from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_full_phase2_flow(client, db):
    make_user(db, UserRole.owner, "owner@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner@buildwise.example")

    site = client.post("/api/v1/projects", json={"name": "Site A"}, headers=headers).json()

    unit = client.post(
        "/api/v1/units-of-measure", json={"code": "bag", "label": "Bag"}, headers=headers
    ).json()
    supplier = client.post(
        "/api/v1/suppliers", json={"name": "ACC Supplies", "phone": "9999999999"}, headers=headers
    ).json()
    material = client.post(
        "/api/v1/materials",
        json={
            "name": "Cement",
            "category": "Bulk",
            "unit_id": unit["id"],
            "default_supplier_id": supplier["id"],
        },
        headers=headers,
    ).json()

    # Stock In: 100 bags @ 350/bag
    stock_in = client.post(
        "/api/v1/stock/movements",
        json={
            "material_id": material["id"],
            "project_id": site["id"],
            "type": "in",
            "quantity": 100,
            "unit_price": 350,
            "supplier_id": supplier["id"],
            "date": "2026-08-01",
        },
        headers=headers,
    )
    assert stock_in.status_code == 201, stock_in.text
    assert stock_in.json()["total_cost"] == 35000

    # Stock Out: 40 bags consumed
    client.post(
        "/api/v1/stock/movements",
        json={
            "material_id": material["id"],
            "project_id": site["id"],
            "type": "out",
            "quantity": 40,
            "date": "2026-08-02",
        },
        headers=headers,
    )
    # Wastage: 5 bags damaged
    client.post(
        "/api/v1/stock/movements",
        json={
            "material_id": material["id"],
            "project_id": site["id"],
            "type": "wastage",
            "quantity": 5,
            "date": "2026-08-03",
        },
        headers=headers,
    )

    stock_resp = client.get(
        "/api/v1/stock", params={"project_id": site["id"]}, headers=headers
    )
    assert stock_resp.status_code == 200
    balance = stock_resp.json()[0]
    assert balance["current_stock"] == 55  # 100 - 40 - 5

    # Direct material expense (e.g. small hardware purchase, no stock tracked)
    expense_resp = client.post(
        "/api/v1/material-expenses",
        json={"project_id": site["id"], "material_id": material["id"], "amount": 1200, "date": "2026-08-04"},
        headers=headers,
    )
    assert expense_resp.status_code == 201

    expenses_resp = client.get(
        "/api/v1/material-expenses", params={"project_id": site["id"]}, headers=headers
    )
    assert len(expenses_resp.json()) == 1

    dashboard_resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dashboard_resp.status_code == 200
    # 35000 stock-in cost + 1200 direct expense; wastage cost isn't separately counted
    assert dashboard_resp.json()["material_spend_total"] == 36200


def test_supervisor_scoped_to_assigned_project_for_stock(client, db):
    make_user(db, UserRole.owner, "owner2@buildwise.example")
    supervisor = make_user(db, UserRole.supervisor, "sup2@buildwise.example")
    db.flush()
    owner_headers = auth_headers(client, "owner2@buildwise.example")

    site_a = client.post("/api/v1/projects", json={"name": "Site B"}, headers=owner_headers).json()
    site_b = client.post("/api/v1/projects", json={"name": "Site C"}, headers=owner_headers).json()
    client.post(
        f"/api/v1/projects/{site_a['id']}/assign-supervisor",
        json={"user_id": supervisor.id},
        headers=owner_headers,
    )
    material = client.post(
        "/api/v1/materials", json={"name": "Sand"}, headers=owner_headers
    ).json()

    sup_headers = auth_headers(client, "sup2@buildwise.example")

    ok_resp = client.post(
        "/api/v1/stock/movements",
        json={
            "material_id": material["id"],
            "project_id": site_a["id"],
            "type": "in",
            "quantity": 10,
            "date": "2026-08-01",
        },
        headers=sup_headers,
    )
    assert ok_resp.status_code == 201

    blocked_resp = client.post(
        "/api/v1/stock/movements",
        json={
            "material_id": material["id"],
            "project_id": site_b["id"],
            "type": "in",
            "quantity": 10,
            "date": "2026-08-01",
        },
        headers=sup_headers,
    )
    assert blocked_resp.status_code == 403


def test_accountant_can_record_material_expense(client, db):
    make_user(db, UserRole.owner, "owner3@buildwise.example")
    make_user(db, UserRole.accountant, "acct3@buildwise.example")
    db.flush()
    owner_headers = auth_headers(client, "owner3@buildwise.example")
    site = client.post("/api/v1/projects", json={"name": "Site D"}, headers=owner_headers).json()

    acct_headers = auth_headers(client, "acct3@buildwise.example")
    resp = client.post(
        "/api/v1/material-expenses",
        json={"project_id": site["id"], "amount": 500, "date": "2026-08-05"},
        headers=acct_headers,
    )
    assert resp.status_code == 201, resp.text
