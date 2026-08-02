from sqlalchemy.orm import Session

from app.models.payment import WorkerAdvance, WorkerAdvanceDeduction, WorkerPayment
from app.schemas.payment import LedgerEntry
from app.services.payments import outstanding_advance_balance


def build_worker_ledger(db: Session, worker_id: int) -> tuple[list[LedgerEntry], float]:
    entries: list[LedgerEntry] = []

    advances = db.query(WorkerAdvance).filter(WorkerAdvance.worker_id == worker_id).all()
    for advance in advances:
        entries.append(
            LedgerEntry(
                date=advance.date,
                type="advance_given",
                description=advance.note or "Advance given",
                debit=float(advance.amount),
            )
        )

    payments = (
        db.query(WorkerPayment)
        .filter(WorkerPayment.worker_id == worker_id)
        .order_by(WorkerPayment.week_start.asc())
        .all()
    )
    for payment in payments:
        entries.append(
            LedgerEntry(
                date=payment.week_end,
                type="wage",
                description=f"Wages for week {payment.week_start}–{payment.week_end}",
                credit=float(payment.gross_wage_due),
            )
        )
        if payment.status.value == "paid":
            deductions = (
                db.query(WorkerAdvanceDeduction)
                .filter(WorkerAdvanceDeduction.payment_id == payment.id)
                .all()
            )
            for deduction in deductions:
                entries.append(
                    LedgerEntry(
                        date=payment.week_end,
                        type="advance_deducted",
                        description=f"Advance deducted (payment #{payment.id})",
                        debit=float(deduction.amount_deducted),
                    )
                )
            entries.append(
                LedgerEntry(
                    date=payment.week_end,
                    type="payment",
                    description=f"Paid via {payment.payment_mode.value if payment.payment_mode else ''}",
                    debit=float(payment.net_paid or 0),
                )
            )

    entries.sort(key=lambda e: e.date)
    balance = outstanding_advance_balance(db, worker_id)
    return entries, balance
