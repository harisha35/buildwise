from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import get_settings
from app.jobs.overdue_sweep_job import run_invoice_overdue_sweep
from app.jobs.weekly_payment_job import run_weekly_payment_generation

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    settings = get_settings()
    scheduler = BackgroundScheduler(timezone=settings.timezone)
    scheduler.add_job(
        run_weekly_payment_generation,
        CronTrigger(day_of_week="sun", hour=23, minute=59),
        id="weekly_payment_generation",
        replace_existing=True,
    )
    scheduler.add_job(
        run_invoice_overdue_sweep,
        CronTrigger(hour=0, minute=30),
        id="invoice_overdue_sweep",
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler
    return scheduler
