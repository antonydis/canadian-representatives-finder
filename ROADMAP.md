# InfoCivic — Roadmap & TODO

> Last updated: 2026-04-27
> Current data source: Represent API (OpenNorth) — considered abandoned since ~2024.
> Strategy: replace level by level with official/maintained sources.

---

## Context — Why we are migrating away from OpenNorth

The Represent API was the only unified source for all three levels of Canadian
government. OpenNorth stopped maintaining it; municipal and some provincial data
is now months or years out of date. Since federal data is the most searched and
the easiest to replace, we migrate that first.

Primary audience for v1: **Québec residents** (federal + QC provincial + major QC municipalities).

---

## STATUS LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Done and deployed |
| 🔄 | In progress |
| 📋 | Planned — scoped and ready to build |
| 💡 | Idea — needs evaluation before committing |
| ❌ | Blocked or deprioritized |

---

## PHASE 1 — Federal data migration  `📋 NEXT`

**Goal:** Replace OpenNorth federal data with the official Parliament of Canada source.
**Effort:** ~1–2 days · **Impact:** Fixes all 338 MPs immediately after any election.

### Data source
- **API:** `https://api.openparliament.ca/politicians/`  (JSON, no auth, actively maintained)
- **Backup:** `https://www.ourcommons.ca/en/open-data` (official XML/CSV exports)
- **Docs:** https://api.openparliament.ca/

### Tasks
- [ ] Read `api.openparliament.ca` docs and test endpoint with Montreal/Toronto/Vancouver postal codes
- [ ] Create `src/parliament_client.py` — new client class `ParliamentClient`
  - Fetch MP by postal code: `GET /politicians/?election_riding__province=QC&...`
  - Note: openparliament.ca maps ridings to postal codes via a separate endpoint
  - Map response fields → existing `Representative` dataclass (name, party, email, url, photo_url)
- [ ] Update `RepresentClient.get_representatives_by_postal_code()` in `src/api_client.py`
  - Fetch federal reps from `ParliamentClient` instead of OpenNorth
  - Keep OpenNorth only for `level = provincial` and `level = municipal`
  - Merge results from both sources into one list
- [ ] Update cache layer to handle two sources independently
- [ ] Update `tests/test_data_freshness.py` — add Parliament API assertions
- [ ] Update `_classify_level()` — Parliament API already provides level, no inference needed
- [ ] Update User-Agent string to `infocivic/1.0`

### Known risk
The openparliament.ca API maps ridings by name, not postal code directly.
May need the `representatives-by-postal-code` workaround via Elections Canada boundary data.
Fallback: use the federal results already in OpenNorth as a bridge while we build this.

---

## PHASE 2 — Québec Provincial (Assemblée nationale)  `📋 PLANNED`

**Goal:** Replace OpenNorth QC provincial data with the official ANQ source.
**Effort:** ~2–3 days · **Impact:** All 125 MNAs always current.

### Data source
- **Official site:** https://www.assnat.qc.ca/en/membres/index.html
- **XML/JSON feed:** https://www.assnat.qc.ca/en/xml/membres.xml  ← check if still active
- **Alternative:** Scrape the members list page (stable HTML structure)
- Note: The ANQ does **not** have a formal REST API — scraping is the accepted approach
  (used by OpenNorth itself historically).

### Tasks
- [ ] Verify if `assnat.qc.ca` XML feed is active and up to date
- [ ] Create `src/anq_client.py` — scraper/parser for ANQ data
  - Fetch all 125 MNAs with: name, riding (circonscription), party, email, phone, photo
  - Map QC postal codes → ridings using Elections Canada boundary data (GeoJSON)
    or the existing OpenNorth boundary endpoint as a bridge
- [ ] Riding-to-postal-code lookup table (static JSON file, updated after each election)
  - File: `data/qc_riding_postal_map.json`
  - Source: Elections Canada electoral district shapefiles
- [ ] Integrate into `api_client.py` — replace OpenNorth for QC provincial reps
- [ ] Add QC provincial test cases to `tests/test_data_freshness.py`
  - Montréal ridings: Laurier, Rosemont, Westmount, etc.
  - Québec City ridings: Jean-Talon, Chauveau, etc.

---

## PHASE 3 — Québec Municipal (Major cities)  `📋 PLANNED`

**Goal:** Accurate municipal data for the 10 largest QC cities.
**Effort:** ~3–5 days · **Impact:** Fixes Montréal, Québec City, Laval, Gatineau, Sherbrooke.

### Priority cities (by population)

| City | Population | Data source | Difficulty |
|------|-----------|-------------|------------|
| Montréal | 2.1M | ville.montreal.qc.ca open data portal | Low — has open data |
| Québec City | 800K | ville.quebec.qc.ca | Medium — HTML scrape |
| Laval | 440K | laval.ca | Medium |
| Gatineau | 290K | gatineau.ca | Medium |
| Longueuil | 260K | longueuil.quebec | Medium |
| Sherbrooke | 170K | sherbrooke.ca | Medium |
| Lévis | 160K | ville.levis.qc.ca | Medium |
| Saguenay | 145K | ville.saguenay.qc.ca | Hard |
| Trois-Rivières | 140K | v3r.net | Hard |
| Terrebonne | 120K | ville.terrebonne.qc.ca | Hard |

### Tasks
- [ ] **Montréal (priority #1)**
  - Open data portal: https://donnees.montreal.ca
  - Check if councillor/mayor dataset exists and is updated post Nov-2025 election
  - Mayor: Soraya Martínez Ferrada (elected Nov 2025)
  - 19 borough mayors + city councillors
  - Arrondissement → postal code mapping needed
- [ ] **Québec City (priority #2)**
  - Mayor: Bruno Marchand (re-elected Nov 2025)
  - 21 city councillors across 8 districts
- [ ] Create `data/qc_municipal_overrides.json` — static JSON with manually verified data
  for cities that don't have open data APIs. Format:
  ```json
  {
    "montreal": {
      "mayor": { "name": "Soraya Martínez Ferrada", "email": "...", "phone": "..." },
      "councillors": [...]
    }
  }
  ```
- [ ] Create `src/qc_municipal_client.py` — reads static JSON + scrapes where possible
- [ ] Postal-code → borough mapping for Montréal
  - Use Montréal open data: arrondissement boundaries GeoJSON
  - Or static lookup table: `data/mtl_postal_arrondissement.json`
- [ ] Integrate into `api_client.py` — replace OpenNorth for QC municipal
- [ ] Add municipal test cases to `tests/test_data_freshness.py`
- [ ] Update `tests/test_data_freshness.py` GROUND_TRUTH: Calgary Mayor is now Jeromy Farkas

---

## PHASE 4 — Data maintenance process  `💡 IDEA`

**Goal:** Keep data fresh without manual intervention after elections.

### Tasks
- [ ] Create `scripts/refresh_data.py` — script to re-scrape and validate all sources
- [ ] Add GitHub Action: run `refresh_data.py` monthly and open a PR if data changed
- [ ] Add election calendar to `data/election_dates.json` — trigger refresh after known dates
- [ ] Add `/api/data-status` endpoint — returns source, last_updated, known_issues per level
  ```json
  {
    "federal":    { "source": "openparliament.ca", "last_updated": "2025-04-29" },
    "provincial": { "source": "assnat.qc.ca",       "last_updated": "2024-10-01" },
    "municipal":  { "source": "static+scrape",       "last_updated": "2026-01-15" }
  }
  ```

---

## PHASE 5 — Other provinces (post-Québec)  `💡 IDEA`

Only if user traffic justifies the effort. Priority order by Francophone population:

| Province | Provincial source | Notes |
|----------|------------------|-------|
| Ontario | ola.org | Large French minority (Ottawa area) |
| New Brunswick | gnb.ca | Only officially bilingual province |
| Manitoba | gov.mb.ca | Franco-Manitoban community |
| Rest of Canada | — | Low priority for current audience |

---

## COMPLETED ✅

- ✅ Flask web app with postal code search
- ✅ AI-powered civic triage (Claude Haiku) — classifies situation to gov level
- ✅ 6-language support (EN, FR, ES, PT, ZH, TL)
- ✅ Email template modal with formal titles and contextual guide
- ✅ Client-side router (`/reps`, `/triage`) with History API
- ✅ Azure deployment (infocivic.ca) with CI/CD via GitHub Actions
- ✅ Google Analytics 4 + Azure Application Insights telemetry
- ✅ Security hardening (ProxyFix, rate limiting, security headers, input validation)
- ✅ Mobile-responsive UI (tabs, language dropdown, footer)
- ✅ Open Graph / SEO meta tags
- ✅ Data freshness audit test (`tests/test_data_freshness.py`)
- ✅ Maple leaf favicon

---

## KNOWN BUGS / QUICK FIXES  `📋`

- [ ] `tests/test_data_freshness.py` — fix Calgary Mayor ground truth (now Jeromy Farkas, not Gondek)
- [ ] Montréal and Québec City mayors missing from Represent API — investigate if it's
      a `level` classification issue or missing data entirely
- [ ] Language dropdown: verify positioning on iOS Safari (fixed positioning behaves
      differently with Safari's dynamic toolbar)

---

## ARCHITECTURE NOTES

```
Current (OpenNorth only):
  postal_code → RepresentClient → represent.opennorth.ca → Representative[]

Target (hybrid):
  postal_code ─┬→ ParliamentClient  → api.openparliament.ca  (federal)
               ├→ ANQClient         → assnat.qc.ca scraper   (QC provincial)
               ├→ QCMunicipalClient → static JSON + scraper  (QC municipal)
               └→ RepresentClient   → represent.opennorth.ca (other provinces, fallback)
                    ↓
               merge + deduplicate → Representative[]
```

The `RepresentClient` stays as a **fallback** for provinces not yet covered.
New clients produce the same `Representative` dataclass — the Flask app notices nothing.
```
