# API Reference

## Represent API

This project uses the **Represent API** by OpenNorth as its data source.

- **Base URL:** `https://represent.opennorth.ca`
- **Authentication:** None required
- **Rate limit:** 60 requests/minute (HTTP 503 when exceeded)
- **Format:** JSON

### Endpoint Used

```
GET /postcodes/{POSTAL_CODE}/
```

**Important URL formatting rules:**
- Postal code must be **uppercase** with **no space**: `H2X1Y6` not `H2X 1Y6`
- Trailing slash is required

**Example:**
```
GET https://represent.opennorth.ca/postcodes/H2X1Y6/
```

### Response Fields

| API Field | `Representative` attribute | Notes |
|-----------|---------------------------|-------|
| `name` | `name` | Full name |
| `first_name` | `first_name` | |
| `last_name` | `last_name` | |
| `elected_office` | `elected_office` | "MP", "MNA", "Mayor", etc. |
| `representative_set_name` | `representative_set_name` | "House of Commons", "Assemblée nationale", etc. |
| `district_name` | `district_name` | Electoral district or municipality |
| `party_name` | `party_name` | Political party |
| `email` | `email` | May be empty string → stored as `None` |
| `url` | `url` | Official profile URL |
| `personal_url` | `personal_url` | Personal/campaign site |
| `photo_url` | `photo_url` | Headshot image |
| `offices[].tel` | `get_phone()` | Phone numbers are nested in offices array |
| `offices[].type` | `offices[].type` | "legislature" or "constituency" |
| `related.boundary_url` | `boundary_url` | Link to electoral boundary |

### Level Classification

The `level` field is derived from `elected_office` and `representative_set_name`:

| `elected_office` value | Level |
|------------------------|-------|
| MP, Senator | `federal` |
| MNA, MLA, MPP, MHA, MNL | `provincial` |
| Mayor, Councillor, Alderman, Reeve, Warden, Trustee | `municipal` |

Set name fallbacks (when `elected_office` is ambiguous):
- "House of Commons" or "Senate" → `federal`
- "Assemblée nationale", "Legislative Assembly", "Provincial" → `provincial`
- "City", "Municipality", "Ville", "Municipal" → `municipal`

### `representatives_centroid` vs `representatives_concordance`

The API response includes two representative arrays:

- **`representatives_centroid`**: Representatives whose boundaries contain the geographic centroid of the postal code. Primary source.
- **`representatives_concordance`**: Representatives linked via government concordance tables. Used as a supplement — unique entries are merged in.

This project merges both, deduplicating by `(name, elected_office)` pair.

---

## Python API (this project)

### `RepresentClient`

```python
from src.api_client import RepresentClient

client = RepresentClient(
    cache_dir=Path("data/cache"),   # Cache location
    cache_ttl_hours=24,             # Cache TTL in hours
)

reps = client.get_representatives_by_postal_code("H2X 1Y6")
```

### `validate_postal_code(code)`

```python
from src.validators import validate_postal_code, normalize_postal_code

validate_postal_code("H2X 1Y6")   # True
validate_postal_code("h2x1y6")    # True
validate_postal_code("INVALID")   # False

normalize_postal_code("h2x1y6")   # "H2X 1Y6"
```

### `format_representatives_text(reps, postal_code, lang="en")`

```python
from src.formatters import format_representatives_text

text = format_representatives_text(reps, "H2X 1Y6", lang="fr")
print(text)
```

### `format_representatives_json(reps, postal_code)`

```python
from src.formatters import format_representatives_json

json_str = format_representatives_json(reps, "H2X 1Y6")
```

### `filter_by_level(reps, level)`

```python
from src.formatters import filter_by_level

federal_only = filter_by_level(reps, "federal")
```

---

## Error Handling

| Exception | Cause |
|-----------|-------|
| `ValueError` | Invalid postal code format |
| `RepresentAPIError` | API returned unexpected error (404, 5xx, connection failure) |
| `RepresentRateLimitError` | API returned 503 — rate limit exceeded (60 req/min) |

```python
from src.api_client import RepresentAPIError, RepresentRateLimitError

try:
    reps = client.get_representatives_by_postal_code("H2X 1Y6")
except RepresentRateLimitError:
    print("Too many requests — wait a moment and retry.")
except RepresentAPIError as e:
    print(f"API error: {e}")
except ValueError as e:
    print(f"Invalid postal code: {e}")
```

---

## Caching

Results are cached in `data/cache/{POSTAL_CODE}.json` with this structure:

```json
{
  "_cached_at": "2026-04-21T14:32:00.123456",
  "data": { "...full Represent API response..." }
}
```

- TTL: 24 hours (configurable via `cache_ttl_hours`)
- Cache is checked before every API call
- Corrupt or missing cache files fall through to a live API call
- Cache write failures are silently ignored (non-fatal)
- Bypass with `--no-cache` CLI flag or `client.cache_ttl = timedelta(seconds=0)`
