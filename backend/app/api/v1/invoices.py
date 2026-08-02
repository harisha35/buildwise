from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_capability
from app.db.session import get_db
from app.models.enums import InvoiceStatus
from app.models.invoice import Invoice, InvoicePayment, Milestone
from app.models.project import Project
from app.models.user import User
from app.pdf.render import render_pdf
from app.schemas.invoice import InvoiceCreate, InvoiceOut, InvoicePaymentCreate, InvoiceUpdate
from app.services.invoices import (
    create_invoice,
    recompute_status,
    run_overdue_sweep,
    to_invoice_out,
    update_invoice,
)

router = APIRouter(tags=["invoices"])


def _load_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.line_items),
            joinedload(Invoice.milestone_links),
            joinedload(Invoice.payments),
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


def _resolve_milestones(db: Session, project_id: int, milestone_ids: list[int]) -> list[Milestone]:
    if not milestone_ids:
        return []
    milestones = (
        db.query(Milestone)
        .filter(Milestone.id.in_(milestone_ids), Milestone.project_id == project_id)
        .all()
    )
    if len(milestones) != len(set(milestone_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more milestones were not found on this project",
        )
    return milestones


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(
    project_id: int | None = None,
    status_filter: InvoiceStatus | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("invoices:read")),
) -> list[InvoiceOut]:
    query = db.query(Invoice).options(
        joinedload(Invoice.line_items), joinedload(Invoice.milestone_links), joinedload(Invoice.payments)
    )
    if project_id is not None:
        query = query.filter(Invoice.project_id == project_id)
    if status_filter is not None:
        query = query.filter(Invoice.status == status_filter)
    invoices = query.order_by(Invoice.invoice_date.desc()).all()
    return [to_invoice_out(invoice) for invoice in invoices]


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("invoices:read")),
) -> InvoiceOut:
    return to_invoice_out(_load_invoice(db, invoice_id))


@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice_route(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("invoices:write")),
) -> InvoiceOut:
    project = db.get(Project, payload.project_id)
    if project is None or project.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    milestones = _resolve_milestones(db, payload.project_id, payload.milestone_ids)
    invoice = create_invoice(db, payload, milestones, current_user.id)
    db.commit()
    return to_invoice_out(_load_invoice(db, invoice.id))


@router.patch("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice_route(
    invoice_id: int,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("invoices:write")),
) -> InvoiceOut:
    invoice = _load_invoice(db, invoice_id)
    update_invoice(db, invoice, payload)
    db.commit()
    return to_invoice_out(_load_invoice(db, invoice.id))


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=InvoiceOut,
    status_code=status.HTTP_201_CREATED,
)
def record_invoice_payment(
    invoice_id: int,
    payload: InvoicePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("invoice_payments:write")),
) -> InvoiceOut:
    """FR-7.5: partial payments supported; invoice status auto-updates from Σ(payments) vs total."""
    invoice = _load_invoice(db, invoice_id)
    payment = InvoicePayment(
        invoice_id=invoice.id,
        amount=payload.amount,
        date=payload.date,
        mode=payload.mode,
        note=payload.note,
        recorded_by=current_user.id,
    )
    db.add(payment)
    db.flush()
    invoice.payments.append(payment)
    recompute_status(db, invoice)
    db.commit()
    return to_invoice_out(_load_invoice(db, invoice.id))


@router.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("invoices:read")),
) -> Response:
    invoice = _load_invoice(db, invoice_id)
    invoice_out = to_invoice_out(invoice)
    milestone_names = [link.milestone.name for link in invoice.milestone_links]
    pdf_bytes = render_pdf(
        "invoice.html",
        {
            "invoice": invoice_out,
            "project_name": invoice.project.name,
            "milestone_names": milestone_names,
        },
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{invoice.id}.pdf"'},
    )


@router.post("/admin/jobs/run-invoice-overdue-sweep")
def run_invoice_overdue_sweep_now(
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("invoices:write")),
) -> dict[str, int]:
    flipped = run_overdue_sweep(db)
    db.commit()
    return {"flipped_to_overdue": flipped}
