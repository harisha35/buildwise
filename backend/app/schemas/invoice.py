from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import InvoiceStatus, MilestoneStatus, PaymentMode


class MilestoneCreate(BaseModel):
    name: str
    description: str | None = None
    amount: float = Field(gt=0)


class MilestoneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    amount: float | None = None
    status: MilestoneStatus | None = None


class MilestoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None
    amount: float
    status: MilestoneStatus


class InvoiceLineItemCreate(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    rate: float = Field(ge=0)
    amount: float | None = None


class InvoiceLineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    quantity: float
    rate: float
    amount: float
    sort_order: int


class InvoiceCreate(BaseModel):
    project_id: int
    client_name: str
    invoice_date: date
    due_date: date | None = None
    milestone_ids: list[int] = []
    line_items: list[InvoiceLineItemCreate] = Field(min_length=1)


class InvoiceUpdate(BaseModel):
    client_name: str | None = None
    due_date: date | None = None
    line_items: list[InvoiceLineItemCreate] | None = None


class InvoicePaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    date: date
    mode: PaymentMode
    note: str | None = None


class InvoicePaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_id: int
    amount: float
    date: date
    mode: PaymentMode
    note: str | None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    client_name: str
    total_amount: float
    invoice_date: date
    due_date: date | None
    status: InvoiceStatus
    created_at: datetime
    line_items: list[InvoiceLineItemOut] = []
    milestone_ids: list[int] = []
    payments: list[InvoicePaymentOut] = []
    amount_received: float = 0
    amount_outstanding: float = 0
