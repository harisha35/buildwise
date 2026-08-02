from datetime import date

from pydantic import BaseModel, ConfigDict


class WorkerTypeCreate(BaseModel):
    name: str
    default_daily_rate: float | None = None
    default_ot_rate: float | None = None


class WorkerTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    default_daily_rate: float | None
    default_ot_rate: float | None
    is_active: bool


class WorkerCreate(BaseModel):
    name: str
    worker_type_id: int | None = None
    phone: str | None = None
    photo_url: str | None = None
    id_proof_number: str | None = None
    id_proof_file_url: str | None = None
    address: str | None = None
    default_daily_rate: float | None = None
    bank_account: str | None = None
    upi_id: str | None = None
    joining_date: date | None = None
    emergency_contact: str | None = None


class WorkerUpdate(BaseModel):
    name: str | None = None
    worker_type_id: int | None = None
    phone: str | None = None
    photo_url: str | None = None
    id_proof_number: str | None = None
    id_proof_file_url: str | None = None
    address: str | None = None
    default_daily_rate: float | None = None
    bank_account: str | None = None
    upi_id: str | None = None
    joining_date: date | None = None
    emergency_contact: str | None = None
    is_active: bool | None = None


class WorkerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    worker_type_id: int | None
    phone: str | None
    photo_url: str | None
    id_proof_number: str | None
    address: str | None
    default_daily_rate: float | None
    bank_account: str | None
    upi_id: str | None
    joining_date: date | None
    emergency_contact: str | None
    is_active: bool
    is_deleted: bool


class ProjectWorkerAssignmentCreate(BaseModel):
    project_id: int
    custom_rate_override: float | None = None
    ot_rate_override: float | None = None


class ProjectWorkerAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    worker_id: int
    project_id: int
    custom_rate_override: float | None
    ot_rate_override: float | None
