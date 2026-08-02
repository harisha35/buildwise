from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def save(self, filename: str, content: bytes) -> str:
        """Persist content and return a URL/path that can be used to retrieve it later."""

    @abstractmethod
    def read(self, url: str) -> bytes:
        """Retrieve previously saved content by its URL/path."""
