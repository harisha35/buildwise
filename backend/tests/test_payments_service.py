from datetime import date, timedelta

import pytest

from app.models.attendance import Attendance
from app.models.enums import AttendanceStatus, PaymentMode, UserRole
from app.models.project import Project
from app.models.worker import Worker
from app.schemas.payment import MarkPaidRequest
from app.services.payments import compute_weekly_due, mark_payment_paid, week_bounds
from tests.conftest import make_user


@pytest.fixture
def worker(db):
    worker = Worker(name="Ravi", default_daily_rate=600)
    db.add(worker)
    db.flush()
    return worker


@pytest.fixture
def supervisor(db):
    return make_user(db, UserRole.supervisor, "sup@buildwise.example")


@pytest.fixture
def two_projects(db):
    p1 = Project(name="Site A")
    p2 = Project(name="Site B")
    db.add_all([p1, p2])
    db.flush()
    return p1, p2


def test_week_bounds_monday_to_sunday():
    start, end = week_bounds(date(2026, 8, 5))  # a Wednesday
    assert start == date(2026, 8, 3)
    assert end == date(2026, 8, 9)


def test_compute_weekly_due_aggregates_across_projects(db, worker, two_projects):
    p1, p2 = two_projects
    week_start = date(2026, 8, 3)

    db.add_all(
        [
            Attendance(
                worker_id=worker.id,
                project_id=p1.id,
                date=week_start,
                status=AttendanceStatus.present,
                applicable_rate=600,
                ot_rate=50,
                ot_hours=2,
            ),
            Attendance(
                worker_id=worker.id,
                project_id=p2.id,
                date=week_start + timedelta(days=1),
                status=AttendanceStatus.half_day,
                applicable_rate=600,
                ot_rate=50,
                ot_hours=0,
            ),
        ]
    )
    db.flush()

    payment = compute_weekly_due(db, worker.id, week_start)
    assert payment is not None
    # day1: 600 + 2*50 = 700 ; day2 half-day: 300
    assert float(payment.gross_wage_due) == 1000
    assert len(payment.breakdown) == 2
    amounts = {row.project_id: float(row.amount) for row in payment.breakdown}
    assert amounts[p1.id] == 700
    assert amounts[p2.id] == 300


def test_compute_weekly_due_no_attendance_returns_none(db, worker):
    assert compute_weekly_due(db, worker.id, date(2026, 8, 3)) is None


def test_mark_paid_requires_proof_for_non_cash(db, worker, two_projects, supervisor):
    p1, _ = two_projects
    week_start = date(2026, 8, 3)
    db.add(
        Attendance(
            worker_id=worker.id,
            project_id=p1.id,
            date=week_start,
            status=AttendanceStatus.present,
            applicable_rate=600,
            ot_rate=0,
        )
    )
    db.flush()
    payment = compute_weekly_due(db, worker.id, week_start)
    db.flush()

    with pytest.raises(ValueError, match="Proof"):
        mark_payment_paid(
            db, payment, MarkPaidRequest(payment_mode=PaymentMode.upi), marked_by=supervisor.id
        )


def test_mark_paid_cash_no_proof_needed(db, worker, two_projects, supervisor):
    p1, _ = two_projects
    week_start = date(2026, 8, 3)
    db.add(
        Attendance(
            worker_id=worker.id,
            project_id=p1.id,
            date=week_start,
            status=AttendanceStatus.present,
            applicable_rate=600,
            ot_rate=0,
        )
    )
    db.flush()
    payment = compute_weekly_due(db, worker.id, week_start)
    db.flush()

    result = mark_payment_paid(
        db, payment, MarkPaidRequest(payment_mode=PaymentMode.cash), marked_by=supervisor.id
    )
    assert result.status.value == "paid"
    assert float(result.net_paid) == 600
