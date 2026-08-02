from datetime import date

from sqlalchemy.orm import Session

from app.models.attendance import Attendance, AttendanceAuditLog
from app.models.enums import AttendanceStatus
from app.schemas.attendance import AttendanceEntry, AttendanceUpdate
from app.services.wages import resolve_daily_rate, resolve_ot_rate


def other_project_present_conflict(
    db: Session, worker_id: int, project_id: int, entry_date: date
) -> Attendance | None:
    """Warn (don't block) if a worker is already present/half-day elsewhere the same day."""
    return (
        db.query(Attendance)
        .filter(
            Attendance.worker_id == worker_id,
            Attendance.project_id != project_id,
            Attendance.date == entry_date,
            Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.half_day]),
        )
        .first()
    )


def upsert_attendance_entry(
    db: Session, project_id: int, entry_date: date, entry: AttendanceEntry, recorded_by: int | None
) -> tuple[Attendance, str | None]:
    warning = None
    if entry.status in (AttendanceStatus.present, AttendanceStatus.half_day):
        conflict = other_project_present_conflict(db, entry.worker_id, project_id, entry_date)
        if conflict is not None and not entry.override_warning:
            warning = (
                f"Worker {entry.worker_id} is already marked {conflict.status.value} on "
                f"project {conflict.project_id} for {entry_date}"
            )

    applicable_rate = (
        entry.applicable_rate
        if entry.applicable_rate is not None
        else resolve_daily_rate(db, entry.worker_id, project_id)
    )
    ot_rate = (
        entry.ot_rate
        if entry.ot_rate is not None
        else resolve_ot_rate(db, entry.worker_id, project_id)
    )

    existing = (
        db.query(Attendance)
        .filter(
            Attendance.worker_id == entry.worker_id,
            Attendance.project_id == project_id,
            Attendance.date == entry_date,
        )
        .first()
    )

    if existing is None:
        record = Attendance(
            worker_id=entry.worker_id,
            project_id=project_id,
            date=entry_date,
            status=entry.status,
            ot_hours=entry.ot_hours,
            applicable_rate=applicable_rate,
            ot_rate=ot_rate,
            recorded_by=recorded_by,
        )
        db.add(record)
        db.flush()
        return record, warning

    changes = {
        "status": (existing.status.value, entry.status.value),
        "ot_hours": (float(existing.ot_hours), entry.ot_hours),
        "applicable_rate": (float(existing.applicable_rate), applicable_rate),
        "ot_rate": (float(existing.ot_rate), ot_rate),
    }
    existing.status = entry.status
    existing.ot_hours = entry.ot_hours
    existing.applicable_rate = applicable_rate
    existing.ot_rate = ot_rate
    _log_changes(db, existing, changes, recorded_by)
    db.flush()
    return existing, warning


def update_attendance(
    db: Session, attendance: Attendance, update: AttendanceUpdate, changed_by: int | None
) -> Attendance:
    changes: dict[str, tuple[str, str]] = {}
    for field in ("status", "ot_hours", "applicable_rate", "ot_rate"):
        new_value = getattr(update, field)
        if new_value is None:
            continue
        old_value = getattr(attendance, field)
        old_str = old_value.value if hasattr(old_value, "value") else str(old_value)
        new_str = new_value.value if hasattr(new_value, "value") else str(new_value)
        if old_str != new_str:
            changes[field] = (old_str, new_str)
        setattr(attendance, field, new_value)

    _log_changes(db, attendance, changes, changed_by)
    db.flush()
    return attendance


def _log_changes(
    db: Session,
    attendance: Attendance,
    changes: dict[str, tuple[str, str]],
    changed_by: int | None,
) -> None:
    for field_name, (old_value, new_value) in changes.items():
        if old_value == new_value:
            continue
        db.add(
            AttendanceAuditLog(
                attendance_id=attendance.id,
                changed_by=changed_by,
                field_name=field_name,
                old_value=old_value,
                new_value=new_value,
            )
        )
