from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AttendanceStatus


class Attendance(TimestampMixin, Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("worker_id", "project_id", "date", name="uq_attendance_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    ot_hours: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    applicable_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    ot_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    worker: Mapped["Worker"] = relationship()  # noqa: F821
    project: Mapped["Project"] = relationship()  # noqa: F821
    audit_entries: Mapped[list["AttendanceAuditLog"]] = relationship(
        back_populates="attendance", cascade="all, delete-orphan"
    )


class AttendanceAuditLog(Base):
    __tablename__ = "attendance_audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    attendance_id: Mapped[int] = mapped_column(
        ForeignKey("attendance.id", ondelete="CASCADE"), nullable=False
    )
    changed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(60), nullable=False)
    old_value: Mapped[str | None] = mapped_column(String(200), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(200), nullable=True)

    attendance: Mapped["Attendance"] = relationship(back_populates="audit_entries")
