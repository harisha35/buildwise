from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.enums import AttendanceStatus, PaymentStatus
from app.models.payment import (
    WorkerAdvance,
    WorkerAdvanceDeduction,
    WorkerPayment,
    WorkerPaymentProjectBreakdown,
)
from app.models.worker import Worker
from app.schemas.payment import MarkPaidRequest


def week_bounds(any_date: date) -> tuple[date, date]:
    """Monday-Sunday week containing any_date."""
    week_start = any_date - timedelta(days=any_date.weekday())
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def outstanding_advance_balance(db: Session, worker_id: int) -> float:
    advances = db.query(WorkerAdvance).filter(WorkerAdvance.worker_id == worker_id).all()
    return sum(float(a.outstanding_amount) for a in advances)


def compute_weekly_due(db: Session, worker_id: int, week_start: date) -> WorkerPayment | None:
    """FR-4.1/4.4: aggregate attendance across all projects for the Mon-Sun window into one payout."""
    _, week_end = week_bounds(week_start)

    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.worker_id == worker_id,
            Attendance.date >= week_start,
            Attendance.date <= week_end,
        )
        .all()
    )
    if not attendance_rows:
        return None

    per_project: dict[int, dict[str, float]] = defaultdict(
        lambda: {"days_present": 0.0, "ot_hours": 0.0, "amount": 0.0}
    )
    gross_total = 0.0

    for row in attendance_rows:
        if row.status == AttendanceStatus.present:
            wage = float(row.applicable_rate)
            days = 1.0
        elif row.status == AttendanceStatus.half_day:
            wage = float(row.applicable_rate) * 0.5
            days = 0.5
        else:
            wage = 0.0
            days = 0.0

        ot_amount = float(row.ot_hours) * float(row.ot_rate)
        line_amount = wage + ot_amount

        bucket = per_project[row.project_id]
        bucket["days_present"] += days
        bucket["ot_hours"] += float(row.ot_hours)
        bucket["amount"] += line_amount
        gross_total += line_amount

    existing = (
        db.query(WorkerPayment)
        .filter(WorkerPayment.worker_id == worker_id, WorkerPayment.week_start == week_start)
        .first()
    )
    if existing is not None and existing.status == PaymentStatus.paid:
        return existing

    if existing is None:
        payment = WorkerPayment(
            worker_id=worker_id,
            week_start=week_start,
            week_end=week_end,
            gross_wage_due=gross_total,
            status=PaymentStatus.due,
        )
        db.add(payment)
        db.flush()
    else:
        payment = existing
        payment.gross_wage_due = gross_total
        db.query(WorkerPaymentProjectBreakdown).filter(
            WorkerPaymentProjectBreakdown.payment_id == payment.id
        ).delete()

    for project_id, values in per_project.items():
        db.add(
            WorkerPaymentProjectBreakdown(
                payment_id=payment.id,
                project_id=project_id,
                days_present=values["days_present"],
                ot_hours=values["ot_hours"],
                amount=values["amount"],
            )
        )

    db.flush()
    return payment


def mark_payment_paid(
    db: Session, payment: WorkerPayment, request: MarkPaidRequest, marked_by: int | None
) -> WorkerPayment:
    if payment.status == PaymentStatus.paid:
        raise ValueError("Payment has already been marked as paid")

    if request.payment_mode.value != "cash":
        if not request.proof_reference and not request.proof_file_url:
            raise ValueError(
                "Proof (transaction reference or file upload) is required for bank_transfer/upi"
            )

    advances = (
        db.query(WorkerAdvance)
        .filter(WorkerAdvance.worker_id == payment.worker_id, WorkerAdvance.outstanding_amount > 0)
        .order_by(WorkerAdvance.date.asc())
        .all()
    )
    total_outstanding = sum(float(a.outstanding_amount) for a in advances)
    deduction_requested = request.advance_deduction_amount
    if deduction_requested > total_outstanding:
        raise ValueError("Advance deduction amount exceeds outstanding balance")

    remaining_to_deduct = deduction_requested
    for advance in advances:
        if remaining_to_deduct <= 0:
            break
        take = min(float(advance.outstanding_amount), remaining_to_deduct)
        if take <= 0:
            continue
        advance.outstanding_amount = float(advance.outstanding_amount) - take
        db.add(
            WorkerAdvanceDeduction(payment_id=payment.id, advance_id=advance.id, amount_deducted=take)
        )
        remaining_to_deduct -= take

    payment.advance_deducted = deduction_requested
    payment.net_paid = float(payment.gross_wage_due) - deduction_requested
    payment.payment_mode = request.payment_mode
    payment.proof_reference = request.proof_reference
    payment.proof_file_url = request.proof_file_url
    payment.status = PaymentStatus.paid
    payment.marked_by = marked_by
    payment.paid_at = datetime.now(UTC)

    db.flush()
    return payment


def active_worker_ids_with_attendance(db: Session, week_start: date, week_end: date) -> list[int]:
    rows = (
        db.query(Attendance.worker_id)
        .join(Worker, Worker.id == Attendance.worker_id)
        .filter(
            Attendance.date >= week_start,
            Attendance.date <= week_end,
            Worker.is_deleted.is_(False),
        )
        .distinct()
        .all()
    )
    return [row[0] for row in rows]
