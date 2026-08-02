from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import check_project_access, require_capability
from app.db.session import get_db
from app.models.user import User
from app.models.worker import ProjectWorkerAssignment, Worker, WorkerType
from app.schemas.payment import WorkerLedgerOut
from app.schemas.worker import (
    ProjectWorkerAssignmentCreate,
    ProjectWorkerAssignmentOut,
    WorkerCreate,
    WorkerOut,
    WorkerTypeCreate,
    WorkerTypeOut,
    WorkerUpdate,
)
from app.services.ledger import build_worker_ledger

router = APIRouter(prefix="/workers", tags=["workers"])
worker_types_router = APIRouter(prefix="/worker-types", tags=["worker-types"])


@worker_types_router.get("", response_model=list[WorkerTypeOut])
def list_worker_types(
    db: Session = Depends(get_db), _: User = Depends(require_capability("workers:write"))
) -> list[WorkerType]:
    return db.query(WorkerType).filter(WorkerType.is_active.is_(True)).order_by(WorkerType.id).all()


@worker_types_router.post("", response_model=WorkerTypeOut, status_code=status.HTTP_201_CREATED)
def create_worker_type(
    payload: WorkerTypeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("worker_types:write")),
) -> WorkerType:
    worker_type = WorkerType(**payload.model_dump())
    db.add(worker_type)
    db.commit()
    db.refresh(worker_type)
    return worker_type


@router.get("", response_model=list[WorkerOut])
def list_workers(
    db: Session = Depends(get_db), _: User = Depends(require_capability("workers:write"))
) -> list[Worker]:
    return db.query(Worker).filter(Worker.is_deleted.is_(False)).order_by(Worker.id).all()


@router.get("/{worker_id}", response_model=WorkerOut)
def get_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("workers:write")),
) -> Worker:
    worker = db.get(Worker, worker_id)
    if worker is None or worker.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    return worker


@router.post("", response_model=WorkerOut, status_code=status.HTTP_201_CREATED)
def create_worker(
    payload: WorkerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("workers:write")),
) -> Worker:
    worker = Worker(**payload.model_dump())
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@router.patch("/{worker_id}", response_model=WorkerOut)
def update_worker(
    worker_id: int,
    payload: WorkerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("workers:write")),
) -> Worker:
    worker = db.get(Worker, worker_id)
    if worker is None or worker.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(worker, field, value)
    db.commit()
    db.refresh(worker)
    return worker


@router.post("/{worker_id}/deactivate", response_model=WorkerOut)
def deactivate_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("workers:write")),
) -> Worker:
    worker = db.get(Worker, worker_id)
    if worker is None or worker.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    worker.is_active = False
    db.commit()
    db.refresh(worker)
    return worker


@router.post(
    "/{worker_id}/project-assignments",
    response_model=ProjectWorkerAssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def assign_worker_to_project(
    worker_id: int,
    payload: ProjectWorkerAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("workers:write")),
) -> ProjectWorkerAssignment:
    check_project_access(db, current_user, payload.project_id)
    worker = db.get(Worker, worker_id)
    if worker is None or worker.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    existing = (
        db.query(ProjectWorkerAssignment)
        .filter(
            ProjectWorkerAssignment.worker_id == worker_id,
            ProjectWorkerAssignment.project_id == payload.project_id,
            ProjectWorkerAssignment.unassigned_at.is_(None),
        )
        .first()
    )
    if existing is not None:
        existing.custom_rate_override = payload.custom_rate_override
        existing.ot_rate_override = payload.ot_rate_override
        db.commit()
        db.refresh(existing)
        return existing

    assignment = ProjectWorkerAssignment(
        worker_id=worker_id,
        project_id=payload.project_id,
        custom_rate_override=payload.custom_rate_override,
        ot_rate_override=payload.ot_rate_override,
        assigned_at=datetime.now(UTC),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/{worker_id}/ledger", response_model=WorkerLedgerOut)
def get_worker_ledger(
    worker_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("ledger:read")),
) -> WorkerLedgerOut:
    worker = db.get(Worker, worker_id)
    if worker is None or worker.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    entries, balance = build_worker_ledger(db, worker_id)
    return WorkerLedgerOut(worker_id=worker_id, entries=entries, outstanding_advance_balance=balance)
