from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import accessible_project_ids, check_project_access, require_capability
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.attendance import (
    AttendanceAuditLogOut,
    AttendanceBulkUpsert,
    AttendanceOut,
    AttendanceUpdate,
    AttendanceUpsertResult,
)
from app.services.attendance import update_attendance, upsert_attendance_entry

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("attendance:read")),
) -> list[Attendance]:
    if project_id is not None:
        check_project_access(db, current_user, project_id)

    query = db.query(Attendance)
    ids = accessible_project_ids(db, current_user)
    if ids is not None:
        query = query.filter(Attendance.project_id.in_(ids or [-1]))
    if project_id is not None:
        query = query.filter(Attendance.project_id == project_id)
    if start_date is not None:
        query = query.filter(Attendance.date >= start_date)
    if end_date is not None:
        query = query.filter(Attendance.date <= end_date)
    return query.order_by(Attendance.date.desc()).all()


@router.post("", response_model=AttendanceUpsertResult)
def bulk_upsert_attendance(
    payload: AttendanceBulkUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("attendance:write")),
) -> AttendanceUpsertResult:
    check_project_access(db, current_user, payload.project_id)

    saved: list[Attendance] = []
    warnings: list[str] = []
    for entry in payload.entries:
        try:
            record, warning = upsert_attendance_entry(
                db, payload.project_id, payload.date, entry, current_user.id
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        saved.append(record)
        if warning:
            warnings.append(warning)

    db.commit()
    for record in saved:
        db.refresh(record)
    return AttendanceUpsertResult(saved=saved, warnings=warnings)


@router.patch("/{attendance_id}", response_model=AttendanceOut)
def edit_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("attendance:write")),
) -> Attendance:
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")
    check_project_access(db, current_user, attendance.project_id)

    update_attendance(db, attendance, payload, current_user.id)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.get("/{attendance_id}/audit-log", response_model=list[AttendanceAuditLogOut])
def get_attendance_audit_log(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("attendance:read")),
) -> list:
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")
    check_project_access(db, current_user, attendance.project_id)
    return attendance.audit_entries
