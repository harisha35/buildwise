from fastapi import APIRouter

from app.api.v1 import (
    attendance,
    auth,
    dashboard,
    materials,
    payments,
    projects,
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
