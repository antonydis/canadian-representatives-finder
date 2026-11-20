import { cpSync, copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(".");
const out = join(root, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "web/static"), join(out, "static"), { recursive: true });
const index = readFileSync(join(root, "web/templates/index.html"), "utf8");
const laval = readFileSync(join(root, "web/templates/laval.html"), "utf8");
writeFileSync(join(out, "index.html"), index);
writeFileSync(join(out, "laval.html"), laval);
mkdirSync(join(out, "reps"), { recursive: true });
mkdirSync(join(out, "triage"), { recursive: true });
writeFileSync(join(out, "reps/index.html"), index);
writeFileSync(join(out, "triage/index.html"), index);
const translations = {};
for (const name of readdirSync(join(root, "web/translations"))) {
  if (name.endsWith(".json")) {
    translations[name.slice(0, -5)] = JSON.parse(readFileSync(join(root, "web/translations", name), "utf8"));
  }
}
mkdirSync(join(out, "api"), { recursive: true });
// /api/translations is served by the Worker, not the static asset router.
writeFileSync(join(root, "src-worker/translations.generated.json"), JSON.stringify(translations));
console.log("Built InfoCivic static assets and translation bundle.");
