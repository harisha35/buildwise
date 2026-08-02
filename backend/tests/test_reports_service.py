from datetime import date

import pytest

from app.models.enums import PaymentMode, StockMovementType
from app.models.invoice import Invoice, InvoiceLineItem, InvoicePayment
from app.models.material import MaterialStockMovement
from app.models.payment import WorkerPayment, WorkerPaymentProjectBreakdown
from app.models.project import Project
from app.services.reports import build_invoice_report, build_profitability_report


@pytest.fixture
def project(db):
    project = Project(name="Site A")
    db.add(project)
    db.flush()
    return project


def test_profitability_report_combines_labour_material_and_invoice_income(db, project):
    invoice = Invoice(
        project_id=project.id,
        client_name="Acme",
        invoice_date=date(2026, 8, 1),
        total_amount=20000,
        line_items=[InvoiceLineItem(description="M1", quantity=1, rate=20000, amount=20000, sort_order=0)],
    )
    db.add(invoice)
    db.flush()
    db.add(InvoicePayment(invoice_id=invoice.id, amount=15000, date=date(2026, 8, 5), mode=PaymentMode.upi))

    payment = WorkerPayment(
        worker_id=_make_worker(db).id,
        week_start=date(2026, 8, 3),
        week_end=date(2026, 8, 9),
        gross_wage_due=6000,
    )
    db.add(payment)
    db.flush()
    db.add(
        WorkerPaymentProjectBreakdown(
            payment_id=payment.id, project_id=project.id, days_present=10, ot_hours=0, amount=6000
        )
    )

    db.add(
        MaterialStockMovement(
            material_id=_make_material(db).id,
            project_id=project.id,
            type=StockMovementType.stock_in,
            quantity=10,
            unit_price=200,
            total_cost=2000,
            date=date(2026, 8, 2),
        )
    )
    db.flush()

    report = build_profitability_report(db, project_ids=None, start_date=None, end_date=None)
    row = next(r for r in report.rows if r.project_id == project.id)
    assert row.amount_received == 15000
    assert row.labour_cost == 6000
    assert row.material_cost == 2000
    assert row.profit == 15000 - 6000 - 2000


def test_profitability_report_date_filter_excludes_out_of_range_payments(db, project):
    invoice = Invoice(
        project_id=project.id,
        client_name="Acme",
        invoice_date=date(2026, 7, 1),
        total_amount=5000,
        line_items=[InvoiceLineItem(description="M1", quantity=1, rate=5000, amount=5000, sort_order=0)],
    )
    db.add(invoice)
    db.flush()
    db.add(InvoicePayment(invoice_id=invoice.id, amount=5000, date=date(2026, 7, 15), mode=PaymentMode.cash))
    db.flush()

    report = build_profitability_report(
        db, project_ids=None, start_date=date(2026, 8, 1), end_date=date(2026, 8, 31)
    )
    row = next(r for r in report.rows if r.project_id == project.id)
    assert row.amount_received == 0


def test_invoice_report_aggregates_totals_and_counts(db, project):
    paid = Invoice(
        project_id=project.id,
        client_name="Acme",
        invoice_date=date(2026, 8, 1),
        total_amount=10000,
        line_items=[InvoiceLineItem(description="M1", quantity=1, rate=10000, amount=10000, sort_order=0)],
    )
    unpaid = Invoice(
        project_id=project.id,
        client_name="Acme",
        invoice_date=date(2026, 8, 2),
        total_amount=3000,
        line_items=[InvoiceLineItem(description="M2", quantity=1, rate=3000, amount=3000, sort_order=0)],
    )
    db.add_all([paid, unpaid])
    db.flush()
    db.add(InvoicePayment(invoice_id=paid.id, amount=10000, date=date(2026, 8, 3), mode=PaymentMode.cash))
    paid.status = "paid"
    db.flush()

    report = build_invoice_report(db, project_ids=None, start_date=None, end_date=None)
    assert report.total_invoiced == 13000
    assert report.total_received == 10000
    assert report.total_outstanding == 3000
    assert report.paid_count == 1
    assert report.unpaid_count == 1


def _make_worker(db):
    from app.models.worker import Worker

    worker = Worker(name="Ravi", default_daily_rate=600)
    db.add(worker)
    db.flush()
    return worker


def _make_material(db):
    from app.models.material import Material

    material = Material(name="Cement")
    db.add(material)
    db.flush()
    return material
