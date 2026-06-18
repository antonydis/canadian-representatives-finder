"""Parse a Conseil municipal Procès-verbal and extract:
  - adopted decisions  (status: approved)
  - avis de motion     (status: pending — future vote announced but not yet held)

    python scripts/parse_proces_verbal.py june 2026
    python scripts/parse_proces_verbal.py june 2026 --out /tmp
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

_SD_RE      = re.compile(r'\bSD-\d{4}-\d+\b')
_BLOCK_RE   = re.compile(r'\n(?=CM-\d{8}-\d+\s)')
_STATUS_RE  = re.compile(r'\b(ADOPTÉ|ADOPTÉE|REJETÉ|REJETÉE|REPORTÉ|ANNULÉ|AJOURNÉ)\b')
_CM_HDR_RE  = re.compile(r'^CM-\d{8}-\d+\s+(.+)')
_NOISE_RE   = re.compile(
    r'^(Séance du|Volume \d|Page \d)',
    re.IGNORECASE,
)


def _pdf_text(path: Path) -> str:
    lines = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or "").splitlines():
                line = line.strip()
                if line and not _NOISE_RE.match(line):
                    lines.append(line)
    return "\n".join(lines)


def _parse_pv(text: str) -> tuple[list[dict], list[dict]]:
    """Return (adopted, pending) lists of {title, sd_numbers, resolution_id}."""
    adopted = []
    pending = []

    blocks = _BLOCK_RE.split(text)
    for block in blocks:
        first_line = block.strip().splitlines()[0] if block.strip() else ""
        hdr = _CM_HDR_RE.match(first_line)
        if not hdr:
            continue

        resolution_title = hdr.group(1).strip()
        sd_numbers = _SD_RE.findall(block)
        status_m = _STATUS_RE.search(block)

        # Build a clean human-readable title from the resolution body
        # (strip the CM-YYYYMMDD-NNN header line and SD/page artifacts)
        body_lines = []
        for line in block.strip().splitlines()[1:]:
            line = line.strip()
            if _SD_RE.match(line) or not line:
                break
            body_lines.append(line)
        body = " ".join(body_lines).strip()

        entry = {
            "resolution_id": first_line.split()[0],
            "resolution_title": resolution_title,
            "body": body,
            "sd_numbers": sd_numbers,
        }

        if "AVIS DE MOTION" in resolution_title:
            pending.append(entry)
        elif status_m:
            entry["status"] = status_m.group(1)
            adopted.append(entry)

    return adopted, pending


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("month", help="Month name or number")
    parser.add_argument("year", nargs="?", type=int)
    parser.add_argument("--out", default=".", help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    events = get_events(args.month, args.year)
    pvs = [
        e for e in events
        if e.seance_type == "Conseil municipal"
        and (e.sub_type or "").lower() == "ordinaire"
        and e.document_type == "Procès-verbal"
    ]

    if not pvs:
        print("No Procès-verbal found — minutes may not be published yet.")
        sys.exit(1)

    # Pick highest version
    pv = max(pvs, key=lambda e: (float((e.version or "0").replace(",", ".")), e.date))
    print(f"Using: {pv.date}  v{pv.version}  {pv.filename}\n")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        pdf_path = Path(tmp.name)
    urllib.request.urlretrieve(pv.document_url, pdf_path)

    text = _pdf_text(pdf_path)
    adopted, pending = _parse_pv(text)

    output = {
        "source": {
            "date": pv.date.isoformat(),
            "document_url": pv.document_url,
        },
        "adopted": adopted,
        "pending": pending,
    }

    out_file = out_dir / f"proces_verbal_{pv.date.isoformat()}.json"
    out_file.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out_file}")
    print(f"  {len(adopted)} adopted,  {len(pending)} pending (avis de motion)")

    if pending:
        print("\nPending items (vote at future session):")
        for p in pending:
            print(f"  {p['resolution_id']}  {p['sd_numbers']}")
            print(f"    {p['body'][:100]}")


if __name__ == "__main__":
    main()
