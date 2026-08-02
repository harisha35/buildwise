from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_capability
from app.db.session import get_db
from app.models.enums import PaymentStatus
from app.models.payment import WorkerAdvance, WorkerPayment
from app.models.user import User
from app.models.worker import Worker
from app.schemas.payment import (
    MarkPaidRequest,
    WorkerAdvanceCreate,
    WorkerAdvanceOut,
    WorkerPaymentOut,
)
from app.services.payments import compute_weekly_due, mark_payment_paid, week_bounds

router = APIRouter(tags=["payments"])


@router.post(
    "/workers/{worker_id}/advances",
    response_model=WorkerAdvanceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_advance(
    worker_id: int,
    payload: WorkerAdvanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("advances:write")),
) -> WorkerAdvance:
    worker = db.get(Worker, worker_id)
    if worker is None or worker.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    advance = WorkerAdvance(
        worker_id=worker_id,
        project_id=payload.project_id,
        amount=payload.amount,
        date=payload.date,
        note=payload.note,
        recorded_by=current_user.id,
        outstanding_amount=payload.amount,
    )
    db.add(advance)
    db.commit()
    db.refresh(advance)
    return advance


@router.get("/workers/{worker_id}/advances", response_model=list[WorkerAdvanceOut])
def list_advances(
    worker_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("advances:read")),
) -> list[WorkerAdvance]:
    return (
        db.query(WorkerAdvance)
        .filter(WorkerAdvance.worker_id == worker_id)
        .order_by(WorkerAdvance.date.desc())
        .all()
    )


@router.get("/payments/due", response_model=list[WorkerPaymentOut])
def payments_due(
    week_start: date,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("payments:read")),
) -> list[WorkerPayment]:
    expected_start, _ = week_bounds(week_start)
    if expected_start != week_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="week_start must be a Monday"
        )
    return (
        db.query(WorkerPayment)
        .filter(WorkerPayment.week_start == week_start, WorkerPayment.status == PaymentStatus.due)
        .all()
    )


@router.get("/payments", response_model=list[WorkerPaymentOut])
def list_payments(
    worker_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("payments:read")),
) -> list[WorkerPayment]:
    query = db.query(WorkerPayment)
    if worker_id is not None:
        query = query.filter(WorkerPayment.worker_id == worker_id)
    return query.order_by(WorkerPayment.week_start.desc()).all()


@router.post("/payments/{payment_id}/mark-paid", response_model=WorkerPaymentOut)
def mark_paid(
    payment_id: int,
    payload: MarkPaidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("payments:write")),
) -> WorkerPayment:
    payment = db.get(WorkerPayment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    try:
        mark_payment_paid(db, payment, payload, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.commit()
    db.refresh(payment)
    return payment


@router.post(
    "/admin/jobs/run-weekly-payments",
    response_model=list[WorkerPaymentOut],
)
def run_weekly_payments_now(
    week_start: date,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("payments:write")),
) -> list[WorkerPayment]:
    from app.services.payments import active_worker_ids_with_attendance

    expected_start, week_end = week_bounds(week_start)
    if expected_start != week_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="week_start must be a Monday"
        )
    worker_ids = active_worker_ids_with_attendance(db, week_start, week_end)
    payments = []
    for worker_id in worker_ids:
        payment = compute_weekly_due(db, worker_id, week_start)
        if payment is not None:
            payments.append(payment)
    db.commit()
    for payment in payments:
        db.refresh(payment)
    return payments
