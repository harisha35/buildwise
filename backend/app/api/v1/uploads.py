from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.deps import get_current_user
from app.models.user import User
from app.storage.local import LocalStorageBackend

router = APIRouter(prefix="/uploads", tags=["uploads"])
storage = LocalStorageBackend()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile, _: User = Depends(get_current_user)
) -> dict[str, str]:
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large"
        )
    url = storage.save(file.filename or "upload", content)
    return {"url": url}


@router.get("/{stored_name}")
def get_file(stored_name: str, _: User = Depends(get_current_user)) -> Response:
    try:
        content = storage.read(f"/api/v1/uploads/{stored_name}")
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc
    return Response(content=content, media_type="application/octet-stream")
