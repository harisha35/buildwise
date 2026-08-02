from datetime import date

from sqlalchemy.orm import Session

from app.models.enums import InvoiceStatus, MilestoneStatus
from app.models.invoice import Invoice, InvoiceLineItem, InvoiceMilestone, Milestone
from app.schemas.invoice import InvoiceCreate, InvoiceLineItemCreate, InvoiceOut, InvoiceUpdate
from app.services.quotations import resolve_line_amount


def _build_line_items(payloads: list[InvoiceLineItemCreate]) -> list[InvoiceLineItem]:
    return [
        InvoiceLineItem(
            description=item.description,
            quantity=item.quantity,
            rate=item.rate,
            amount=resolve_line_amount(item.quantity, item.rate, item.amount),
            sort_order=index,
        )
        for index, item in enumerate(payloads)
    ]


def create_invoice(
    db: Session, payload: InvoiceCreate, milestones: list[Milestone], created_by: int | None
) -> Invoice:
    """FR-7.1/7.2: raise an invoice against zero or more of a project's milestones. Amounts are
    manually entered (FR-7.4) — the total is the sum of the line items the user supplies."""
    line_items = _build_line_items(payload.line_items)
    invoice = Invoice(
        project_id=payload.project_id,
        client_name=payload.client_name,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        total_amount=sum(item.amount for item in line_items),
        created_by=created_by,
        line_items=line_items,
        milestone_links=[InvoiceMilestone(milestone_id=m.id) for m in milestones],
    )
    for milestone in milestones:
        milestone.status = MilestoneStatus.invoiced
    db.add(invoice)
    db.flush()
    return invoice


def update_invoice(db: Session, invoice: Invoice, payload: InvoiceUpdate) -> Invoice:
    for field, value in payload.model_dump(exclude_unset=True, exclude={"line_items"}).items():
        setattr(invoice, field, value)

    if payload.line_items is not None:
        invoice.line_items = _build_line_items(payload.line_items)
        db.flush()
        invoice.total_amount = sum(item.amount for item in invoice.line_items)

    db.flush()
    recompute_status(db, invoice)
    return invoice


def total_received(invoice: Invoice) -> float:
    return sum(float(p.amount) for p in invoice.payments)


def recompute_status(db: Session, invoice: Invoice, reference_date: date | None = None) -> Invoice:
    """FR-7.5: recomputed from Σ(invoice_payments) vs total_amount vs due_date, on every payment
    mutation and by the nightly overdue-sweep job."""
    reference_date = reference_date or date.today()
    received = total_received(invoice)
    total = float(invoice.total_amount)

    if received <= 0:
        base_status = InvoiceStatus.unpaid
    elif received < total:
        base_status = InvoiceStatus.partially_paid
    else:
        base_status = InvoiceStatus.paid

    if (
        base_status != InvoiceStatus.paid
        and invoice.due_date is not None
        and invoice.due_date < reference_date
    ):
        invoice.status = InvoiceStatus.overdue
    else:
        invoice.status = base_status

    if invoice.status == InvoiceStatus.paid:
        for link in invoice.milestone_links:
            link.milestone.status = MilestoneStatus.paid

    db.flush()
    return invoice


def to_invoice_out(invoice: Invoice) -> InvoiceOut:
    received = total_received(invoice)
    return InvoiceOut(
        id=invoice.id,
        project_id=invoice.project_id,
        client_name=invoice.client_name,
        total_amount=float(invoice.total_amount),
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        status=invoice.status,
        created_at=invoice.created_at,
        line_items=list(invoice.line_items),
        milestone_ids=[link.milestone_id for link in invoice.milestone_links],
        payments=list(invoice.payments),
        amount_received=received,
        amount_outstanding=float(invoice.total_amount) - received,
    )


def run_overdue_sweep(db: Session, reference_date: date | None = None) -> int:
    """Nightly job: flip unpaid/partially_paid invoices past due_date to overdue (FR-7.3)."""
    reference_date = reference_date or date.today()
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.status.in_([InvoiceStatus.unpaid, InvoiceStatus.partially_paid]),
            Invoice.due_date.isnot(None),
            Invoice.due_date < reference_date,
        )
        .all()
    )
    for invoice in invoices:
        recompute_status(db, invoice, reference_date)
    return len(invoices)
