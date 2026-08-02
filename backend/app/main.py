from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Buildwise API", version="0.1.0")
    app.include_router(api_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "environment": settings.environment}

    if settings.environment != "testing":
        from app.jobs.scheduler import start_scheduler

        @app.on_event("startup")
        def _start_scheduler() -> None:
            start_scheduler()

    return app


app = create_app()
