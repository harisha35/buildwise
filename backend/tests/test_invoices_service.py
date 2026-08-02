from datetime import date

import pytest

from app.models.enums import InvoiceStatus, MilestoneStatus, PaymentMode
from app.models.invoice import Invoice, InvoiceLineItem, InvoiceMilestone, InvoicePayment, Milestone
from app.models.project import Project
from app.schemas.invoice import InvoiceLineItemCreate, InvoiceUpdate
from app.schemas.quotation import QuotationLineItemCreate
from app.services.invoices import (
    recompute_status,
    resolve_line_amount,
    run_overdue_sweep,
    total_received,
    update_invoice,
)


@pytest.fixture
def project(db):
    project = Project(name="Site A")
    db.add(project)
    db.flush()
    return project


@pytest.fixture
def invoice(db, project):
    invoice = Invoice(
        project_id=project.id,
        client_name="Acme Corp",
        invoice_date=date(2026, 8, 1),
        due_date=date(2026, 8, 10),
        total_amount=10000,
        line_items=[
            InvoiceLineItem(description="Milestone 1", quantity=1, rate=10000, amount=10000, sort_order=0)
        ],
    )
    db.add(invoice)
    db.flush()
    return invoice


def test_resolve_line_amount_defaults_to_quantity_times_rate():
    assert resolve_line_amount(quantity=2, rate=500, amount=None) == 1000


def test_resolve_line_amount_respects_explicit_override():
    assert resolve_line_amount(quantity=2, rate=500, amount=1200) == 1200


def test_recompute_status_unpaid_with_no_payments(db, invoice):
    recompute_status(db, invoice, reference_date=date(2026, 8, 5))
    assert invoice.status == InvoiceStatus.unpaid


def test_recompute_status_partially_paid(db, invoice):
    db.add(InvoicePayment(invoice_id=invoice.id, amount=4000, date=date(2026, 8, 3), mode=PaymentMode.upi))
    db.flush()
    db.refresh(invoice)
    recompute_status(db, invoice, reference_date=date(2026, 8, 5))
    assert invoice.status == InvoiceStatus.partially_paid
    assert total_received(invoice) == 4000


def test_recompute_status_paid_marks_linked_milestones_paid(db, invoice, project):
    milestone = Milestone(
        project_id=project.id, name="Foundation", amount=10000, status=MilestoneStatus.invoiced
    )
    db.add(milestone)
    db.flush()
    db.add(InvoiceMilestone(invoice_id=invoice.id, milestone_id=milestone.id))
    db.add(
        InvoicePayment(
            invoice_id=invoice.id, amount=10000, date=date(2026, 8, 3), mode=PaymentMode.bank_transfer
        )
    )
    db.flush()
    db.refresh(invoice)

    recompute_status(db, invoice, reference_date=date(2026, 8, 5))
    assert invoice.status == InvoiceStatus.paid
    assert milestone.status == MilestoneStatus.paid


def test_recompute_status_overdue_when_unpaid_past_due_date(db, invoice):
    recompute_status(db, invoice, reference_date=date(2026, 8, 20))
    assert invoice.status == InvoiceStatus.overdue


def test_recompute_status_fully_paid_is_never_overdue(db, invoice):
    db.add(InvoicePayment(invoice_id=invoice.id, amount=10000, date=date(2026, 8, 3), mode=PaymentMode.cash))
    db.flush()
    db.refresh(invoice)
    recompute_status(db, invoice, reference_date=date(2026, 8, 20))
    assert invoice.status == InvoiceStatus.paid


def test_overdue_sweep_flips_unpaid_invoices_past_due_date(db, invoice):
    flipped = run_overdue_sweep(db, reference_date=date(2026, 8, 20))
    assert flipped == 1
    assert invoice.status == InvoiceStatus.overdue


def test_overdue_sweep_ignores_invoices_within_due_date(db, invoice):
    flipped = run_overdue_sweep(db, reference_date=date(2026, 8, 5))
    assert flipped == 0
    assert invoice.status == InvoiceStatus.unpaid


def test_update_invoice_replaces_line_items_and_recomputes_total(db, invoice):
    update_invoice(
        db,
        invoice,
        InvoiceUpdate(
            line_items=[
                InvoiceLineItemCreate(description="Revised scope", quantity=2, rate=3000),
                InvoiceLineItemCreate(description="Extra work", quantity=1, rate=1500),
            ]
        ),
    )
    assert float(invoice.total_amount) == 7500
    assert [item.description for item in invoice.line_items] == ["Revised scope", "Extra work"]


def test_update_invoice_recomputes_status_after_line_item_change(db, invoice):
    db.add(InvoicePayment(invoice_id=invoice.id, amount=10000, date=date(2026, 8, 3), mode=PaymentMode.cash))
    db.flush()
    db.refresh(invoice)
    assert recompute_status(db, invoice, reference_date=date(2026, 8, 5)).status == InvoiceStatus.paid

    # Lowering the total below what's already been received keeps it paid, not overdue.
    update_invoice(
        db,
        invoice,
        InvoiceUpdate(line_items=[InvoiceLineItemCreate(description="Reduced", quantity=1, rate=5000)]),
    )
    assert invoice.status == InvoiceStatus.paid


def test_quotation_line_item_schema_shares_amount_resolution():
    item = QuotationLineItemCreate(description="Excavation", quantity=10, rate=500)
    assert resolve_line_amount(item.quantity, item.rate, item.amount) == 5000


def test_invoice_line_item_schema_shares_amount_resolution():
    item = InvoiceLineItemCreate(description="Excavation", quantity=10, rate=500)
    assert resolve_line_amount(item.quantity, item.rate, item.amount) == 5000
