from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import (
    accessible_project_ids,
    check_project_access,
    require_capability,
)
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.project import Project, ProjectType, SupervisorProjectAssignment
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectOut,
    ProjectTypeCreate,
    ProjectTypeOut,
    ProjectUpdate,
    SupervisorAssignmentCreate,
)

router = APIRouter(prefix="/projects", tags=["projects"])
project_types_router = APIRouter(prefix="/project-types", tags=["project-types"])


@project_types_router.get("", response_model=list[ProjectTypeOut])
def list_project_types(
    db: Session = Depends(get_db), _: User = Depends(require_capability("projects:read"))
) -> list[ProjectType]:
    return db.query(ProjectType).filter(ProjectType.is_active.is_(True)).order_by(ProjectType.id).all()


@project_types_router.post("", response_model=ProjectTypeOut, status_code=status.HTTP_201_CREATED)
def create_project_type(
    payload: ProjectTypeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("project_types:write")),
) -> ProjectType:
    project_type = ProjectType(name=payload.name)
    db.add(project_type)
    db.commit()
    db.refresh(project_type)
    return project_type


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db), current_user: User = Depends(require_capability("projects:read"))
) -> list[Project]:
    query = db.query(Project).filter(Project.is_deleted.is_(False))
    ids = accessible_project_ids(db, current_user)
    if ids is not None:
        query = query.filter(Project.id.in_(ids or [-1]))
    return query.order_by(Project.id).all()


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("projects:read")),
) -> Project:
    check_project_access(db, current_user, project_id)
    project = db.get(Project, project_id)
    if project is None or project.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("projects:write")),
) -> Project:
    project = Project(**payload.model_dump(), created_by=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("projects:write")),
) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/archive", response_model=ProjectOut)
def archive_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("projects:write")),
) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    project.is_deleted = True
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/assign-supervisor", status_code=status.HTTP_201_CREATED)
def assign_supervisor(
    project_id: int,
    payload: SupervisorAssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("projects:write")),
) -> dict:
    project = db.get(Project, project_id)
    if project is None or project.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    target_user = db.get(User, payload.user_id)
    if target_user is None or target_user.role != UserRole.supervisor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User must be a Supervisor"
        )
    existing = (
        db.query(SupervisorProjectAssignment)
        .filter(
            SupervisorProjectAssignment.user_id == payload.user_id,
            SupervisorProjectAssignment.project_id == project_id,
        )
        .first()
    )
    if existing is not None:
        return {"id": existing.id, "user_id": existing.user_id, "project_id": existing.project_id}

    assignment = SupervisorProjectAssignment(user_id=payload.user_id, project_id=project_id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"id": assignment.id, "user_id": assignment.user_id, "project_id": assignment.project_id}
