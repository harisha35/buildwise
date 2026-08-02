from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class WorkerType(Base):
    __tablename__ = "worker_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    default_daily_rate: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    default_ot_rate: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Worker(TimestampMixin, Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    worker_type_id: Mapped[int | None] = mapped_column(ForeignKey("worker_types.id"), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    id_proof_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    id_proof_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(String(400), nullable=True)
    default_daily_rate: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(String(100), nullable=True)
    upi_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    worker_type: Mapped["WorkerType | None"] = relationship()
    project_assignments: Mapped[list["ProjectWorkerAssignment"]] = relationship(
        back_populates="worker", cascade="all, delete-orphan"
    )


class ProjectWorkerAssignment(Base):
    __tablename__ = "project_worker_assignments"
    __table_args__ = (
        Index(
            "uq_project_worker_active",
            "worker_id",
            "project_id",
            unique=True,
            postgresql_where=(text("unassigned_at IS NULL")),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    custom_rate_override: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    ot_rate_override: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    unassigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    worker: Mapped["Worker"] = relationship(back_populates="project_assignments")
    project: Mapped["Project"] = relationship()  # noqa: F821
