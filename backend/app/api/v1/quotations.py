from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import require_capability
from app.db.session import get_db
from app.models.enums import QuotationStatus
from app.models.quotation import Quotation
from app.models.user import User
from app.pdf.render import render_pdf
from app.schemas.quotation import QuotationCreate, QuotationOut, QuotationUpdate
from app.services.quotations import create_quotation, update_quotation

router = APIRouter(prefix="/quotations", tags=["quotations"])


@router.get("", response_model=list[QuotationOut])
def list_quotations(
    status_filter: QuotationStatus | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("quotations:read")),
) -> list[Quotation]:
    query = db.query(Quotation)
    if status_filter is not None:
        query = query.filter(Quotation.status == status_filter)
    return query.order_by(Quotation.date.desc()).all()


@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("quotations:read")),
) -> Quotation:
    quotation = db.get(Quotation, quotation_id)
    if quotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    return quotation


@router.post("", response_model=QuotationOut, status_code=status.HTTP_201_CREATED)
def create_quotation_route(
    payload: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("quotations:write")),
) -> Quotation:
    quotation = create_quotation(db, payload, current_user.id)
    db.commit()
    db.refresh(quotation)
    return quotation


@router.patch("/{quotation_id}", response_model=QuotationOut)
def update_quotation_route(
    quotation_id: int,
    payload: QuotationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("quotations:write")),
) -> Quotation:
    quotation = db.get(Quotation, quotation_id)
    if quotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    update_quotation(db, quotation, payload)
    db.commit()
    db.refresh(quotation)
    return quotation


@router.get("/{quotation_id}/pdf")
def get_quotation_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("quotations:read")),
) -> Response:
    quotation = db.get(Quotation, quotation_id)
    if quotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    pdf_bytes = render_pdf("quotation.html", {"quotation": QuotationOut.model_validate(quotation)})
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="quotation-{quotation.id}.pdf"'},
    )
