"""
ParliamentClient — fetches current federal MPs from official sources.

Strategy (hybrid):
  1. ourcommons.ca XML  → all 338 current MPs (name, riding, party, PersonId)
     Updated after each election. No auth required.
  2. openparliament.ca  → per-MP detail (email, phone, photo) fetched on demand.

Riding→MP matching:
  The Represent API boundary endpoint gives us the riding name for a postal code.
  We normalize both names (strip accents, em-dash → hyphen) for fuzzy matching.

Cache: data/cache/parliament_*.json  (TTL = 7 days for the full list, 30 days for details)
"""

import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

import requests

_CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"
_ALL_MPS_CACHE = _CACHE_DIR / "parliament_all_mps.json"
_ALL_MPS_TTL = timedelta(days=7)
_DETAIL_TTL = timedelta(days=30)

_OURCOMMONS_XML = (
    "https://www.ourcommons.ca/members/en/search/xml?caucusId=all&current=1"
)
_OPENPARL_BASE = "https://api.openparliament.ca"
_OPENPARL_PHOTO_BASE = "https://openparliament.ca"

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": "infocivic/1.0 (infocivic.ca)"})


# ── Normalization helpers ──────────────────────────────────────────────────────

def _normalize_riding(name: str) -> str:
    """Lowercase, strip accents, replace em-dashes and hyphens with space."""
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    name = name.lower()
    name = re.sub(r"[—–\-]", " ", name)   # em-dash, en-dash, hyphen → space
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _name_to_slug(name: str) -> str:
    """Convert 'Steven Guilbeault' → 'steven-guilbeault' for openparliament.ca URLs."""
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


# ── Main client ────────────────────────────────────────────────────────────────

class ParliamentClient:

    def __init__(self):
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self._all_mps: dict[str, dict] | None = None   # normalized_riding → mp_dict

    # ── Public ────────────────────────────────────────────────────────────────

    def get_mp_by_riding(self, riding_name: str) -> dict | None:
        """
        Return MP dict for a riding name, or None if not found.
        riding_name comes from Represent boundary API (e.g. 'Laurier—Sainte-Marie').
        """
        all_mps = self._get_all_mps()
        key = _normalize_riding(riding_name)
        mp = all_mps.get(key)
        if mp is None:
            return None
        return self._enrich_with_detail(mp)

    # ── Fetch all MPs ──────────────────────────────────────────────────────────

    def _get_all_mps(self) -> dict[str, dict]:
        if self._all_mps is not None:
            return self._all_mps

        cached = self._load_all_mps_cache()
        if cached is not None:
            self._all_mps = cached
            return self._all_mps

        self._all_mps = self._fetch_all_mps_from_ourcommons()
        self._save_all_mps_cache(self._all_mps)
        return self._all_mps

    def _fetch_all_mps_from_ourcommons(self) -> dict[str, dict]:
        """Fetch all current MPs from ourcommons.ca XML. Returns normalized_riding → mp dict."""
        try:
            resp = _SESSION.get(_OURCOMMONS_XML, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            raise RuntimeError(f"Could not fetch MPs from ourcommons.ca: {e}")

        root = ET.fromstring(resp.content)
        result: dict[str, dict] = {}

        for mp in root.findall("MemberOfParliament"):
            first  = mp.findtext("PersonOfficialFirstName", "").strip()
            last   = mp.findtext("PersonOfficialLastName", "").strip()
            riding = mp.findtext("ConstituencyName", "").strip()
            prov   = mp.findtext("ConstituencyProvinceTerritoryName", "").strip()
            party  = mp.findtext("CaucusShortName", "").strip()
            pid    = mp.findtext("PersonId", "").strip()
            to_dt  = mp.find("ToDateTime")

            # Skip former MPs (ToDateTime not nil)
            if to_dt is not None and to_dt.get("{http://www.w3.org/2001/XMLSchema-instance}nil") != "true":
                continue

            name = f"{first} {last}".strip()
            slug = _name_to_slug(name)
            key  = _normalize_riding(riding)

            result[key] = {
                "name":       name,
                "first_name": first,
                "last_name":  last,
                "riding":     riding,
                "province":   prov,
                "party":      party,
                "person_id":  pid,
                "slug":       slug,
                "url": f"https://www.ourcommons.ca/members/en/{slug}({pid})",
            }

        return result

    # ── Enrich with openparliament.ca detail ──────────────────────────────────

    def _enrich_with_detail(self, mp: dict) -> dict:
        """Add email, phone, photo_url from openparliament.ca (cached per MP)."""
        detail_cache = _CACHE_DIR / f"parliament_mp_{mp['slug']}.json"

        # Load from cache
        if detail_cache.exists():
            try:
                payload = json.loads(detail_cache.read_text(encoding="utf-8"))
                cached_at = datetime.fromisoformat(payload["_cached_at"])
                if datetime.now() - cached_at < _DETAIL_TTL:
                    return {**mp, **payload["detail"]}
            except (json.JSONDecodeError, KeyError, ValueError):
                pass

        # Fetch from openparliament.ca
        detail = self._fetch_mp_detail(mp["slug"])

        # Save cache
        try:
            detail_cache.write_text(
                json.dumps({"_cached_at": datetime.now().isoformat(), "detail": detail},
                           ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass

        return {**mp, **detail}

    def _fetch_mp_detail(self, slug: str) -> dict:
        """Fetch email, phone, photo from openparliament.ca."""
        try:
            resp = _SESSION.get(
                f"{_OPENPARL_BASE}/politicians/{slug}/",
                headers={"Accept": "application/json"},
                timeout=10,
            )
            if not resp.ok:
                return {}
            data = resp.json()
            photo = data.get("image", "")
            return {
                "email":     data.get("email") or None,
                "phone":     data.get("voice") or None,
                "photo_url": (_OPENPARL_PHOTO_BASE + photo) if photo else None,
            }
        except requests.RequestException:
            return {}

    # ── Cache helpers ──────────────────────────────────────────────────────────

    def _load_all_mps_cache(self) -> dict | None:
        if not _ALL_MPS_CACHE.exists():
            return None
        try:
            payload = json.loads(_ALL_MPS_CACHE.read_text(encoding="utf-8"))
            cached_at = datetime.fromisoformat(payload["_cached_at"])
            if datetime.now() - cached_at > _ALL_MPS_TTL:
                return None
            return payload["data"]
        except (json.JSONDecodeError, KeyError, ValueError):
            return None

    def _save_all_mps_cache(self, data: dict) -> None:
        try:
            _ALL_MPS_CACHE.write_text(
                json.dumps({"_cached_at": datetime.now().isoformat(), "data": data},
                           ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass
