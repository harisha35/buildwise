import logging
from datetime import date

from app.db.session import SessionLocal
from app.services.payments import active_worker_ids_with_attendance, compute_weekly_due, week_bounds

logger = logging.getLogger(__name__)


def run_weekly_payment_generation(reference_date: date | None = None) -> int:
    """FR-4.1: generate the weekly payment-due record for every worker with attendance
    in the Mon-Sun window ending on (or containing) reference_date. Runs Sunday 23:59 IST
    via the scheduler; also callable directly for manual/admin triggering."""
    reference_date = reference_date or date.today()
    week_start, week_end = week_bounds(reference_date)

    db = SessionLocal()
    generated = 0
    try:
        worker_ids = active_worker_ids_with_attendance(db, week_start, week_end)
        for worker_id in worker_ids:
            payment = compute_weekly_due(db, worker_id, week_start)
            if payment is not None:
                generated += 1
        db.commit()
    finally:
        db.close()

    logger.info("Weekly payment generation: %s payments for week of %s", generated, week_start)
    return generated
