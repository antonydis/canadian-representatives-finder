import json
from typing import Optional

from .models import Representative

LEVEL_LABELS = {
    "federal":    {"en": "Federal",    "fr": "Fédéral"},
    "provincial": {"en": "Provincial", "fr": "Provincial"},
    "municipal":  {"en": "Municipal",  "fr": "Municipal"},
}

LEVEL_ORDER = ["federal", "provincial", "municipal"]


def format_representatives_text(
    reps: list[Representative],
    postal_code: str,
    lang: str = "en",
) -> str:
    """Pretty-print representatives grouped by level (federal > provincial > municipal)."""
    if not reps:
        msg = {
            "en": f"No representatives found for {postal_code}.",
            "fr": f"Aucun représentant trouvé pour {postal_code}.",
        }
        return msg.get(lang, msg["en"])

    header = {
        "en": f"Representatives for postal code {postal_code}",
        "fr": f"Représentants pour le code postal {postal_code}",
    }
    lines = ["=" * 60, header.get(lang, header["en"]), "=" * 60, ""]

    by_level: dict[str, list[Representative]] = {lvl: [] for lvl in LEVEL_ORDER}
    for rep in reps:
        bucket = rep.level if rep.level in by_level else "municipal"
        by_level[bucket].append(rep)

    for level in LEVEL_ORDER:
        level_reps = by_level[level]
        if not level_reps:
            continue

        label = LEVEL_LABELS[level].get(lang, LEVEL_LABELS[level]["en"])
        lines.append(f"--- {label.upper()} ---")
        lines.append("")

        for rep in level_reps:
            lines.append(f"  {rep.elected_office}: {rep.name}")
            if rep.party_name:
                lines.append(f"  Party / Parti: {rep.party_name}")
            lines.append(f"  District: {rep.district_name}")
            phone = rep.get_phone()
            if phone:
                lines.append(f"  Phone / Tél.: {phone}")
            if rep.email:
                lines.append(f"  Email: {rep.email}")
            if rep.url:
                lines.append(f"  Web: {rep.url}")
            lines.append("")

    lines.append("=" * 60)
    note = {
        "en": "Data provided by the Represent API (represent.opennorth.ca)",
        "fr": "Données fournies par l'API Represent (represent.opennorth.ca)",
    }
    lines.append(note.get(lang, note["en"]))
    return "\n".join(lines)


def format_representatives_json(
    reps: list[Representative],
    postal_code: str,
) -> str:
    """Serialize representatives to a JSON string, grouped by level."""
    output = {
        "postal_code": postal_code,
        "total": len(reps),
        "representatives": [
            {
                "name": r.name,
                "elected_office": r.elected_office,
                "level": r.level,
                "party": r.party_name,
                "district": r.district_name,
                "representative_set": r.representative_set_name,
                "email": r.email,
                "phone": r.get_phone(),
                "url": r.url,
                "personal_url": r.personal_url,
                "photo_url": r.photo_url,
            }
            for r in reps
        ],
    }
    return json.dumps(output, ensure_ascii=False, indent=2)


def filter_by_level(
    reps: list[Representative],
    level: str,
) -> list[Representative]:
    """Filter representatives by level: 'federal', 'provincial', or 'municipal'."""
    return [r for r in reps if r.level == level]
