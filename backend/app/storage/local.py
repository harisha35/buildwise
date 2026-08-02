import uuid
from pathlib import Path

from app.core.config import get_settings
from app.storage.base import StorageBackend


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str | None = None) -> None:
        self.base_dir = Path(base_dir or get_settings().storage_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, content: bytes) -> str:
        suffix = Path(filename).suffix
        stored_name = f"{uuid.uuid4().hex}{suffix}"
        (self.base_dir / stored_name).write_bytes(content)
        return f"/api/v1/uploads/{stored_name}"

    def read(self, url: str) -> bytes:
        stored_name = Path(url).name
        target = self.base_dir / stored_name
        if not target.is_relative_to(self.base_dir):
            raise ValueError("Invalid storage path")
        return target.read_bytes()
