from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMode, PaymentStatus


class WorkerAdvanceCreate(BaseModel):
    amount: float = Field(gt=0)
    date: date
    project_id: int | None = None
    note: str | None = None


class WorkerAdvanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    worker_id: int
    project_id: int | None
    amount: float
    date: date
    note: str | None
    outstanding_amount: float


class WorkerPaymentProjectBreakdownOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    days_present: float
    ot_hours: float
    amount: float


class WorkerPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    worker_id: int
    week_start: date
    week_end: date
    gross_wage_due: float
    advance_deducted: float
    net_paid: float | None
    payment_mode: PaymentMode | None
    proof_reference: str | None
    proof_file_url: str | None
    status: PaymentStatus
    paid_at: datetime | None
    breakdown: list[WorkerPaymentProjectBreakdownOut] = []


class MarkPaidRequest(BaseModel):
    advance_deduction_amount: float = Field(default=0, ge=0)
    payment_mode: PaymentMode
    proof_reference: str | None = None
    proof_file_url: str | None = None


class LedgerEntry(BaseModel):
    date: date
    type: str  # wage | advance_given | advance_deducted | payment
    description: str
    debit: float = 0
    credit: float = 0


class WorkerLedgerOut(BaseModel):
    worker_id: int
    entries: list[LedgerEntry]
    outstanding_advance_balance: float
