from datetime import date

from pydantic import BaseModel

from app.models.enums import InvoiceStatus


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
