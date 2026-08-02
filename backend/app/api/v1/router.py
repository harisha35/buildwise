from fastapi import APIRouter

from app.api.v1 import attendance, auth, dashboard, payments, projects, uploads, users, workers

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
