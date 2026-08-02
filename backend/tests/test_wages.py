import pytest

from app.models.project import Project
from app.models.worker import ProjectWorkerAssignment, Worker, WorkerType
from app.services.wages import resolve_daily_rate, resolve_ot_rate


@pytest.fixture
def project(db):
    project = Project(name="Test Site")
    db.add(project)
    db.flush()
    return project


def test_resolves_worker_type_default_when_nothing_else_set(db, project):
    worker_type = WorkerType(name="Mason", default_daily_rate=600, default_ot_rate=50)
    db.add(worker_type)
    db.flush()
    worker = Worker(name="Ravi", worker_type_id=worker_type.id)
    db.add(worker)
    db.flush()

    assert resolve_daily_rate(db, worker.id, project.id) == 600
    assert resolve_ot_rate(db, worker.id, project.id) == 50


def test_worker_default_overrides_worker_type_default(db, project):
    worker_type = WorkerType(name="Helper", default_daily_rate=400)
    db.add(worker_type)
    db.flush()
    worker = Worker(name="Suresh", worker_type_id=worker_type.id, default_daily_rate=500)
    db.add(worker)
    db.flush()

    assert resolve_daily_rate(db, worker.id, project.id) == 500


def test_project_assignment_override_wins_over_everything(db, project):
    worker_type = WorkerType(name="Electrician", default_daily_rate=700)
    db.add(worker_type)
    db.flush()
    worker = Worker(name="Kumar", worker_type_id=worker_type.id, default_daily_rate=800)
    db.add(worker)
    db.flush()
    db.add(
        ProjectWorkerAssignment(worker_id=worker.id, project_id=project.id, custom_rate_override=999)
    )
    db.flush()

    assert resolve_daily_rate(db, worker.id, project.id) == 999


def test_no_rate_resolvable_raises(db, project):
    worker = Worker(name="NoRate")
    db.add(worker)
    db.flush()

    with pytest.raises(ValueError):
        resolve_daily_rate(db, worker.id, project.id)


def test_ot_rate_defaults_to_zero_when_unset(db, project):
    worker = Worker(name="NoOt", default_daily_rate=300)
    db.add(worker)
    db.flush()

    assert resolve_ot_rate(db, worker.id, project.id) == 0.0
