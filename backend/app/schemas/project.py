from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import ContractType, ProjectStatus


class ProjectTypeCreate(BaseModel):
    name: str


class ProjectTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool


class ProjectCreate(BaseModel):
    name: str
    client_name: str | None = None
    client_contact: str | None = None
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    project_type_id: int | None = None
    contract_type: ContractType | None = None
    budget: float | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    client_name: str | None = None
    client_contact: str | None = None
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    project_type_id: int | None = None
    contract_type: ContractType | None = None
    budget: float | None = None
    status: ProjectStatus | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    client_name: str | None
    client_contact: str | None
    location: str | None
    start_date: date | None
    end_date: date | None
    project_type_id: int | None
    contract_type: ContractType | None
    budget: float | None
    status: ProjectStatus
    is_deleted: bool


class SupervisorAssignmentCreate(BaseModel):
    user_id: int
