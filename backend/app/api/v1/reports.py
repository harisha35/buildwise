from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.core.deps import accessible_project_ids, check_project_access, require_capability
from app.db.session import get_db
from app.models.enums import InvoiceStatus, PaymentStatus
from app.models.user import User
from app.schemas.report import (
    AttendanceSummaryReportOut,
    InvoiceReportOut,
    MaterialExpenseReportOut,
    PaymentDuesReportOut,
    ProfitabilityReportOut,
)
from app.services.csv_export import rows_to_csv
from app.services.reports import (
    build_attendance_summary_report,
    build_invoice_report,
    build_material_expense_report,
    build_payment_dues_report,
    build_profitability_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])

ReportFormat = Literal["json", "csv"]

PROFITABILITY_FIELDS = [
    "project_id", "project_name", "amount_received", "labour_cost", "material_cost", "profit",
]
INVOICE_FIELDS = [
    "invoice_id", "project_id", "project_name", "client_name", "invoice_date", "due_date",
    "total_amount", "amount_received", "amount_outstanding", "status",
]
ATTENDANCE_FIELDS = [
    "worker_id", "worker_name", "project_id", "project_name",
    "days_present", "days_absent", "days_half_day", "ot_hours",
]
PAYMENT_DUES_FIELDS = [
    "payment_id", "worker_id", "worker_name", "week_start", "week_end",
    "gross_wage_due", "advance_deducted", "net_paid", "status", "payment_mode", "paid_at",
]
MATERIAL_EXPENSE_FIELDS = [
    "project_id", "project_name", "material_id", "material_name", "category",
    "stock_in_cost", "direct_expense_amount", "total_cost",
]


def _resolve_scope(db: Session, current_user: User, project_id: int | None) -> list[int] | None:
    """Single project (if given, after an access check) or the caller's full accessible scope."""
    if project_id is not None:
        check_project_access(db, current_user, project_id)
        return [project_id]
    return accessible_project_ids(db, current_user)


def _csv_response(filename: str, fieldnames: list[str], rows: list) -> Response:
    return PlainTextResponse(
        content=rows_to_csv(fieldnames, rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/profitability", response_model=ProfitabilityReportOut)
def profitability_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    format: ReportFormat = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> ProfitabilityReportOut | Response:
    scope = _resolve_scope(db, current_user, project_id)
    report = build_profitability_report(db, scope, start_date, end_date)
    if format == "csv":
        return _csv_response("profitability-report.csv", PROFITABILITY_FIELDS, report.rows)
    return report


@router.get("/invoices", response_model=InvoiceReportOut)
def invoice_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    status_filter: InvoiceStatus | None = None,
    format: ReportFormat = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> InvoiceReportOut | Response:
    scope = _resolve_scope(db, current_user, project_id)
    report = build_invoice_report(db, scope, start_date, end_date, status_filter)
    if format == "csv":
        return _csv_response("invoice-report.csv", INVOICE_FIELDS, report.rows)
    return report


@router.get("/attendance", response_model=AttendanceSummaryReportOut)
def attendance_summary_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    format: ReportFormat = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> AttendanceSummaryReportOut | Response:
    """FR-8.3 Attendance Summary."""
    scope = _resolve_scope(db, current_user, project_id)
    report = build_attendance_summary_report(db, scope, start_date, end_date)
    if format == "csv":
        return _csv_response("attendance-summary-report.csv", ATTENDANCE_FIELDS, report.rows)
    return report


@router.get("/payments", response_model=PaymentDuesReportOut)
def payment_dues_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    status_filter: PaymentStatus | None = None,
    format: ReportFormat = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> PaymentDuesReportOut | Response:
    """FR-8.3 Payment Dues & History."""
    scope = _resolve_scope(db, current_user, project_id)
    report = build_payment_dues_report(db, scope, start_date, end_date, status_filter)
    if format == "csv":
        return _csv_response("payment-dues-report.csv", PAYMENT_DUES_FIELDS, report.rows)
    return report


@router.get("/materials", response_model=MaterialExpenseReportOut)
def material_expense_report(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    format: ReportFormat = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("reports:read")),
) -> MaterialExpenseReportOut | Response:
    """FR-8.3 Material Expense Report."""
    scope = _resolve_scope(db, current_user, project_id)
    report = build_material_expense_report(db, scope, start_date, end_date)
    if format == "csv":
        return _csv_response("material-expense-report.csv", MATERIAL_EXPENSE_FIELDS, report.rows)
    return report
