from datetime import date

from pydantic import BaseModel

from app.models.enums import InvoiceStatus, PaymentStatus


class InvoiceReportRow(BaseModel):
    invoice_id: int
    project_id: int
    project_name: str
    client_name: str
    invoice_date: date
    due_date: date | None
    total_amount: float
    amount_received: float
    amount_outstanding: float
    status: InvoiceStatus


class InvoiceReportOut(BaseModel):
    rows: list[InvoiceReportRow]
    total_invoiced: float
    total_received: float
    total_outstanding: float
    overdue_count: int
    unpaid_count: int
    partially_paid_count: int
    paid_count: int


class ProfitabilityRow(BaseModel):
    project_id: int
    project_name: str
    amount_received: float
    labour_cost: float
    material_cost: float
    profit: float


class ProfitabilityReportOut(BaseModel):
    rows: list[ProfitabilityRow]
    total_amount_received: float
    total_labour_cost: float
    total_material_cost: float
    total_profit: float


class AttendanceSummaryRow(BaseModel):
    worker_id: int
    worker_name: str
    project_id: int
    project_name: str
    days_present: float
    days_absent: float
    days_half_day: float
    ot_hours: float


class AttendanceSummaryReportOut(BaseModel):
    rows: list[AttendanceSummaryRow]
    total_days_present: float
    total_days_absent: float
    total_days_half_day: float
    total_ot_hours: float


class PaymentDuesRow(BaseModel):
    payment_id: int
    worker_id: int
    worker_name: str
    week_start: date
    week_end: date
    gross_wage_due: float
    advance_deducted: float
    net_paid: float | None
    status: PaymentStatus
    payment_mode: str | None
    paid_at: date | None


class PaymentDuesReportOut(BaseModel):
    rows: list[PaymentDuesRow]
    total_gross_wage_due: float
    total_net_paid: float
    due_count: int
    paid_count: int


class MaterialExpenseRow(BaseModel):
    project_id: int
    project_name: str
    material_id: int | None
    material_name: str
    category: str | None
    stock_in_cost: float
    direct_expense_amount: float
    total_cost: float


class MaterialExpenseReportOut(BaseModel):
    rows: list[MaterialExpenseRow]
    total_stock_in_cost: float
    total_direct_expense_amount: float
    total_cost: float
