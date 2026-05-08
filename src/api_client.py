import dataclasses
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from .models import Office, Representative
from .parliament_client import ParliamentClient
from .validators import normalize_postal_code, validate_postal_code

BASE_URL = "https://represent.opennorth.ca"
CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"
CACHE_TTL_HOURS = 24
_DATA_DIR = Path(__file__).parent.parent / "data"
OVERRIDES_FILE     = _DATA_DIR / "overrides.json"
MTL_BOROUGH_FILE   = _DATA_DIR / "mtl_borough_overrides.json"


def _load_overrides() -> list[dict]:
    """Load manual override rules from data/overrides.json + mtl_borough_overrides.json."""
    rules: list[dict] = []
    for path in (OVERRIDES_FILE, MTL_BOROUGH_FILE):
        try:
            with path.open("r", encoding="utf-8") as f:
                rules.extend(json.load(f).get("overrides", []))
        except (OSError, json.JSONDecodeError):
            pass
    return rules


OVERRIDES = _load_overrides()

# Fallback URLs for municipal reps when OpenNorth has none
# Keyed by lowercase substring of district_name or representative_set_name
_MUNICIPAL_URL_FALLBACK: dict[str, str] = {
    "montréal":      "https://montreal.ca/en/city-government/elected-officials",
    "montreal":      "https://montreal.ca/en/city-government/elected-officials",
    "laval":         "https://www.laval.ca/Pages/Fr/Citoyens/administration-municipale.aspx",
    "longueuil":     "https://www.longueuil.quebec/fr/conseil-municipal",
    "gatineau":      "https://www.gatineau.ca/portail/default.aspx?p=guichet_municipal/conseil_municipal",
    "sherbrooke":    "https://www.sherbrooke.ca/fr/administration-municipale",
    "saguenay":      "https://www.ville.saguenay.ca/fr/mairie-et-administration",
    "lévis":         "https://www.ville.levis.qc.ca/ville-et-services/administration-municipale",
    "levis":         "https://www.ville.levis.qc.ca/ville-et-services/administration-municipale",
    "trois-rivières":"https://www.v3r.net/mairie-et-administration",
    "trois-rivieres":"https://www.v3r.net/mairie-et-administration",
    "terrebonne":    "https://www.ville.terrebonne.qc.ca",
    "brossard":      "https://www.brossard.ca/fr/mairie",
    "saint-jérôme":  "https://www.vsj.ca/fr/administration/conseil-municipal",
    "saint-jerome":  "https://www.vsj.ca/fr/administration/conseil-municipal",
    "repentigny":    "https://www.repentigny.ca/mairie-administration",
    "blainville":    "https://www.blainville.ca/fr/mairie",
    "mirabel":       "https://www.mirabel.ca/fr/mairie-et-administration",
    "drummondville": "https://www.drummondville.ca/fr/administration-municipale",
    "granby":        "https://www.granby.ca/fr/administration",
    "saint-hyacinthe":"https://www.st-hyacinthe.qc.ca/mairie",
    "québec":        "https://www.ville.quebec.qc.ca/apropos/administration/elus",
    "quebec":        "https://www.ville.quebec.qc.ca/apropos/administration/elus",
}


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
        self.session.headers.update({"User-Agent": "infocivic/1.0 (infocivic.ca)"})
        self._parliament = ParliamentClient()

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
            reps = self._inject_parliament_mp(cached, self._parse_response(cached))
            return self._apply_overrides(reps, normalized)

        raw = self._fetch_from_api(normalized)
        self._save_cache(normalized, raw)
        reps = self._inject_parliament_mp(raw, self._parse_response(raw))
        return self._apply_overrides(reps, normalized)

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

    def _inject_parliament_mp(self, raw_data: dict, reps: list[Representative]) -> list[Representative]:
        """
        Replace any federal MP returned by OpenNorth with the current official data
        from ourcommons.ca (via ParliamentClient).
        Uses the federal riding boundary already in the Represent response.
        """
        # Find federal riding name from boundary data
        boundaries = (
            raw_data.get("boundaries_centroid", []) +
            raw_data.get("boundaries_concordance", [])
        )
        riding_name = None
        for b in boundaries:
            if "federal-electoral-districts" in b.get("url", ""):
                riding_name = b.get("name")
                break

        if not riding_name:
            return reps  # no federal boundary found, leave as-is

        try:
            mp = self._parliament.get_mp_by_riding(riding_name)
        except Exception:
            return reps  # parliament API unavailable, keep OpenNorth data

        if mp is None:
            return reps  # riding not matched, keep OpenNorth data

        # Build a Representative from the Parliament data
        parliament_rep = Representative(
            name=mp["name"],
            first_name=mp.get("first_name"),
            last_name=mp.get("last_name"),
            elected_office="MP",
            level="federal",
            party_name=mp.get("party"),
            district_name=mp.get("riding", ""),
            representative_set_name="House of Commons",
            email=mp.get("email"),
            url=mp.get("url"),
            personal_url=None,
            photo_url=mp.get("photo_url"),
            offices=[],
            source_url="https://www.ourcommons.ca",
            boundary_url="",
        )

        # Remove any existing federal MP(s) from OpenNorth, add the official one
        non_federal_or_senator = [
            r for r in reps
            if not (r.level == "federal" and "senator" not in r.elected_office.lower())
        ]
        return non_federal_or_senator + [parliament_rep]

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
    # Overrides
    # ------------------------------------------------------------------

    def _apply_overrides(
        self, reps: list[Representative], postal: str
    ) -> list[Representative]:
        """
        Apply manual corrections on top of OpenNorth data.
        - 'inject': add a rep that is missing from the API response.
        - 'replace': swap a stale rep matched by (elected_office, level).
        Keyed by 3-character postal prefix (e.g. 'H2X').
        """
        prefix = postal.replace(" ", "")[:3].upper()

        for rule in OVERRIDES:
            if prefix not in rule.get("postal_prefixes", []):
                continue

            action = rule.get("action", "inject")

            def _make_rep(r: dict) -> Representative:
                return Representative(
                    name=r["name"],
                    elected_office=r["elected_office"],
                    level=r["level"],
                    party_name=r.get("party_name"),
                    district_name=r.get("district_name", ""),
                    email=r.get("email"),
                    url=r.get("url"),
                    photo_url=r.get("photo_url") or None,
                    offices=[],
                    first_name=None, last_name=None,
                    personal_url=None, representative_set_name="",
                    source_url="", boundary_url="",
                )
            if action == "inject_all":
                # Inject a list of reps (councillors + mayor for a whole city).
                # Each rep is only added if no rep with same name+office already exists.
                existing_keys = {
                    (rep.name.lower(), (rep.elected_office or "").lower())
                    for rep in reps
                }
                for r in rule.get("representatives", []):
                    key = (r["name"].lower(), r["elected_office"].lower())
                    if key not in existing_keys:
                        reps.append(_make_rep(r))
                        existing_keys.add(key)
                continue

            if action == "enrich_by_district":
                # Replace OpenNorth reps with our verified data, matched by district name.
                # OpenNorth routes correctly; we just enrich with updated name/email/phone.
                # If OpenNorth has no municipal reps for this postal code, inject all from
                # the override list (fallback for postal codes OpenNorth doesn't cover).
                import re
                enrichment_map = {}
                for r in rule.get("representatives", []):
                    dn = r.get("district_name", "")
                    enrichment_map[dn.lower().strip()] = r
                    m = re.search(r'\(([^)]+)\)', dn)
                    if m:
                        enrichment_map[m.group(1).lower().strip()] = r

                new_reps = []
                used_keys = set()
                for rep in reps:
                    dn_rep = (rep.district_name or "").lower().strip()
                    enriched = enrichment_map.get(dn_rep)
                    if not enriched:
                        for key, val in enrichment_map.items():
                            if dn_rep and (dn_rep in key or key in dn_rep):
                                enriched = val
                                break
                    if enriched:
                        new_reps.append(_make_rep(enriched))
                        used_keys.add(enriched.get("district_name", "").lower().strip())
                    else:
                        new_reps.append(rep)

                # If OpenNorth had no municipal reps for this borough, inject all override reps
                has_municipal = any(r.level == "municipal" for r in new_reps)
                if not has_municipal:
                    existing_keys = {
                        (r.name.lower(), (r.elected_office or "").lower())
                        for r in new_reps
                    }
                    for r in rule.get("representatives", []):
                        key = (r["name"].lower(), r["elected_office"].lower())
                        if key not in existing_keys:
                            new_reps.append(_make_rep(r))
                            existing_keys.add(key)

                reps = new_reps
                continue

            r = rule["representative"]
            new_rep = _make_rep(r)

            if action == "replace":
                reps = [
                    new_rep
                    if (rep.elected_office == r["elected_office"]
                        and rep.level == r["level"])
                    else rep
                    for rep in reps
                ]
            elif action == "force_inject":
                # Always inject, even if a rep with same office+level exists
                reps.append(new_rep)
            elif action == "replace_or_inject":
                # Replace if a rep with exact same elected_office exists, otherwise inject
                # Used for city-wide mayors: replaces stale city mayor if present,
                # or injects alongside borough mayor if city mayor is missing entirely
                replaced = False
                new_reps = []
                for rep in reps:
                    if rep.elected_office == r["elected_office"] and rep.level == r["level"]:
                        new_reps.append(new_rep)
                        replaced = True
                    else:
                        new_reps.append(rep)
                if not replaced:
                    new_reps.append(new_rep)
                reps = new_reps
            else:  # inject — only if no rep with same office+level already exists
                already = any(
                    rep.elected_office == r["elected_office"]
                    and rep.level == r["level"]
                    for rep in reps
                )
                if not already:
                    reps.append(new_rep)

        # Apply URL fallback for municipal reps missing a URL
        return [self._fill_municipal_url(r) for r in reps]

    def _fill_municipal_url(self, rep: Representative) -> Representative:
        """If a municipal rep has no URL, try to find one from the fallback map."""
        if rep.level != "municipal" or rep.url:
            return rep
        search_text = (
            (rep.district_name or "") + " " + (rep.representative_set_name or "")
        ).lower()
        for key, url in _MUNICIPAL_URL_FALLBACK.items():
            if key in search_text:
                d = dataclasses.asdict(rep)
                d["url"] = url
                # offices is a list of dicts after asdict — reconstruct
                d["offices"] = rep.offices
                return Representative(**d)
        return rep

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
