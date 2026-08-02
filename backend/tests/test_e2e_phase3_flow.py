"""Exit criteria (docs/implementation-plan.md §9, Phase 3):
full quotation-to-paid-invoice flow demoable with PDFs matching the "clean, no-GST" spec.
"""

from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_full_phase3_flow(client, db):
    make_user(db, UserRole.owner, "owner@buildwise.example")
    db.flush()
    headers = auth_headers(client, "owner@buildwise.example")

    # Pre-sales quotation (FR-6.1/6.2)
    quotation_resp = client.post(
        "/api/v1/quotations",
        json={
            "client_name": "Acme Corp",
            "project_description": "Warehouse extension",
            "date": "2026-08-01",
            "validity_date": "2026-09-01",
            "terms": "50% advance, balance on completion.",
            "line_items": [
                {"description": "Excavation", "quantity": 100, "rate": 500},
                {"description": "Concreting", "quantity": 1, "rate": 100000},
            ],
        },
        headers=headers,
    )
    assert quotation_resp.status_code == 201, quotation_resp.text
    quotation = quotation_resp.json()
    assert quotation["total_amount"] == 150000
    assert quotation["status"] == "draft"

    accept_resp = client.patch(
        f"/api/v1/quotations/{quotation['id']}", json={"status": "accepted"}, headers=headers
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "accepted"

    pdf_resp = client.get(f"/api/v1/quotations/{quotation['id']}/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content[:4] == b"%PDF"

    # Work begins: project created independently, milestone defined mid-project (FR-7.1)
    project = client.post("/api/v1/projects", json={"name": "Warehouse Site"}, headers=headers).json()
    milestone_resp = client.post(
        f"/api/v1/projects/{project['id']}/milestones",
        json={"name": "Foundation complete", "amount": 60000},
        headers=headers,
    )
    assert milestone_resp.status_code == 201
    milestone = milestone_resp.json()
    assert milestone["status"] == "pending"

    # Invoice raised against the milestone (FR-7.2/7.3), amount manually entered (FR-7.4)
    invoice_resp = client.post(
        "/api/v1/invoices",
        json={
            "project_id": project["id"],
            "client_name": "Acme Corp",
            "invoice_date": "2026-08-15",
            "due_date": "2026-08-30",
            "milestone_ids": [milestone["id"]],
            "line_items": [{"description": "Foundation complete", "quantity": 1, "rate": 60000}],
        },
        headers=headers,
    )
    assert invoice_resp.status_code == 201, invoice_resp.text
    invoice = invoice_resp.json()
    assert invoice["total_amount"] == 60000
    assert invoice["status"] == "unpaid"

    milestone_after = client.get(
        f"/api/v1/projects/{project['id']}/milestones", headers=headers
    ).json()[0]
    assert milestone_after["status"] == "invoiced"

    # Partial payment received (FR-7.5)
    partial_resp = client.post(
        f"/api/v1/invoices/{invoice['id']}/payments",
        json={"amount": 20000, "date": "2026-08-16", "mode": "bank_transfer", "note": "First installment"},
        headers=headers,
    )
    assert partial_resp.status_code == 201, partial_resp.text
    assert partial_resp.json()["status"] == "partially_paid"
    assert partial_resp.json()["amount_outstanding"] == 40000

    # Remaining balance paid in full
    final_resp = client.post(
        f"/api/v1/invoices/{invoice['id']}/payments",
        json={"amount": 40000, "date": "2026-08-20", "mode": "upi"},
        headers=headers,
    )
    assert final_resp.status_code == 201
    assert final_resp.json()["status"] == "paid"
    assert final_resp.json()["amount_outstanding"] == 0

    milestone_final = client.get(
        f"/api/v1/projects/{project['id']}/milestones", headers=headers
    ).json()[0]
    assert milestone_final["status"] == "paid"

    invoice_pdf_resp = client.get(f"/api/v1/invoices/{invoice['id']}/pdf", headers=headers)
    assert invoice_pdf_resp.status_code == 200
    assert invoice_pdf_resp.content[:4] == b"%PDF"

    # Reports (FR-8.3)
    invoice_report = client.get("/api/v1/reports/invoices", headers=headers).json()
    assert invoice_report["total_received"] == 60000
    assert invoice_report["paid_count"] == 1

    profitability = client.get(
        "/api/v1/reports/profitability", params={"project_id": project["id"]}, headers=headers
    ).json()
    assert profitability["rows"][0]["amount_received"] == 60000


def test_supervisor_cannot_access_quotations_or_invoices(client, db):
    make_user(db, UserRole.owner, "owner2@buildwise.example")
    make_user(db, UserRole.supervisor, "sup2@buildwise.example")
    db.flush()
    sup_headers = auth_headers(client, "sup2@buildwise.example")

    assert client.get("/api/v1/quotations", headers=sup_headers).status_code == 403
    assert client.get("/api/v1/invoices", headers=sup_headers).status_code == 403


def test_accountant_can_manage_invoices_and_reports(client, db):
    make_user(db, UserRole.owner, "owner3@buildwise.example")
    make_user(db, UserRole.accountant, "acct3@buildwise.example")
    db.flush()
    owner_headers = auth_headers(client, "owner3@buildwise.example")
    acct_headers = auth_headers(client, "acct3@buildwise.example")

    project = client.post("/api/v1/projects", json={"name": "Site Z"}, headers=owner_headers).json()
    invoice_resp = client.post(
        "/api/v1/invoices",
        json={
            "project_id": project["id"],
            "client_name": "Client Z",
            "invoice_date": "2026-08-01",
            "line_items": [{"description": "Work done", "quantity": 1, "rate": 5000}],
        },
        headers=acct_headers,
    )
    assert invoice_resp.status_code == 201, invoice_resp.text
    assert client.get("/api/v1/reports/profitability", headers=acct_headers).status_code == 200
