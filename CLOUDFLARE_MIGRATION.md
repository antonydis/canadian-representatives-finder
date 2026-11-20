# InfoCivic on Cloudflare Workers (migration)

This branch migrates the application from Azure Flask/Python to a **native JavaScript Cloudflare Worker**, preserving the existing HTML, CSS, JavaScript, translations, and URL paths. The original Python source remains in the repository as reference but is no longer installed/deployed.

## Cloudflare Workers Builds

- Git repository: antonydis/canadian-representatives-finder
- Production branch: `cloudflare-migration` (until smoke tests pass)
- Root directory: `/`
- Build command: **leave empty**
- Deploy command: **`npm run deploy`**
- Preview command: `npx wrangler dev` (optional)
- Domain: use the Worker `workers.dev` URL first; connect `infocivic.ca` only after end-to-end verification.

The `deploy` script automatically runs `npm run build` to copy static files to `dist/`, generate the translations bundle, and then runs Wrangler. No Python or Pywrangler is required.

## API endpoints

- `GET /api/health`: status, whether AI and D1 are configured; never exposes secrets.
- `GET /api/translations`: six language catalogs.
- `POST /api/search`: OpenNorth representatives with manual InfoCivic overrides. **Data freshness is not verified; this is not an official source.** Postal codes may span multiple districts.
- `POST /api/classify-situation`: Anthropic AI when `ANTHROPIC_API_KEY` is set; clearly marked rule-based fallback otherwise.
- `POST /api/feedback`: requires D1 binding `DB`.
- `POST /api/laval/subscribe`: requires D1 binding `DB` and explicit consent.
- `GET /api/councillor`: currently returns HTTP 501 until address-to-district matching is safely implemented (prevents misidentification).

## Configuring optional Anthropic

In Cloudflare Worker settings, add `ANTHROPIC_API_KEY` as an encrypted **secret**. Do not store it in git or a plain variable. Model override, if needed: `ANTHROPIC_MODEL`.

## Enabling durable data storage

1. Create a Cloudflare **D1** database named `infocivic-db`.
2. Apply `migrations/0001_initial.sql` in its console, or run `npx wrangler d1 execute infocivic-db --remote --file=migrations/0001_initial.sql` from an authenticated local environment.
3. Add a binding named `DB` to this Worker, pointing to the new D1 database. Do not hardcode a database ID until created.
4. Redeploy and check `/api/health` shows `storage_configured: true`.

The API returns HTTP 503 rather than silently losing feedback/subscriptions when DB is missing. **SMS sending is not implemented**; subscriptions alone do not send reminders. Before collecting phone numbers publicly, verify consent, privacy notice, retention and operational compliance.

## Validation before production

- Open `/`, `/reps`, `/triage`, `/laval`; verify CSS and JS.
- Check `/api/health` and `/api/translations`.
- Test multiple postal codes for Montréal, Laval, Québec City and Ontario. Confirm names and offices against **current official sources**; OpenNorth data may be outdated.
- Test the AI classifier with/without the secret, confirm no accidental false classification.
- Connect D1 and verify feedback and Laval signups, including duplicate handling and consent.
- Confirm Cloudflare rate limits/Turnstile against abuse before opening forms to the public.
- Disable the legacy Azure GitHub Action when merging to main.
- Only then attach `infocivic.ca`.

## Outstanding limitations

- Federal MPs were previously enriched from an official Parliament source in Python. This migration currently uses the OpenNorth response plus local corrections; official federal reconciliation must be ported before asserting representative correctness.
- Exact municipal district assignment from only a postal prefix is insufficient. Borough overrides are only applied to exact upstream district matches.
- The old coordinate councillor endpoint is deliberately unavailable pending proper geographic lookup.
- No full end-to-end production deployment or external API request has yet been verified.
