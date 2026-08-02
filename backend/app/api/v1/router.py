from fastapi import APIRouter

from app.api.v1 import (
    attendance,
    auth,
    dashboard,
    invoices,
    materials,
    milestones,
    payments,
    projects,
    quotations,
    reports,
    uploads,
    users,
    workers,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(projects.project_types_router)
api_router.include_router(workers.router)
api_router.include_router(workers.worker_types_router)
api_router.include_router(attendance.router)
api_router.include_router(payments.router)
api_router.include_router(dashboard.router)
api_router.include_router(uploads.router)
api_router.include_router(materials.units_router)
api_router.include_router(materials.suppliers_router)
api_router.include_router(materials.materials_router)
api_router.include_router(materials.stock_router)
api_router.include_router(materials.material_expenses_router)
api_router.include_router(quotations.router)
api_router.include_router(milestones.project_milestones_router)
api_router.include_router(milestones.milestones_router)
api_router.include_router(invoices.router)
api_router.include_router(reports.router)
