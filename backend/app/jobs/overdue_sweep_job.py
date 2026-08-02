import logging
from datetime import date

from app.db.session import SessionLocal
from app.services.invoices import run_overdue_sweep

logger = logging.getLogger(__name__)


def run_invoice_overdue_sweep(reference_date: date | None = None) -> int:
    """FR-7.3/7.5: nightly sweep flipping unpaid/partially_paid invoices past due_date to overdue.
    Runs nightly via the scheduler; also callable directly for manual/admin triggering."""
    db = SessionLocal()
    try:
        flipped = run_overdue_sweep(db, reference_date)
        db.commit()
    finally:
        db.close()

    logger.info("Invoice overdue sweep: %s invoice(s) flipped to overdue", flipped)
    return flipped
