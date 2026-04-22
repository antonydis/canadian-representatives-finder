import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from .models import Office, Representative
from .validators import normalize_postal_code, validate_postal_code

BASE_URL = "https://represent.opennorth.ca"
CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"
CACHE_TTL_HOURS = 24


class RepresentAPIError(Exception):
    """Raised when the Represent API returns an error."""


class RepresentRateLimitError(RepresentAPIError):
    """Raised when the API returns 503 (rate limit exceeded)."""


class RepresentClient:
    def __init__(
        self,
        cache_dir: Path = CACHE_DIR,
        cache_ttl_hours: int = CACHE_TTL_HOURS,
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "canadian-representatives-finder/1.0"}
        )

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get_representatives_by_postal_code(
        self, postal_code: str
    ) -> list[Representative]:
        """
        Fetch all representatives for a postal code.
        Returns cached results if fresh (< 24 h), otherwise calls the API.
        """
        normalized = normalize_postal_code(postal_code)
        if not validate_postal_code(normalized):
            raise ValueError(f"Invalid postal code format: '{postal_code}'")

        cached = self._load_cache(normalized)
        if cached is not None:
            return self._parse_response(cached)

        raw = self._fetch_from_api(normalized)
        self._save_cache(normalized, raw)
        return self._parse_response(raw)

    # ------------------------------------------------------------------
    # API communication
    # ------------------------------------------------------------------

    def _fetch_from_api(self, normalized_postal_code: str) -> dict:
        """Call GET /postcodes/{code}/ — code must have no space in the URL."""
        code_no_space = normalized_postal_code.replace(" ", "")
        url = f"{BASE_URL}/postcodes/{code_no_space}/"
        try:
            resp = self.session.get(url, timeout=10)
        except requests.ConnectionError:
            raise RepresentAPIError(
                "Cannot reach represent.opennorth.ca. Check your internet connection."
            )
        except requests.Timeout:
            raise RepresentAPIError("The Represent API timed out after 10 seconds.")

        if resp.status_code == 404:
            raise RepresentAPIError(
                f"Postal code '{normalized_postal_code}' was not found in the Represent database."
            )
        if resp.status_code == 503:
            raise RepresentRateLimitError(
                "Rate limit exceeded (60 req/min). Please wait before retrying."
            )
        if not resp.ok:
            raise RepresentAPIError(
                f"Represent API returned HTTP {resp.status_code}."
            )

        return resp.json()

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def _parse_response(self, data: dict) -> list[Representative]:
        """
        Convert raw API JSON into Representative objects.
        Merges representatives_centroid and representatives_concordance,
        deduplicating by (name, elected_office).
        """
        reps_raw = list(data.get("representatives_centroid", []))

        seen = {(r["name"], r["elected_office"]) for r in reps_raw}
        for r in data.get("representatives_concordance", []):
            key = (r["name"], r["elected_office"])
            if key not in seen:
                reps_raw.append(r)
                seen.add(key)

        return [self._parse_single(r) for r in reps_raw]

    def _parse_single(self, raw: dict) -> Representative:
        offices = [
            Office(
                type=o.get("type", ""),
                tel=o.get("tel") or None,
                fax=o.get("fax") or None,
                postal=o.get("postal") or None,
            )
            for o in raw.get("offices", [])
        ]

        elected_office = raw.get("elected_office", "")
        set_name = raw.get("representative_set_name", "")
        level = self._classify_level(elected_office, set_name)

        return Representative(
            name=raw.get("name", ""),
            first_name=raw.get("first_name") or None,
            last_name=raw.get("last_name") or None,
            elected_office=elected_office,
            level=level,
            party_name=raw.get("party_name") or None,
            district_name=raw.get("district_name", ""),
            representative_set_name=set_name,
            email=raw.get("email") or None,
            url=raw.get("url") or None,
            personal_url=raw.get("personal_url") or None,
            photo_url=raw.get("photo_url") or None,
            offices=offices,
            source_url=raw.get("source_url", ""),
            boundary_url=raw.get("related", {}).get("boundary_url", ""),
        )

    def _classify_level(self, elected_office: str, set_name: str) -> str:
        """Map elected_office/set_name to 'federal', 'provincial', or 'municipal'."""
        office = elected_office.lower()
        sname = set_name.lower()

        FEDERAL = {"mp", "senator", "member of parliament"}
        PROVINCIAL = {
            "mna", "mla", "mpp", "mha", "mnl", "député", "depute",
            "member of provincial parliament",
            "member of the legislative assembly",
            "member of the national assembly",
        }
        MUNICIPAL_KEYWORDS = {
            "mayor", "councillor", "councilor", "alderman", "reeve",
            "warden", "trustee", "deputy mayor",
        }

        if office in FEDERAL or "house of commons" in sname or "senate" in sname:
            return "federal"
        if (
            office in PROVINCIAL
            or "assemblée nationale" in sname
            or "legislative assembly" in sname
            or "provincial" in sname
        ):
            return "provincial"
        if (
            any(kw in office for kw in MUNICIPAL_KEYWORDS)
            or "city" in sname
            or "municipality" in sname
            or "municipal" in sname
            or "ville" in sname
        ):
            return "municipal"

        return "municipal"

    # ------------------------------------------------------------------
    # Cache
    # ------------------------------------------------------------------

    def _cache_path(self, normalized: str) -> Path:
        safe = normalized.replace(" ", "_")
        return self.cache_dir / f"{safe}.json"

    def _load_cache(self, normalized: str) -> Optional[dict]:
        path = self._cache_path(normalized)
        if not path.exists():
            return None
        try:
            with path.open("r", encoding="utf-8") as f:
                payload = json.load(f)
            cached_at = datetime.fromisoformat(payload["_cached_at"])
            if datetime.now() - cached_at > self.cache_ttl:
                return None
            return payload["data"]
        except (json.JSONDecodeError, KeyError, ValueError):
            return None

    def _save_cache(self, normalized: str, data: dict) -> None:
        path = self._cache_path(normalized)
        payload = {"_cached_at": datetime.now().isoformat(), "data": data}
        try:
            with path.open("w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except OSError:
            pass
