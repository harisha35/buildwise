from datetime import date

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ContractType, ProjectStatus


class ProjectType(Base):
    __tablename__ = "project_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    client_contact: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    project_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_types.id"), nullable=True
    )
    contract_type: Mapped[ContractType | None] = mapped_column(
        Enum(ContractType, name="contract_type"), nullable=True
    )
    budget: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"), default=ProjectStatus.planning, nullable=False
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    project_type: Mapped["ProjectType | None"] = relationship()
    supervisor_assignments: Mapped[list["SupervisorProjectAssignment"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class SupervisorProjectAssignment(Base):
    __tablename__ = "supervisor_project_assignments"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_supervisor_project"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="supervisor_assignments")  # noqa: F821
    project: Mapped["Project"] = relationship(back_populates="supervisor_assignments")
