from datetime import date

from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.enums import AttendanceStatus, PaymentStatus, ProjectStatus
from app.models.payment import WorkerPayment
from app.models.project import Project
from app.schemas.dashboard import AttendanceSummary, DashboardSummary
from app.services.materials import material_spend_total
from app.services.payments import week_bounds


def build_dashboard_summary(
    db: Session, project_ids: list[int] | None, today: date
) -> DashboardSummary:
    project_query = db.query(Project).filter(
        Project.is_deleted.is_(False), Project.status != ProjectStatus.completed
    )
    if project_ids is not None:
        project_query = project_query.filter(Project.id.in_(project_ids or [-1]))
    active_projects_count = project_query.count()

    attendance_query = db.query(Attendance).filter(Attendance.date == today)
    if project_ids is not None:
        attendance_query = attendance_query.filter(Attendance.project_id.in_(project_ids or [-1]))
    todays_attendance = attendance_query.all()

    summary = AttendanceSummary(present=0, absent=0, half_day=0)
    for row in todays_attendance:
        if row.status == AttendanceStatus.present:
            summary.present += 1
        elif row.status == AttendanceStatus.absent:
            summary.absent += 1
        elif row.status == AttendanceStatus.half_day:
            summary.half_day += 1

    week_start, _ = week_bounds(today)
    due_query = db.query(WorkerPayment).filter(
        WorkerPayment.week_start == week_start, WorkerPayment.status == PaymentStatus.due
    )
    due_payments = due_query.all()

    return DashboardSummary(
        active_projects_count=active_projects_count,
        todays_attendance=summary,
        payments_due_this_week_total=sum(float(p.gross_wage_due) for p in due_payments),
        payments_due_this_week_count=len(due_payments),
        material_spend_total=material_spend_total(db, project_ids),
    )
