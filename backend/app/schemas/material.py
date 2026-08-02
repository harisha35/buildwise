from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StockMovementType


class UnitOfMeasureCreate(BaseModel):
    code: str
    label: str


class UnitOfMeasureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str


class SupplierCreate(BaseModel):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    contact_person: str | None
    phone: str | None
    address: str | None
    notes: str | None
    is_active: bool


class MaterialCreate(BaseModel):
    name: str
    category: str | None = None
    unit_id: int | None = None
    default_supplier_id: int | None = None
    default_unit_price: float | None = None


class MaterialUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit_id: int | None = None
    default_supplier_id: int | None = None
    default_unit_price: float | None = None
    is_active: bool | None = None


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str | None
    unit_id: int | None
    default_supplier_id: int | None
    default_unit_price: float | None
    is_active: bool


class StockMovementCreate(BaseModel):
    material_id: int
    project_id: int
    type: StockMovementType
    quantity: float = Field(gt=0)
    unit_price: float | None = None
    total_cost: float | None = None
    supplier_id: int | None = None
    date: date
    note: str | None = None


class StockMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    material_id: int
    project_id: int
    type: StockMovementType
    quantity: float
    unit_price: float | None
    total_cost: float | None
    supplier_id: int | None
    date: date
    note: str | None


class MaterialStockBalanceOut(BaseModel):
    material_id: int
    material_name: str
    unit_label: str | None
    project_id: int
    quantity_in: float
    quantity_out: float
    quantity_wastage: float
    current_stock: float


class MaterialExpenseCreate(BaseModel):
    project_id: int
    material_id: int | None = None
    supplier_id: int | None = None
    amount: float = Field(gt=0)
    date: date
    note: str | None = None


class MaterialExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    material_id: int | None
    supplier_id: int | None
    amount: float
    date: date
    note: str | None
