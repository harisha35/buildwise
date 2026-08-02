from datetime import date

import pytest

from app.models.enums import AttendanceStatus, PaymentMode, PaymentStatus, StockMovementType
from app.models.invoice import Invoice, InvoiceLineItem, InvoicePayment
from app.models.material import MaterialExpense, MaterialStockMovement
from app.models.payment import WorkerPayment, WorkerPaymentProjectBreakdown
from app.models.project import Project
from app.services.reports import (
    build_attendance_summary_report,
    build_invoice_report,
    build_material_expense_report,
    build_payment_dues_report,
    build_profitability_report,
)


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


def test_attendance_summary_report_aggregates_per_worker_per_project(db, project):
    from app.models.attendance import Attendance

    worker = _make_worker(db)
    db.add_all(
        [
            Attendance(
                worker_id=worker.id,
                project_id=project.id,
                date=date(2026, 8, 3),
                status=AttendanceStatus.present,
                ot_hours=2,
                applicable_rate=600,
                ot_rate=100,
            ),
            Attendance(
                worker_id=worker.id,
                project_id=project.id,
                date=date(2026, 8, 4),
                status=AttendanceStatus.half_day,
                applicable_rate=600,
                ot_rate=100,
            ),
            Attendance(
                worker_id=worker.id,
                project_id=project.id,
                date=date(2026, 8, 5),
                status=AttendanceStatus.absent,
                applicable_rate=600,
                ot_rate=100,
            ),
        ]
    )
    db.flush()

    report = build_attendance_summary_report(db, project_ids=None, start_date=None, end_date=None)
    row = next(r for r in report.rows if r.worker_id == worker.id)
    assert row.days_present == 1
    assert row.days_half_day == 1
    assert row.days_absent == 1
    assert row.ot_hours == 2
    assert report.total_days_present == 1


def test_attendance_summary_report_date_filter(db, project):
    from app.models.attendance import Attendance

    worker = _make_worker(db)
    db.add(
        Attendance(
            worker_id=worker.id,
            project_id=project.id,
            date=date(2026, 7, 1),
            status=AttendanceStatus.present,
            applicable_rate=600,
            ot_rate=100,
        )
    )
    db.flush()

    report = build_attendance_summary_report(
        db, project_ids=None, start_date=date(2026, 8, 1), end_date=date(2026, 8, 31)
    )
    assert report.rows == []


def test_payment_dues_report_filters_by_status(db, project):
    worker = _make_worker(db)
    due_payment = WorkerPayment(
        worker_id=worker.id, week_start=date(2026, 8, 3), week_end=date(2026, 8, 9), gross_wage_due=6000
    )
    paid_payment = WorkerPayment(
        worker_id=worker.id,
        week_start=date(2026, 7, 27),
        week_end=date(2026, 8, 2),
        gross_wage_due=5000,
        net_paid=5000,
        status=PaymentStatus.paid,
        payment_mode=PaymentMode.cash,
    )
    db.add_all([due_payment, paid_payment])
    db.flush()
    db.add(
        WorkerPaymentProjectBreakdown(
            payment_id=due_payment.id, project_id=project.id, days_present=10, ot_hours=0, amount=6000
        )
    )
    db.flush()

    report = build_payment_dues_report(db, project_ids=None, start_date=None, end_date=None)
    assert report.due_count == 1
    assert report.paid_count == 1
    assert report.total_gross_wage_due == 11000

    due_only = build_payment_dues_report(
        db, project_ids=None, start_date=None, end_date=None, status_filter=PaymentStatus.due
    )
    assert len(due_only.rows) == 1
    assert due_only.rows[0].payment_id == due_payment.id


def test_payment_dues_report_scoped_by_project(db, project):
    other_project = Project(name="Site B")
    db.add(other_project)
    db.flush()

    worker = _make_worker(db)
    payment = WorkerPayment(
        worker_id=worker.id, week_start=date(2026, 8, 3), week_end=date(2026, 8, 9), gross_wage_due=6000
    )
    db.add(payment)
    db.flush()
    db.add(
        WorkerPaymentProjectBreakdown(
            payment_id=payment.id, project_id=other_project.id, days_present=10, ot_hours=0, amount=6000
        )
    )
    db.flush()

    scoped_to_project = build_payment_dues_report(
        db, project_ids=[project.id], start_date=None, end_date=None
    )
    assert scoped_to_project.rows == []

    scoped_to_other = build_payment_dues_report(
        db, project_ids=[other_project.id], start_date=None, end_date=None
    )
    assert len(scoped_to_other.rows) == 1


def test_material_expense_report_combines_stock_in_and_direct_expenses(db, project):
    material = _make_material(db)
    db.add(
        MaterialStockMovement(
            material_id=material.id,
            project_id=project.id,
            type=StockMovementType.stock_in,
            quantity=10,
            unit_price=350,
            total_cost=3500,
            date=date(2026, 8, 1),
        )
    )
    db.add(
        MaterialExpense(
            project_id=project.id, material_id=material.id, amount=500, date=date(2026, 8, 2)
        )
    )
    db.flush()

    report = build_material_expense_report(db, project_ids=None, start_date=None, end_date=None)
    row = next(r for r in report.rows if r.material_id == material.id)
    assert row.stock_in_cost == 3500
    assert row.direct_expense_amount == 500
    assert row.total_cost == 4000
    assert report.total_cost == 4000


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
