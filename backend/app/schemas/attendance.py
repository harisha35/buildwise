from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceStatus


class AttendanceEntry(BaseModel):
    worker_id: int
    status: AttendanceStatus
    ot_hours: float = Field(default=0, ge=0)
    applicable_rate: float | None = None
    ot_rate: float | None = None
    override_warning: bool = False


class AttendanceBulkUpsert(BaseModel):
    project_id: int
    date: date
    entries: list[AttendanceEntry]


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    worker_id: int
    project_id: int
    date: date
    status: AttendanceStatus
    ot_hours: float
    applicable_rate: float
    ot_rate: float
    recorded_by: int | None


class AttendanceUpsertResult(BaseModel):
    saved: list[AttendanceOut]
    warnings: list[str]


class AttendanceUpdate(BaseModel):
    status: AttendanceStatus | None = None
    ot_hours: float | None = Field(default=None, ge=0)
    applicable_rate: float | None = None
    ot_rate: float | None = None


class AttendanceAuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    attendance_id: int
    changed_by: int | None
    field_name: str
    old_value: str | None
    new_value: str | None
