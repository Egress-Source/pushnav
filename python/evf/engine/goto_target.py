# Copyright (C) 2026 Arun Venkataswamy
#
# This file is part of PushNav.
#
# PushNav is free software: you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# PushNav is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with PushNav. If not, see <https://www.gnu.org/licenses/>.

"""Thread-safe container for the current GOTO navigation target."""

import logging
import threading
from dataclasses import dataclass
from typing import Callable

from evf.paths import sounds_dir

logger = logging.getLogger(__name__)

_SOUNDS_DIR = sounds_dir()
_ACK_SOUND = _SOUNDS_DIR / "goto_ack.wav"

_playsound = None
try:
    from playsound3 import playsound as _playsound
except ImportError:
    pass


@dataclass(frozen=True)
class GotoTargetSnapshot:
    """Immutable snapshot of GOTO target state, safe to pass between threads."""

    ra_j2000: float  # degrees
    dec_j2000: float  # degrees
    active: bool


class GotoTarget:
    """Thread-safe GOTO target. Updated by Stellarium server thread."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._ra_j2000: float = 0.0
        self._dec_j2000: float = 0.0
        self._active: bool = False
        self._on_change: list[Callable[[], None]] = []

    def add_on_change(self, callback: Callable[[], None]) -> None:
        """Register a callback fired after every set()/clear(). Used e.g. to
        invalidate cached object metadata that's tied to the previous target."""
        self._on_change.append(callback)

    def set(self, ra_j2000_deg: float, dec_j2000_deg: float) -> None:
        """Set a new GOTO target. Called by Stellarium server thread."""
        with self._lock:
            self._ra_j2000 = ra_j2000_deg
            self._dec_j2000 = dec_j2000_deg
            self._active = True
        for cb in self._on_change:
            try:
                cb()
            except Exception as exc:
                logger.debug("GotoTarget on_change callback failed: %s", exc)
        self._play_ack()

    @staticmethod
    def _play_ack() -> None:
        """Play acknowledgment sound. Non-blocking, never raises."""
        if _playsound is None:
            return
        try:
            _playsound(str(_ACK_SOUND), block=False)
        except Exception as exc:
            logger.debug("GOTO ack sound failed: %s", exc)

    def clear(self) -> None:
        """Clear the current target."""
        with self._lock:
            self._active = False
        for cb in self._on_change:
            try:
                cb()
            except Exception as exc:
                logger.debug("GotoTarget on_change callback failed: %s", exc)

    def read(self) -> GotoTargetSnapshot:
        """Return an immutable snapshot. Called by UI thread."""
        with self._lock:
            return GotoTargetSnapshot(
                ra_j2000=self._ra_j2000,
                dec_j2000=self._dec_j2000,
                active=self._active,
            )
