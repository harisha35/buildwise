from pydantic import BaseModel


class AttendanceSummary(BaseModel):
    present: int
    absent: int
    half_day: int


class DashboardSummary(BaseModel):
    active_projects_count: int
    todays_attendance: AttendanceSummary
    payments_due_this_week_total: float
    payments_due_this_week_count: int
    overdue_invoices_count: int
    overdue_invoices_total: float
    material_spend_total: float
