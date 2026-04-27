"""
Data freshness audit — compares Represent API data against known ground truth.

Run with:  python -m pytest tests/test_data_freshness.py -v
Or direct: python tests/test_data_freshness.py

Each test checks a specific postal code and asserts what the correct
representative should be based on public electoral records.
Update GROUND_TRUTH when elections occur.

Sources used to build this list:
  Federal MPs  : https://www.ourcommons.ca (after Apr 28 2025 election)
  QC Provincial: https://www.assnat.qc.ca
  ON Provincial: https://www.ola.org
  Municipal    : official city websites
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from src.api_client import RepresentClient

client = RepresentClient()

# ── GROUND TRUTH ──────────────────────────────────────────────────────────────
# Format: postal_code → list of expected reps
# Each entry: { "name_contains": str, "office": str, "level": str }
# name_contains: substring of the representative's full name (case-insensitive)

GROUND_TRUTH = [

    # ── MONTRÉAL ──────────────────────────────────────────────────────────────
    {
        "postal": "H2X1Y6",   # Plateau-Mont-Royal
        "label": "Montréal Mayor",
        "name_contains": "Martínez Ferrada",   # elected Nov 2025
        "office_contains": "Mayor",
        "level": "municipal",
    },
    {
        "postal": "H2X1Y6",
        "label": "Montréal federal MP (Laurier–Sainte-Marie)",
        "name_contains": "Boulerice",           # re-check after Apr 2025 election
        "office_contains": "MP",
        "level": "federal",
    },

    # ── TORONTO ───────────────────────────────────────────────────────────────
    {
        "postal": "M5V2T6",   # downtown Toronto
        "label": "Toronto Mayor",
        "name_contains": "Olivia Chow",         # elected Jun 2023
        "office_contains": "Mayor",
        "level": "municipal",
    },
    {
        "postal": "M5V2T6",
        "label": "Toronto Centre federal MP",
        "name_contains": "",                    # fill in after verifying Apr 2025 result
        "office_contains": "MP",
        "level": "federal",
        "skip": True,  # unknown — needs manual verification
    },

    # ── OTTAWA ────────────────────────────────────────────────────────────────
    {
        "postal": "K1P5G8",   # downtown Ottawa
        "label": "Ottawa Mayor",
        "name_contains": "Mark Sutcliffe",      # elected Oct 2022
        "office_contains": "Mayor",
        "level": "municipal",
    },

    # ── VANCOUVER ─────────────────────────────────────────────────────────────
    {
        "postal": "V6B1A1",   # downtown Vancouver
        "label": "Vancouver Mayor",
        "name_contains": "Ken Sim",             # elected Oct 2022
        "office_contains": "Mayor",
        "level": "municipal",
    },

    # ── CALGARY ───────────────────────────────────────────────────────────────
    {
        "postal": "T2P1J9",   # downtown Calgary
        "label": "Calgary Mayor",
        "name_contains": "Farkas",              # Jeromy Farkas, elected Oct 2025
        "office_contains": "Mayor",
        "level": "municipal",
    },

    # ── QUÉBEC CITY ───────────────────────────────────────────────────────────
    {
        "postal": "G1R3Z2",   # Vieux-Québec
        "label": "Québec City Mayor",
        "name_contains": "Marchand",            # Bruno Marchand, re-elected Nov 2025
        "office_contains": "Mayor",
        "level": "municipal",
    },

]


# ── TEST RUNNER ───────────────────────────────────────────────────────────────

def find_rep(reps, office_contains, level):
    """Return first rep matching office and level."""
    for r in reps:
        office_match = office_contains.lower() in (r.elected_office or "").lower()
        level_match  = level.lower() in (r.level or "").lower()
        if office_match and level_match:
            return r
    return None


@pytest.mark.parametrize("case", [c for c in GROUND_TRUTH if not c.get("skip")])
def test_representative_is_current(case):
    postal = case["postal"]
    reps   = client.get_representatives_by_postal_code(postal)

    rep = find_rep(reps, case["office_contains"], case["level"])

    assert rep is not None, (
        f"[{case['label']}] No {case['level']} rep with office "
        f"'{case['office_contains']}' found for {postal}.\n"
        f"  Got: {[(r.name, r.elected_office, r.level) for r in reps]}"
    )

    if case["name_contains"]:
        assert case["name_contains"].lower() in rep.name.lower(), (
            f"[{case['label']}] Expected name to contain '{case['name_contains']}' "
            f"but API returned '{rep.name}'.\n"
            f"  ⚠️  DATA IS OUTDATED in Represent API."
        )


# ── QUICK PRINT REPORT (run directly, not via pytest) ────────────────────────

if __name__ == "__main__":
    print("\n=== InfoCivic · Data Freshness Audit ===\n")
    errors = []
    skipped = []

    for case in GROUND_TRUTH:
        if case.get("skip"):
            skipped.append(case["label"])
            print(f"  [SKIP]    {case['label']}")
            continue

        postal = case["postal"]
        try:
            reps = client.get_representatives_by_postal_code(postal)
            rep  = find_rep(reps, case["office_contains"], case["level"])

            if rep is None:
                msg = f"NOT FOUND (office='{case['office_contains']}', level='{case['level']}')"
                print(f"  [MISSING] {case['label']} -- {msg}")
                errors.append((case["label"], msg))
            elif case["name_contains"] and case["name_contains"].lower() not in rep.name.lower():
                msg = f"Expected '{case['name_contains']}' | API returned '{rep.name}'"
                print(f"  [STALE]   {case['label']} -- {msg}")
                errors.append((case["label"], msg))
            else:
                print(f"  [OK]      {case['label']} -- {rep.name}")

        except Exception as e:
            print(f"  [ERROR]   {case['label']} -- {e}")
            errors.append((case["label"], str(e)))

    print(f"\n{'-'*55}")
    print(f"  Checked : {len(GROUND_TRUTH) - len(skipped)}")
    print(f"  Skipped : {len(skipped)}")
    print(f"  Issues  : {len(errors)}")
    if errors:
        print("\n  Issues to report to OpenNorth:")
        for label, msg in errors:
            print(f"    • {label}: {msg}")
    print()
