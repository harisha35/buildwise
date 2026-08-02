from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PaymentMode, PaymentStatus


class WorkerAdvance(Base):
    __tablename__ = "worker_advances"

    id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    outstanding_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )

    worker: Mapped["Worker"] = relationship()  # noqa: F821
    project: Mapped["Project | None"] = relationship()  # noqa: F821
    deductions: Mapped[list["WorkerAdvanceDeduction"]] = relationship(back_populates="advance")


class WorkerPayment(Base):
    __tablename__ = "worker_payments"
    __table_args__ = (UniqueConstraint("worker_id", "week_start", name="uq_worker_payment_week"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.id", ondelete="CASCADE"), nullable=False
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    week_end: Mapped[date] = mapped_column(Date, nullable=False)
    gross_wage_due: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    advance_deducted: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    net_paid: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    payment_mode: Mapped[PaymentMode | None] = mapped_column(
        Enum(PaymentMode, name="payment_mode"), nullable=True
    )
    proof_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    proof_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"), default=PaymentStatus.due, nullable=False
    )
    marked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )

    worker: Mapped["Worker"] = relationship()  # noqa: F821
    breakdown: Mapped[list["WorkerPaymentProjectBreakdown"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )
    advance_deductions: Mapped[list["WorkerAdvanceDeduction"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )


class WorkerPaymentProjectBreakdown(Base):
    __tablename__ = "worker_payment_project_breakdown"

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("worker_payments.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    days_present: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    ot_hours: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    payment: Mapped["WorkerPayment"] = relationship(back_populates="breakdown")
    project: Mapped["Project"] = relationship()  # noqa: F821


class WorkerAdvanceDeduction(Base):
    __tablename__ = "worker_advance_deductions"

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("worker_payments.id", ondelete="CASCADE"), nullable=False
    )
    advance_id: Mapped[int] = mapped_column(
        ForeignKey("worker_advances.id", ondelete="CASCADE"), nullable=False
    )
    amount_deducted: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    payment: Mapped["WorkerPayment"] = relationship(back_populates="advance_deductions")
    advance: Mapped["WorkerAdvance"] = relationship(back_populates="deductions")
