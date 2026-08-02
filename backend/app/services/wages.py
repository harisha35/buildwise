from sqlalchemy.orm import Session

from app.models.worker import ProjectWorkerAssignment, Worker, WorkerType


def _active_assignment(db: Session, worker_id: int, project_id: int) -> ProjectWorkerAssignment | None:
    return (
        db.query(ProjectWorkerAssignment)
        .filter(
            ProjectWorkerAssignment.worker_id == worker_id,
            ProjectWorkerAssignment.project_id == project_id,
            ProjectWorkerAssignment.unassigned_at.is_(None),
        )
        .first()
    )


def resolve_daily_rate(db: Session, worker_id: int, project_id: int) -> float:
    """FR-2.5 tier resolution: assignment override -> worker default -> worker-type default."""
    assignment = _active_assignment(db, worker_id, project_id)
    if assignment is not None and assignment.custom_rate_override is not None:
        return float(assignment.custom_rate_override)

    worker = db.get(Worker, worker_id)
    if worker is None:
        raise ValueError(f"Worker {worker_id} not found")
    if worker.default_daily_rate is not None:
        return float(worker.default_daily_rate)

    if worker.worker_type_id is not None:
        worker_type = db.get(WorkerType, worker.worker_type_id)
        if worker_type is not None and worker_type.default_daily_rate is not None:
            return float(worker_type.default_daily_rate)

    raise ValueError(
        f"No daily rate could be resolved for worker {worker_id} on project {project_id}"
    )


def resolve_ot_rate(db: Session, worker_id: int, project_id: int) -> float:
    assignment = _active_assignment(db, worker_id, project_id)
    if assignment is not None and assignment.ot_rate_override is not None:
        return float(assignment.ot_rate_override)

    worker = db.get(Worker, worker_id)
    if worker is None:
        raise ValueError(f"Worker {worker_id} not found")

    if worker.worker_type_id is not None:
        worker_type = db.get(WorkerType, worker.worker_type_id)
        if worker_type is not None and worker_type.default_ot_rate is not None:
            return float(worker_type.default_ot_rate)

    return 0.0
