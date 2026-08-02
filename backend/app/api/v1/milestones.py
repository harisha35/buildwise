from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_capability
from app.db.session import get_db
from app.models.invoice import Milestone
from app.models.project import Project
from app.models.user import User
from app.schemas.invoice import MilestoneCreate, MilestoneOut, MilestoneUpdate

project_milestones_router = APIRouter(prefix="/projects", tags=["milestones"])
milestones_router = APIRouter(prefix="/milestones", tags=["milestones"])


@project_milestones_router.get(
    "/{project_id}/milestones", response_model=list[MilestoneOut]
)
def list_project_milestones(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("milestones:read")),
) -> list[Milestone]:
    return (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .order_by(Milestone.id)
        .all()
    )


@project_milestones_router.post(
    "/{project_id}/milestones", response_model=MilestoneOut, status_code=status.HTTP_201_CREATED
)
def create_milestone(
    project_id: int,
    payload: MilestoneCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("milestones:write")),
) -> Milestone:
    project = db.get(Project, project_id)
    if project is None or project.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    milestone = Milestone(project_id=project_id, **payload.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@milestones_router.patch("/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    milestone_id: int,
    payload: MilestoneUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("milestones:write")),
) -> Milestone:
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)
    return milestone
