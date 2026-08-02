from sqlalchemy.orm import Session

from app.models.quotation import Quotation, QuotationLineItem
from app.schemas.quotation import QuotationCreate, QuotationLineItemCreate, QuotationUpdate


def resolve_line_amount(quantity: float, rate: float, amount: float | None) -> float:
    """FR-6.2: line amount is either supplied directly or derived from quantity * rate."""
    if amount is not None:
        return amount
    return round(quantity * rate, 2)


def _build_line_items(payloads: list[QuotationLineItemCreate]) -> list[QuotationLineItem]:
    return [
        QuotationLineItem(
            description=item.description,
            quantity=item.quantity,
            rate=item.rate,
            amount=resolve_line_amount(item.quantity, item.rate, item.amount),
            sort_order=index,
        )
        for index, item in enumerate(payloads)
    ]


def create_quotation(db: Session, payload: QuotationCreate, created_by: int | None) -> Quotation:
    line_items = _build_line_items(payload.line_items)
    quotation = Quotation(
        client_name=payload.client_name,
        project_description=payload.project_description,
        project_ref_id=payload.project_ref_id,
        date=payload.date,
        validity_date=payload.validity_date,
        terms=payload.terms,
        total_amount=sum(item.amount for item in line_items),
        created_by=created_by,
        line_items=line_items,
    )
    db.add(quotation)
    db.flush()
    return quotation


def update_quotation(db: Session, quotation: Quotation, payload: QuotationUpdate) -> Quotation:
    for field, value in payload.model_dump(exclude_unset=True, exclude={"line_items"}).items():
        setattr(quotation, field, value)

    if payload.line_items is not None:
        quotation.line_items = _build_line_items(payload.line_items)
        db.flush()
        quotation.total_amount = sum(item.amount for item in quotation.line_items)

    db.flush()
    return quotation
