from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import accessible_project_ids, require_capability
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import build_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("dashboard:read")),
) -> DashboardSummary:
    project_ids = accessible_project_ids(db, current_user)
    return build_dashboard_summary(db, project_ids, date.today())
