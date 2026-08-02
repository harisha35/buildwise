import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import QuotationStatus


class QuotationLineItemCreate(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    rate: float = Field(ge=0)
    amount: float | None = None


class QuotationLineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    quantity: float
    rate: float
    amount: float
    sort_order: int


class QuotationCreate(BaseModel):
    client_name: str
    project_description: str | None = None
    project_ref_id: int | None = None
    date: datetime.date
    validity_date: datetime.date | None = None
    terms: str | None = None
    line_items: list[QuotationLineItemCreate] = Field(min_length=1)


class QuotationUpdate(BaseModel):
    client_name: str | None = None
    project_description: str | None = None
    project_ref_id: int | None = None
    date: datetime.date | None = None
    validity_date: datetime.date | None = None
    terms: str | None = None
    status: QuotationStatus | None = None
    line_items: list[QuotationLineItemCreate] | None = None


class QuotationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_name: str
    project_description: str | None
    project_ref_id: int | None
    total_amount: float
    date: datetime.date
    validity_date: datetime.date | None
    terms: str | None
    status: QuotationStatus
    created_at: datetime.datetime
    line_items: list[QuotationLineItemOut] = []
