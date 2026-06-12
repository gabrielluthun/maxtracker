"""Process-local LRU cache with TTL for search responses."""
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class _Entry:
    payload: dict[str, Any]
    sync_at: Optional[str]
    expires_at: float


class SearchMemoryCache:
    """LRU in-memory L1 cache keyed by norm:/metro: origin keys."""

    def __init__(self, *, max_size: int = 200, ttl_seconds: int = 300) -> None:
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._store: OrderedDict[str, _Entry] = OrderedDict()

    def get(self, key: str) -> Optional[dict[str, Any]]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if entry.expires_at <= time.monotonic():
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return {"payload": entry.payload, "sync_at": entry.sync_at}

    def set(self, key: str, payload: dict[str, Any], *, sync_at: Optional[str]) -> None:
        self._store[key] = _Entry(
            payload=payload,
            sync_at=sync_at,
            expires_at=time.monotonic() + self._ttl,
        )
        self._store.move_to_end(key)
        while len(self._store) > self._max_size:
            self._store.popitem(last=False)

    def clear(self) -> None:
        self._store.clear()
