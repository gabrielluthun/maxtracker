"""In-memory rate limiting per client IP (cold computes only)."""
from collections import defaultdict
from datetime import datetime, timezone


class RateLimitExceeded(Exception):
    """Raised when a client exceeds the cold-compute rate limit."""


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = datetime.now(timezone.utc).timestamp()
        window = self._store[key]
        self._store[key] = [t for t in window if now - t < self._window_seconds]
        if len(self._store[key]) >= self._max_requests:
            return False
        self._store[key].append(now)
        return True

    def check(self, key: str) -> None:
        if not self.allow(key):
            raise RateLimitExceeded()
