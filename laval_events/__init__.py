"""laval_events — query Ville de Laval council documents (ordres du jour,
procès-verbaux, sommaires décisionnels) by month.

See :mod:`laval_events.client` for details on the underlying API.
"""

from .client import (
    Event,
    LavalEventsClient,
    LavalEventsError,
    MONTHS,
    get_events,
)

__version__ = "0.1.0"

__all__ = [
    "Event",
    "LavalEventsClient",
    "LavalEventsError",
    "MONTHS",
    "get_events",
    "__version__",
]
