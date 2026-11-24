# InfoCivic P0 — Data reliability and citizen trust

Status: in progress (November 20, 2026). This is not a declaration of data accuracy.

## Shipped safeguards in `cloudflare-migration`

1. Flag disagreements and multiple districts between OpenNorth centroid / concordance representative matches.
2. Mark representative results as **unverified** and display official verification links in search UI.
3. Avoid silently assigning an unrecognized free-text issue to the municipal government (ask for clarification).
4. Suppress unimplemented Laval SMS signup and popup until a real delivery and opt-out system exists.
5. Remove full postal codes and free-text civic complaints from Google Analytics events.
6. Restrict risky municipal overrides so a 3-character postal prefix does not automatically inject every councillor in a municipality.
7. Add unit tests for postal-code validity and electoral district ambiguity.

## Remaining P0 blockers before describing the directory as verified

### Federal

- Source of truth: House of Commons current members and open data:
  https://www.ourcommons.ca/en/open-data
- Geographic cross-check: Elections Canada postal-code/district search:
  https://www.elections.ca/Scripts/VIS/FindED?L=e&PAGEID=20&QID=-1
- Implement an automated reconciliation of member ID, riding, affiliation, contacts and last successful source sync.
- Treat Parliament vacancies, by-elections, riding renames and party changes as expected events.
- Do **not** assume an older source's federal riding maps one-to-one to new electoral boundaries.

### Québec provincial

- Source of truth: Assemblée nationale current members and the updated 2026 election results.
- Reconcile all current Québec provincial seats and vacancies, not merely a static list of 2025 names.
- Validate distinct postal codes that may cross riding boundaries, using official geometry/address lookup when required.
- Source: https://www.assnat.qc.ca/fr/deputes/rapport-liste-depute.html

### Municipal

- Establish official city/ward datasets for Montréal, Laval and Québec City.
- Recheck updates since the 2025 municipal elections and changes to officeholders.
- Never use the first three postal-code characters (FSA) as evidence of an exact municipal ward.
- For unresolved or ambiguous streets, offer official address search rather than selecting a councillor.

## Required response contract (future verified data release)

Each representative response should contain:
- source_url and source_type (official / secondary / manual)
- source_checked_at and representative_verified_at (distinct dates)
- validation_status (verified / needs_review / ambiguous / unavailable)
- jurisdiction and district/ward identifier
- notes for electoral transitions, vacancies or conflicting sources

Until these fields are backed by actual checks, InfoCivic should explicitly display unverified results.

## Citizen help — next phase before OpenAI

Build a controlled service/agency directory keyed by jurisdiction, province/municipality, problem type, and official URL. For each situation, distinguish:
1. Primary government service/agency to contact.
2. How to file or escalate a request.
3. Representative contact only when relevant to an unresolved issue.
4. Source URL, last verification, and when the user should seek a different service.
5. If uncertain, ask one targeted clarifying question; never default unknown issues to municipal.

OpenAI will only explain and select from a validated service registry, returning structured JSON and references. Never let the model invent directory entries.

## QA acceptance gate

- Postal cases: valid, invalid, unmatched, shared/multiple districts, city boundary, province boundary and changed riding.
- Representatives: current, replaced, vacant, missing email/phone, duplicate results.
- Failure modes: OpenNorth 404/503, official source unavailable, conflicting results, timeouts.
- UX: clearly show source/freshness/ambiguity, accessible errors and focus, keyboard/screen reader.
- Verify data freshness at actual official sources; integration tests with fixtures are not proof of current facts.
- Track corrections and data refresh alerts without exposing postal codes or descriptions to analytics.

Do not merge to `main` or advertise definitive representative accuracy until this release gate is met.
