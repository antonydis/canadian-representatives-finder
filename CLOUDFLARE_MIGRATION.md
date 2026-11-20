# InfoCivic Cloudflare migration (work in progress)

Branch: `cloudflare-migration`. Azure production branch `main` is unchanged.

## Proposed target

Cloudflare Python Workers + Flask/WSGI, using the existing Flask routes and
vanilla-JavaScript frontend. This is a configuration scaffold, **not yet a
verified deployment**.

## Deployment configuration

- Worker name: `infocivic`
- Wrangler config: `wrangler.jsonc`
- Build command: empty
- Deploy command: `uv run pywrangler deploy` (not `npx wrangler deploy`)
- Production branch: `cloudflare-migration`
- Domain: test `workers.dev` first, attach `infocivic.ca` after smoke tests

## Remaining blocking work

1. Validate package installation and Flask entrypoint under Python Workers.
2. Ensure Flask template, translation JSON, and static CSS/JS files are bundled
   and correctly served (prefer Workers Static Assets).
3. Check outbound HTTP APIs: OpenNorth and Anthropic; ensure secrets are loaded
   through Cloudflare Worker bindings rather than local .env.
4. Replace append-to-local-file feedback and Laval signup endpoints with a
   durable database such as Cloudflare D1.
5. Replace in-memory rate limiting with a durable / platform solution.
6. Remove Anthropic key-prefix disclosure from /api/health.
7. Verify representative freshness and run browser/API tests before domain setup.
8. Disable or replace the Azure-only GitHub Action when switching production.

Do not publicly deploy or connect the domain before the blockers are resolved.

## Cloudflare Git build diagnostic (2026-11-20)

Cloudflare initial builds ran against `main` even after the dashboard's
production-branch setting was changed. Build log reported
`pyproject.toml not found`. This file exists on `cloudflare-migration`.

This commit is intentionally pushed to `cloudflare-migration` to trigger a
**new Git-connected build** rather than retry a previous `main` build.
Verify the branch label on the new deployment before interpreting any errors.
The worker is not production-ready, and no DNS change is authorized.
