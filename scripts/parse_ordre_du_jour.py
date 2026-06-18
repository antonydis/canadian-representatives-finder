"""Fetch the Conseil municipal Ordinaire Ordre du jour for a given month,
download the PDF and extract items from sections 8 and 11 into JSON.

    python scripts/parse_ordre_du_jour.py june 2026
    python scripts/parse_ordre_du_jour.py june 2026 --out /tmp
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).parent.parent))
from laval_events import get_events

# Sections we care about
TARGET_SECTIONS = {
    "8":  "ÉTUDE ET ADOPTION DES RÈGLEMENTS SUIVANTS",
    "11": "PRÉSENTATION DES RECOMMANDATIONS DU COMITÉ EXÉCUTIF",
    "12": "DÉPÔT DE DOCUMENTS ADMINISTRATIFS",
    "13": "AVIS DE MOTION",
    "15": "DISCUSSIONS SUR LES PROPOSITIONS DÉPOSÉES PAR LES MEMBRES DU CONSEIL LORS D'UNE SÉANCE PRÉCÉDENTE",
}

_SD_RE      = re.compile(r'\bSD-\d{4}-\d+\b')
_ITEM_RE    = re.compile(r'^(\d+)\.(\d+)\s+(.*)')
_SECTION_RE = re.compile(r'^(\d+)\.\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]')
_DISTRICT_LINE_RE = re.compile(r'^District\(s\)\s*:\s*(.+)')
_NOISE_RE   = re.compile(
    r'^(Service du\s*Greffe|ORDRE DU JOUR|Généré le|Version \d|Page \d)',
    re.IGNORECASE,
)
_DISTRICT_ENTRY_RE = re.compile(r'(\d{2})\s*([^,]+)')


def _pdf_lines(path: Path) -> list[str]:
    lines = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or "").splitlines():
                line = line.strip()
                if line and not _NOISE_RE.match(line):
                    lines.append(line)
    return lines


def _parse_districts(raw: str) -> list[dict]:
    districts = []
    for m in _DISTRICT_ENTRY_RE.finditer(raw):
        district_id = m.group(1)
        name = m.group(2).strip().rstrip(",").strip()
        if name:
            districts.append({"id": district_id, "name": name})
    return districts


def _parse_items(lines: list[str]) -> dict[str, list[dict]]:
    """State-machine parser. Returns {section_number: [item, ...]}."""
    results: dict[str, list[dict]] = {k: [] for k in TARGET_SECTIONS}
    current_section: str | None = None
    current_item: dict | None = None
    in_district_continuation = False

    def _flush():
        nonlocal current_item
        if current_item and current_section in results:
            results[current_section].append(current_item)
        current_item = None

    for line in lines:
        # ── section heading ────────────────────────────────────────────────
        sec_m = _SECTION_RE.match(line)
        if sec_m:
            _flush()
            in_district_continuation = False
            sec_num = sec_m.group(1)
            current_section = sec_num if sec_num in TARGET_SECTIONS else None
            continue

        if current_section is None:
            continue

        # ── new sub-item ───────────────────────────────────────────────────
        item_m = _ITEM_RE.match(line)
        if item_m and item_m.group(1) == current_section:
            _flush()
            in_district_continuation = False
            current_item = {
                "item": f"{item_m.group(1)}.{item_m.group(2)}",
                "title": item_m.group(3).strip(),
                "sd_numbers": [],
                "districts": [],
            }
            continue

        if current_item is None:
            continue

        # ── SD numbers ─────────────────────────────────────────────────────
        sd_hits = _SD_RE.findall(line)
        if sd_hits:
            current_item["sd_numbers"].extend(sd_hits)
            in_district_continuation = False
            continue

        # ── district line ──────────────────────────────────────────────────
        dist_m = _DISTRICT_LINE_RE.match(line)
        if dist_m:
            raw = dist_m.group(1)
            current_item["districts"] = _parse_districts(raw)
            # If the line ends mid-district list (wrapped), flag continuation
            in_district_continuation = not raw.rstrip().endswith("districts") and \
                                       not _ITEM_RE.match(line)
            continue

        # ── district continuation (line-wrapped) ───────────────────────────
        if in_district_continuation:
            # If the previous district name ends with "-", the line starts
            # with the remainder of that name (e.g. "Coursol, 14Chomedey…")
            if current_item["districts"] and current_item["districts"][-1]["name"].endswith("-"):
                head, _, rest = line.partition(",")
                current_item["districts"][-1]["name"] += head.strip()
                line = rest.strip()
            if line:
                current_item["districts"].extend(_parse_districts(line))
            if not line.endswith(","):
                in_district_continuation = False
            continue

        # ── title continuation ─────────────────────────────────────────────
        if not line.startswith("Montants") and not line.startswith("CT :"):
            current_item["title"] += " " + line

    _flush()
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("month", help="Month name or number")
    parser.add_argument("year", nargs="?", type=int)
    parser.add_argument("--out", default=".", help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    def _version_key(e) -> float:
        return float((e.version or "0").replace(",", "."))

    # Find all matching documents, deduplicate to highest version
    events = get_events(args.month, args.year)
    targets = [
        e for e in events
        if e.seance_type == "Conseil municipal"
        and (e.sub_type or "").lower() == "ordinaire"
        and e.document_type == "Ordre du jour"
    ]

    if not targets:
        print("No Conseil municipal / Ordinaire / Ordre du jour found for that month.")
        sys.exit(1)

    if len(targets) > 1:
        best = max(targets, key=lambda e: (_version_key(e), e.date))
        skipped = [e for e in targets if e is not best]
        print(f"Found {len(targets)} uploads — keeping highest version (v{best.version}, {best.date}).")
        for s in skipped:
            print(f"  Skipping v{s.version} uploaded {s.date} ({s.filename})")
        print()
        targets = [best]

    for target in targets:
        print(f"Processing: {target.date}  {target.seance_type} ({target.sub_type})  →  {target.document_url}")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            pdf_path = Path(tmp.name)
        urllib.request.urlretrieve(target.document_url, pdf_path)

        lines = _pdf_lines(pdf_path)
        sections = _parse_items(lines)

        output = {
            "source": {
                "date": target.date.isoformat(),
                "seance_type": target.seance_type,
                "sub_type": target.sub_type,
                "document_url": target.document_url,
            },
            "sections": {
                f"{num}. {label}": sections[num]
                for num, label in TARGET_SECTIONS.items()
            },
        }

        out_file = out_dir / f"ordre_du_jour_{target.date.isoformat()}.json"
        out_file.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  Wrote {out_file}")

        for num, label in TARGET_SECTIONS.items():
            items = sections[num]
            print(f"  {num}. {label} — {len(items)} item(s)")
        print()


if __name__ == "__main__":
    main()
