from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.permissions import roles_for
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.project import SupervisorProjectAssignment
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise credentials_error from exc

    if payload.get("type") != "access":
        raise credentials_error

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_error

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_capability(capability: str) -> Callable[..., User]:
    allowed_roles = roles_for(capability)

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role.value}' is not permitted to '{capability}'",
            )
        return current_user

    return dependency


def require_role(*roles: UserRole) -> Callable[..., User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency


def check_project_access(db: Session, user: User, project_id: int) -> None:
    """Supervisors are restricted to their assigned project(s); other roles pass through."""
    if user.role != UserRole.supervisor:
        return
    assigned = (
        db.query(SupervisorProjectAssignment)
        .filter(
            SupervisorProjectAssignment.user_id == user.id,
            SupervisorProjectAssignment.project_id == project_id,
        )
        .first()
    )
    if assigned is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this project",
        )


def accessible_project_ids(db: Session, user: User) -> list[int] | None:
    """Returns None for roles with access to all projects, or a list of project ids for Supervisors."""
    if user.role != UserRole.supervisor:
        return None
    rows = (
        db.query(SupervisorProjectAssignment.project_id)
        .filter(SupervisorProjectAssignment.user_id == user.id)
        .all()
    )
    return [row[0] for row in rows]
