# laval_events

Fetches Ville de Laval council documents (agendas, minutes, executive summaries) by month, directly from the city's website.

---

## How it works

The city publishes documents through a WordPress table at:
> `laval.ca/vie-democratique/hotel-de-ville-personnes-elues/ordre-jour-proces-verbaux-sommaire/`

The table is powered by **wpDataTables** and loads data via a jQuery DataTables AJAX call to `/wp-admin/admin-ajax.php`. This library talks to that endpoint directly instead of scraping HTML.

**Two requests are made per session:**
1. `GET` the public page to scrape a short-lived `wdtNonce` (WordPress CSRF token)
2. `POST` to the AJAX endpoint with the nonce + date range filter

---

## Installation

```bash
pip install -r requirements.txt   # pdfplumber included
```

Or just ensure `requests` is available — the library uses only the standard library.

---

## Quick start

### Python

```python
from laval_events import get_events

# All documents for a month
events = get_events("june", 2026)

# Filter to Ordre du jour only
ordres = [e for e in events if e.document_type == "Ordre du jour"]

# Filter to Conseil municipal sessions
conseil = [
    e for e in events
    if e.seance_type == "Conseil municipal"
    and e.document_type == "Ordre du jour"
]
```

### CLI

```bash
python -m laval_events june 2026
python -m laval_events june 2026 --json
python -m laval_events june 2026 --category ADJUDICATION
python -m laval_events --between 2026-01-01 2026-06-30
```

---

## The `Event` object

Each document returned is an `Event` dataclass:

| Field | Type | Example |
|-------|------|---------|
| `id` | `str` | `"124817"` |
| `filename` | `str` | `"CM_ODJ_ORD_18h30_2026_06_03_2.0.pdf"` |
| `seance_type` | `str` | `"Conseil municipal"` |
| `sub_type` | `str \| None` | `"Ordinaire"` |
| `document_type` | `str` | `"Ordre du jour"` |
| `date` | `datetime.date` | `2026-06-03` |
| `number` | `str \| None` | `None` |
| `title` | `str \| None` | `"ADJUDICATION - CONTRAT DOS-3466"` |
| `version` | `str \| None` | `"2,00"` |
| `document_url` | `str \| None` | `"https://vdldocgreffecmspc01sa.blob.core.windows.net/cms/..."` |

**Derived property:**
- `event.category` — the action word prefix from a sommaire title (e.g. `"ADJUDICATION"`, `"ADOPTION"`, `"OCTROI"`). Returns `None` for ordres du jour and procès-verbaux which have no title.

**Serialization:**
```python
event.to_dict()   # JSON-friendly dict, date as "YYYY-MM-DD", includes category
```

---

## Document types

The city publishes three types per session:

| `document_type` | Description |
|----------------|-------------|
| `Ordre du jour` | Agenda — lists all items to be discussed |
| `Procès-verbal` | Minutes — official record of what was decided |
| `Sommaire décisionnel` | Decision summary — one per resolution |

---

## Session types

| `seance_type` | `sub_type` | Description |
|--------------|-----------|-------------|
| `Conseil municipal` | `Ordinaire` | Regular city council meeting (~monthly) |
| `Conseil municipal` | `Huis clos` | Closed-door session |
| `Comité exécutif` | `Publique` | Executive committee public session |
| `Comité exécutif` | `Huis clos` | Executive committee closed session |

---

## Filtering examples

```python
from laval_events import get_events

events = get_events("june", 2026)

# Only Conseil municipal Ordinaire agendas
conseil_odj = [
    e for e in events
    if e.seance_type == "Conseil municipal"
    and (e.sub_type or "").lower() == "ordinaire"
    and e.document_type == "Ordre du jour"
]

# Only contract awards (adjudications)
adjudications = [
    e for e in events
    if e.category == "ADJUDICATION"
]

# Documents for a specific date
june3 = [e for e in events if e.date.day == 3]
```

### Deduplication (multiple uploads of the same meeting)

The city sometimes uploads multiple versions of the same agenda. Always pick the highest version number:

```python
def best_version(candidates):
    return max(candidates, key=lambda e: (float((e.version or "0").replace(",", ".")), e.date))

conseil_odj_deduped = best_version(conseil_odj)
```

---

## Downloading PDFs

```python
import urllib.request

for event in events:
    if event.document_url:
        urllib.request.urlretrieve(event.document_url, event.filename)
```

PDFs are served from Azure Blob Storage and are publicly accessible — no auth required.

---

## Advanced: date range queries

```python
import datetime
from laval_events import LavalEventsClient

client = LavalEventsClient()

# Arbitrary date range
events = client.get_events_between(
    datetime.date(2026, 1, 1),
    datetime.date(2026, 6, 30),
)

# Only adjudication contracts across a range
contracts = client.get_events_between(
    datetime.date(2026, 1, 1),
    datetime.date(2026, 6, 30),
    category="ADJUDICATION",
)
```

---

## Raw AJAX request

The POST made to the city's endpoint for June 2026:

```
POST https://www.laval.ca/wp-admin/admin-ajax.php?action=get_wdtable&table_id=11
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest

draw=1&start=0&length=500
&order[0][column]=5&order[0][dir]=desc
&sRangeSeparator=|
&wdtNonce=<scraped_from_page>
&columns[5][name]=Date de séance
&columns[5][search][value]=01/06/2026|30/06/2026
```

The nonce is scraped from the hidden input `wdtNonceFrontendServerSide_11` on the public page. It expires after a few minutes; the client retries automatically with a fresh nonce on failure.

---

## Filename conventions

Filenames follow a consistent pattern:

```
{SESSION}_{DOCTYPE}_{SUBTYPE}_{TIME}_{YYYY}_{MM}_{DD}_{VERSION}.pdf

CM_ODJ_ORD_18h30_2026_06_03_2.0.pdf
│   │   │   │         │
│   │   │   └─ Time   └─ Version
│   │   └─ Subtype: ORD=Ordinaire, HC=Huis clos, PUB=Publique
│   └─ Document type: ODJ=Ordre du jour, PV=Procès-verbal
└─ Session: CM=Conseil municipal, CE=Comité exécutif
```

Sommaires décisionnels follow a different pattern: `SD-{YEAR}-{NUMBER}_{VERSION}.pdf`

---

## PDF parsing (Ordre du jour)

The companion script `scripts/parse_ordre_du_jour.py` downloads the Conseil municipal Ordinaire agenda and extracts structured data from sections 8 and 11:

```bash
python scripts/parse_ordre_du_jour.py june 2026
python scripts/parse_ordre_du_jour.py june 2026 --out /tmp/output
```

Output JSON per item:
```json
{
  "item": "11.33",
  "title": "renouveler la nomination de Bergman Fleury...",
  "sd_numbers": ["SD-2026-2299"],
  "districts": [{ "id": "00", "name": "Tous les districts" }]
}
```
