# Public civic-service directory — InfoCivic

Public, versioned research dataset for directing Canadian residents to relevant **official services**, not merely to an elected representative.

## Status (2026-11-22)

| File | Rows | Status |
| --- | ---: | --- |
| `inventory-organizations.csv` | 420 | **Candidate institutions**, NOT independently verified service destinations |
| `candidate-service-routes.csv` | 6 | Montréal service-page candidates; applicability and page requirements still require checking |

The organization inventory is a **research seed**, not an exhaustive list, and should not be used to infer that all 420 entries are current or independently verified. Several entries use a **general government directory URL** instead of a body-specific URL; **some municipal entries inherit a generic Montréal source that does not establish their identity or jurisdiction**. Official names can also change. The `ultima_revision` column is the compilation date, **not an individual independent verification date**.

**Do not surface these rows directly as verified contact recommendations in production.** In particular, do not use `enlace_fuente` as a case-specific service URL and do not treat an empty `url_tramite` as permission to generate one.

## Data model

Organization inventory columns:
- `id`: stable inventory record ID (not an official agency identifier)
- `nivel`, `tipo`, `nombre_oficial`, `ambito`: provisional metadata
- `tematica`: topic classification (`Por clasificar` = not classified)
- `enlace_fuente`: source directory or source page, **not necessarily a contact route**
- `estado_validacion`: recorded validation state
- `canal_recomendado`, `url_tramite`: intentionally empty until verified
- `ultima_revision`: inventory compilation date

Candidate service routes columns:
- `tematica`, `problema_ciudadano`, `nivel`, `organismo_o_canal`
- `url_oficial`, `ambito`, `estado`, `revisado`

## Promotion to a production-ready service

Before an entry can be recommended:
1. Verify on the **official site** that the service accepts the described issue.
2. Confirm **territorial scope** (municipality/borough/province), eligibility, and exceptions.
3. Record an official **direct action URL**, relevant channel, source URL, verification date and human reviewer.
4. Assign an explicit **approved** state; invalidate or expire records when the source changes.
5. Test ambiguous postal codes and mixed jurisdictions; no match means **no specific recommendation**.

A future machine-consumable `approved-services.json` should contain only reviewed entries using `service.schema.json`. Its contents must be bundled into Cloudflare Worker **at build time**, so live requests never depend on GitHub's uptime or API limits.

Routing design:
`Citizen's problem + postal context -> classify issue -> search approved services by topic and territory -> validate jurisdiction -> show official link + explanation`.

OpenAI may interpret intent and explain a **server-selected** approved contact, but must **never fabricate a URL, assert unverified eligibility, or override a citizen's chosen representative**. If no safe match exists, preserve the existing triage flow. Do not log raw citizen messages in this public repository.

## Contributions

Please use a PR with the original official source, a clear description of the issue handled, municipality/coverage, and verification date. Review official sources before moving records into approved service data. Do not submit private correspondence, addresses, phone numbers or user messages.

## Initial sources

- Québec ministries and bodies: https://www.quebec.ca/gouvernement/ministeres-organismes
- Canada departments and agencies: https://www.canada.ca/en/government/dept.html
- Québec municipalities directory: https://www.quebec.ca/gouvernement/portrait-quebec/repertoire-municipalites
- Montréal: https://montreal.ca/nous-joindre

See the CSV for row-level source links and provisional status.
