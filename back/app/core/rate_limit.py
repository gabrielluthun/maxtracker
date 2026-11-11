"""In-memory rate limiting per client IP (cold computes only)."""
import time
from typing import Callable


class RateLimitExceeded(Exception):
    """Raised when a client exceeds the cold-compute rate limit."""


class RateLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: int = 60,
        *,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._clock = clock
        self._store: dict[str, list[float]] = {}
        self._last_sweep = clock()

    def allow(self, key: str) -> bool:
        now = self._clock()
        self._sweep(now)
        window = [t for t in self._store.get(key, ()) if now - t < self._window_seconds]
        if len(window) >= self._max_requests:
            self._store[key] = window
            return False
        window.append(now)
        self._store[key] = window
        return True

    def check(self, key: str) -> None:
        if not self.allow(key):
            raise RateLimitExceeded()

    def _sweep(self, now: float) -> None:
        """Oublie les IP sans requête récente (au plus une fois par fenêtre)."""
        if now - self._last_sweep < self._window_seconds:
            return
        self._last_sweep = now
        stale = [k for k, ts in self._store.items() if not ts or now - ts[-1] >= self._window_seconds]
        for key in stale:
            del self._store[key]

    def __len__(self) -> int:
        return len(self._store)
