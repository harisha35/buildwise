"""In-memory sliding-window rate limiter for auth endpoints (Phase 4 hardening).

Single-VM, low-volume deployment (§1 guiding principles) — no Redis/external
store needed. State lives on `app.state` so it resets per app instance
(fresh per test, persists for the life of the process in production).
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def is_rate_limited(self, key: str) -> bool:
        """Records an attempt for `key`. Returns True if the caller is over the limit."""
        now = time.monotonic()
        with self._lock:
            window = self._hits[key]
            while window and now - window[0] > self.window_seconds:
                window.popleft()
            if len(window) >= self.max_attempts:
                return True
            window.append(now)
            return False


def rate_limit(bucket: str, max_attempts: int, window_seconds: int):
    """FastAPI dependency factory: limits requests per client IP within `bucket`."""

    def dependency(request: Request) -> None:
        limiters: dict[str, InMemoryRateLimiter] = request.app.state.rate_limiters
        limiter = limiters.setdefault(bucket, InMemoryRateLimiter(max_attempts, window_seconds))
        client_ip = request.client.host if request.client else "unknown"
        if limiter.is_rate_limited(f"{bucket}:{client_ip}"):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return dependency
