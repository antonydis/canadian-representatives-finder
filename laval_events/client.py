"""Client for the Ville de Laval council-documents table.

The page

    https://www.laval.ca/vie-democratique/hotel-de-ville-personnes-elues/ordre-jour-proces-verbaux-sommaire/

renders a WordPress *wpDataTables* table (``table_id=11``) whose rows are loaded
through the standard jQuery DataTables server-side protocol against
``/wp-admin/admin-ajax.php``.

This module talks to that endpoint directly instead of scraping the rendered
HTML. The only quirks compared to a vanilla DataTables request are:

* a per-session ``wdtNonce`` must be scraped from the page first (hidden input
  ``wdtNonceFrontendServerSide_11``); it is short-lived, so we fetch it lazily
  and cache it on the client instance, and
* ``sRangeSeparator=|`` must be sent so the date column accepts a
  ``start|end`` range filter.

Filtering by month is done with a date-range search on the "Date de séance"
column (index 5, formatted ``dd/mm/yyyy``).
"""

from __future__ import annotations

import calendar
import datetime as _dt
import html as _html
import json as _json
import re as _re
import urllib.parse as _urlparse
import urllib.request as _urlreq
from dataclasses import dataclass, asdict
from typing import Iterator, Optional

__all__ = ["Event", "LavalEventsClient", "get_events", "MONTHS"]

PAGE_URL = (
    "https://www.laval.ca/vie-democratique/hotel-de-ville-personnes-elues/"
    "ordre-jour-proces-verbaux-sommaire/"
)
AJAX_URL = "https://www.laval.ca/wp-admin/admin-ajax.php?action=get_wdtable&table_id=11"

# Column order as declared by the table (index -> server-side "name").
COLUMNS = [
    "ID",
    "Nom Fichier",
    "Type de séance",
    "Sous-Type de séance / Catégorie",
    "Type de Document",
    "Date de séance",
    "Numéro",
    "Titre",
    "Version",
    "url",
]
DATE_COLUMN_INDEX = 5
TITLE_COLUMN_INDEX = 7

_NONCE_RE = _re.compile(
    r'wdtNonceFrontendServerSide_11"[^>]*\bvalue="([^"]+)"'
)
_HREF_RE = _re.compile(r'href="([^"]+)"')
# Title categories are the text before the first " - " (e.g. "ADJUDICATION").
_CATEGORY_SPLIT_RE = _re.compile(r"\s+-\s+")


def _normalize_doc_type(value: str) -> str:
    """Collapse the two procès-verbal spellings the city uses into one."""
    flat = value.strip().lower().replace("è", "e")
    if flat in ("proces verbal", "proces-verbal"):
        return "Procès-verbal"
    return value.strip()

_DEFAULT_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Month name -> 1..12, English + French, full names and common abbreviations.
MONTHS: dict[str, int] = {}
for _i, (_en, _fr) in enumerate(
    [
        ("january", "janvier"),
        ("february", "février"),
        ("march", "mars"),
        ("april", "avril"),
        ("may", "mai"),
        ("june", "juin"),
        ("july", "juillet"),
        ("august", "août"),
        ("september", "septembre"),
        ("october", "octobre"),
        ("november", "novembre"),
        ("december", "décembre"),
    ],
    start=1,
):
    MONTHS[_en] = _i
    MONTHS[_fr] = _i
    MONTHS[_en[:3]] = _i
    MONTHS[_fr[:3]] = _i


class LavalEventsError(RuntimeError):
    """Raised when the remote table cannot be queried."""


@dataclass(frozen=True)
class Event:
    """A single council document / event row.

    ``date`` is a ``datetime.date``. ``document_url`` is the direct (Azure blob)
    PDF link. Empty cells from the source become ``None``.
    """

    id: str
    filename: str
    seance_type: str          # "Type de séance" e.g. Comité exécutif, Conseil municipal
    sub_type: Optional[str]   # "Sous-Type de séance / Catégorie" e.g. Publique
    document_type: str        # "Type de Document" e.g. Ordre du jour, Procès-verbal
    date: _dt.date
    number: Optional[str]
    title: Optional[str]
    version: Optional[str]
    document_url: Optional[str]

    @property
    def category(self) -> Optional[str]:
        """Title-prefix category for sommaires décisionnels.

        Sommaire titles read like ``ADJUDICATION - CONTRAT DOS-3466``; this
        returns the leading action word (``ADJUDICATION``). ``None`` when there
        is no title (ordres du jour / procès-verbaux carry no title).
        """
        if not self.title:
            return None
        return _CATEGORY_SPLIT_RE.split(self.title.strip(), maxsplit=1)[0]

    def to_dict(self) -> dict:
        """JSON-friendly dict (``date`` rendered as ISO ``YYYY-MM-DD``).

        Includes the derived ``category``.
        """
        d = asdict(self)
        d["date"] = self.date.isoformat()
        d["category"] = self.category
        return d


def _normalize_month(month) -> int:
    if isinstance(month, int):
        if 1 <= month <= 12:
            return month
        raise ValueError(f"month out of range: {month!r}")
    key = str(month).strip().lower()
    if key.isdigit():
        return _normalize_month(int(key))
    if key in MONTHS:
        return MONTHS[key]
    raise ValueError(f"unrecognized month: {month!r}")


def _clean(cell: str) -> Optional[str]:
    text = _html.unescape((cell or "").strip())
    return text or None


class LavalEventsClient:
    """Reusable client. Caches the scraped nonce for the session."""

    def __init__(self, *, timeout: float = 30.0, user_agent: str = _DEFAULT_UA):
        self.timeout = timeout
        self.user_agent = user_agent
        self._nonce: Optional[str] = None

    # -- low level ---------------------------------------------------------

    def _open(self, req: _urlreq.Request) -> str:
        try:
            with _urlreq.urlopen(req, timeout=self.timeout) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                return resp.read().decode(charset, "replace")
        except Exception as exc:  # noqa: BLE001 - re-wrap for a clean API
            raise LavalEventsError(f"request failed: {exc}") from exc

    def fetch_nonce(self, *, force: bool = False) -> str:
        """Scrape and cache the ``wdtNonce`` from the public page."""
        if self._nonce and not force:
            return self._nonce
        req = _urlreq.Request(PAGE_URL, headers={"User-Agent": self.user_agent})
        html = self._open(req)
        match = _NONCE_RE.search(html)
        if not match:
            raise LavalEventsError(
                "could not find wdtNonceFrontendServerSide_11 on the page "
                "(the table markup may have changed)"
            )
        self._nonce = match.group(1)
        return self._nonce

    def _build_body(
        self,
        *,
        start: int,
        length: int,
        date_range: Optional[str],
        title_search: Optional[str],
        global_search: str,
        order_desc: bool,
        nonce: str,
    ) -> bytes:
        data = {
            "draw": "1",
            "start": str(start),
            "length": str(length),
            "search[value]": global_search,
            "search[regex]": "false",
            "order[0][column]": str(DATE_COLUMN_INDEX),
            "order[0][dir]": "desc" if order_desc else "asc",
            "sRangeSeparator": "|",
            "wdtNonce": nonce,
        }
        for i, name in enumerate(COLUMNS):
            data[f"columns[{i}][data]"] = str(i)
            data[f"columns[{i}][name]"] = name
            data[f"columns[{i}][searchable]"] = "true"
            data[f"columns[{i}][orderable]"] = "true"
            if i == DATE_COLUMN_INDEX and date_range:
                col_search = date_range
            elif i == TITLE_COLUMN_INDEX and title_search:
                col_search = title_search
            else:
                col_search = ""
            data[f"columns[{i}][search][value]"] = col_search
            data[f"columns[{i}][search][regex]"] = "false"
        return _urlparse.urlencode(data).encode()

    def _post(self, body: bytes) -> dict:
        req = _urlreq.Request(
            AJAX_URL,
            data=body,
            headers={
                "User-Agent": self.user_agent,
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
        )
        raw = self._open(req)
        if not raw:
            # An empty 200 body is what the endpoint returns for a bad/expired nonce.
            raise LavalEventsError(
                "empty response (the wdtNonce was likely rejected or expired)"
            )
        try:
            return _json.loads(raw)
        except _json.JSONDecodeError as exc:
            raise LavalEventsError(f"unexpected non-JSON response: {raw[:200]!r}") from exc

    # -- row parsing -------------------------------------------------------

    @staticmethod
    def _parse_row(row: list) -> Event:
        raw_url = row[9] or ""
        href = _HREF_RE.search(raw_url)
        date_text = (row[5] or "").strip()
        try:
            date = _dt.datetime.strptime(date_text, "%d/%m/%Y").date()
        except ValueError as exc:
            raise LavalEventsError(f"unparseable date {date_text!r}") from exc
        return Event(
            id=str(row[0]).strip(),
            filename=_clean(row[1]) or "",
            seance_type=_clean(row[2]) or "",
            sub_type=_clean(row[3]),
            document_type=_normalize_doc_type(_clean(row[4]) or ""),
            date=date,
            number=_clean(row[6]),
            title=_clean(row[7]),
            version=_clean(row[8]),
            document_url=href.group(1) if href else _clean(raw_url),
        )

    # -- queries -----------------------------------------------------------

    def query(
        self,
        *,
        date_range: Optional[str] = None,
        title_contains: Optional[str] = None,
        global_search: str = "",
        order_desc: bool = True,
        page_size: int = 500,
    ) -> Iterator[Event]:
        """Yield every matching row, transparently paginating.

        ``date_range`` is a raw ``dd/mm/yyyy|dd/mm/yyyy`` string.
        ``title_contains`` filters server-side on the title column (e.g.
        ``"ADJUDICATION"`` or a contract id like ``"DOS-3466"``). Prefer the
        higher-level :meth:`get_events` / :meth:`get_events_between`.
        """
        nonce = self.fetch_nonce()
        start = 0
        seen = 0
        total = None
        retried = False
        while True:
            body = self._build_body(
                start=start,
                length=page_size,
                date_range=date_range,
                title_search=title_contains,
                global_search=global_search,
                order_desc=order_desc,
                nonce=nonce,
            )
            try:
                payload = self._post(body)
            except LavalEventsError:
                # One automatic retry with a refreshed nonce, then give up.
                if retried:
                    raise
                retried = True
                nonce = self.fetch_nonce(force=True)
                continue
            rows = payload.get("data") or []
            if total is None:
                total = int(payload.get("recordsFiltered", 0))
            for row in rows:
                yield self._parse_row(row)
            seen += len(rows)
            if not rows or seen >= total:
                break
            start += page_size

    def get_events_between(
        self,
        start: _dt.date,
        end: _dt.date,
        *,
        category: Optional[str] = None,
        order_desc: bool = True,
    ) -> list[Event]:
        """All events with ``start <= date <= end`` (inclusive).

        ``category`` filters server-side on the title (e.g. ``"ADJUDICATION"``).
        """
        date_range = f"{start:%d/%m/%Y}|{end:%d/%m/%Y}"
        return list(
            self.query(
                date_range=date_range,
                title_contains=category,
                order_desc=order_desc,
            )
        )

    def get_events(
        self,
        month,
        year: Optional[int] = None,
        *,
        category: Optional[str] = None,
        order_desc: bool = True,
    ) -> list[Event]:
        """All events in a given month.

        ``month`` may be an int (1-12) or a name in English or French
        ("june", "juin", "Jun", "juin"...). ``year`` defaults to the current
        calendar year.
        """
        m = _normalize_month(month)
        y = year if year is not None else _dt.date.today().year
        first = _dt.date(y, m, 1)
        last = _dt.date(y, m, calendar.monthrange(y, m)[1])
        return self.get_events_between(
            first, last, category=category, order_desc=order_desc
        )


def get_events(
    month,
    year: Optional[int] = None,
    *,
    category: Optional[str] = None,
    order_desc: bool = True,
) -> list[Event]:
    """Convenience wrapper that creates a one-off client.

    >>> from laval_events import get_events
    >>> events = get_events("june", 2026)
    >>> events[0].document_type, events[0].document_url
    >>> get_events("june", 2026, category="ADJUDICATION")  # only contract awards
    """
    return LavalEventsClient().get_events(
        month, year, category=category, order_desc=order_desc
    )
