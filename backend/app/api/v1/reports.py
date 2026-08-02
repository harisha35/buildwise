from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import accessible_project_ids, check_project_access, require_capability
from app.db.session import get_db
from app.models.enums import InvoiceStatus
from app.models.user import User
from app.schemas.report import InvoiceReportOut, ProfitabilityReportOut
from app.services.reports import build_invoice_report, build_profitability_report

router = APIRouter(prefix="/reports", tags=["reports"])


def _resolve_scope(db: Session, current_user: User, project_id: int | None) -> list[int] | None:
    """Single project (if given, after an access check) or the caller's full accessible scope."""
    if project_id is not None:
        check_project_access(db, current_user, project_id)
        return [project_id]
    return accessible_project_ids(db, current_user)


@router.get("/profitability", response_model=ProfitabilityReportOut)
def profitability_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> ProfitabilityReportOut:
    scope = _resolve_scope(db, current_user, project_id)
    return build_profitability_report(db, scope, start_date, end_date)


@router.get("/invoices", response_model=InvoiceReportOut)
def invoice_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    status_filter: InvoiceStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> InvoiceReportOut:
    scope = _resolve_scope(db, current_user, project_id)
    return build_invoice_report(db, scope, start_date, end_date, status_filter)
