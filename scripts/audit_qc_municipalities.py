"""
Quebec Municipal Data Audit
============================
Queries the live API (OpenNorth + overrides) for one postal code per QC municipality
and reports what mayor / municipal reps are returned.

Run: python scripts/audit_qc_municipalities.py

Output columns:
  [OK]      Mayor found and name matches expected
  [STALE]   Mayor found but name doesn't match expected
  [MISSING] No mayor found at all
  [CHECK]   No expected name set — manual verification needed
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api_client import RepresentClient

client = RepresentClient()

# ── QC MUNICIPALITIES ─────────────────────────────────────────────────────────
# One representative postal code per city + expected mayor (post Nov-2025 elections)
# Sources: ville.*.qc.ca official sites, Elections Quebec
# expected_mayor: set to "" if unknown — will show as [CHECK]

QC_CITIES = [
    # ── GRANDS CENTRES ────────────────────────────────────────────────────────
    {"city": "Montreal",            "postal": "H2X1Y6", "expected_mayor": "Soraya Martinez Ferrada"},
    {"city": "Quebec City",         "postal": "G1R3Z2", "expected_mayor": "Bruno Marchand"},
    {"city": "Laval",               "postal": "H7G2M2", "expected_mayor": "Stephane Boyer"},
    {"city": "Gatineau",            "postal": "J8X3X7", "expected_mayor": "France Belisle"},
    {"city": "Longueuil",           "postal": "J4H1V9", "expected_mayor": "Catherine Fournier"},
    {"city": "Sherbrooke",          "postal": "J1H1Z3", "expected_mayor": "Evelyne Beaudin"},
    {"city": "Saguenay",            "postal": "G7H3Z5", "expected_mayor": "Julie Dufour"},
    {"city": "Levis",               "postal": "G6V3P8", "expected_mayor": "Gilles Lehouillier"},
    {"city": "Trois-Rivieres",      "postal": "G8T1Z4", "expected_mayor": "Jean Lamarche"},
    {"city": "Terrebonne",          "postal": "J6W1A1", "expected_mayor": ""},
    # ── COURONNE NORD ─────────────────────────────────────────────────────────
    {"city": "Repentigny",          "postal": "J6A1A1", "expected_mayor": ""},
    {"city": "Blainville",          "postal": "J7C1A1", "expected_mayor": ""},
    {"city": "Saint-Jerome",        "postal": "J7Y1S9", "expected_mayor": "Marc Bourcier"},
    {"city": "Mirabel",             "postal": "J7J1A1", "expected_mayor": ""},
    {"city": "Boisbriand",          "postal": "J7H1A1", "expected_mayor": ""},
    {"city": "Mascouche",           "postal": "J7K1A1", "expected_mayor": ""},
    {"city": "Rosemere",            "postal": "J7A1A1", "expected_mayor": ""},
    {"city": "Sainte-Therese",      "postal": "J7E1A1", "expected_mayor": ""},
    {"city": "Saint-Eustache",      "postal": "J7R1A1", "expected_mayor": ""},
    # ── COURONNE SUD ──────────────────────────────────────────────────────────
    {"city": "Brossard",            "postal": "J4Y1A1", "expected_mayor": "Doreen Assaad"},
    {"city": "Saint-Jean-sur-Richelieu", "postal": "J3B1A1", "expected_mayor": ""},
    {"city": "Chateauguay",         "postal": "J6J1A1", "expected_mayor": ""},
    {"city": "Vaudreuil-Dorion",    "postal": "J7V1A1", "expected_mayor": ""},
    {"city": "Sainte-Julie",        "postal": "J3E1A1", "expected_mayor": ""},
    {"city": "Saint-Constant",      "postal": "J5A1A1", "expected_mayor": ""},
    {"city": "Chambly",             "postal": "J3L1A1", "expected_mayor": ""},
    # ── REGIONS ───────────────────────────────────────────────────────────────
    {"city": "Drummondville",       "postal": "J2C1A1", "expected_mayor": "Stephane Labrie"},
    {"city": "Granby",              "postal": "J2G1A1", "expected_mayor": ""},
    {"city": "Saint-Hyacinthe",     "postal": "J2S1A1", "expected_mayor": ""},
    {"city": "Victoriaville",       "postal": "G6P1A1", "expected_mayor": ""},
    {"city": "Rouyn-Noranda",       "postal": "J9X1A1", "expected_mayor": ""},
    {"city": "Val-d'Or",            "postal": "J9P1A1", "expected_mayor": ""},
    {"city": "Rimouski",            "postal": "G5L1A1", "expected_mayor": ""},
    {"city": "Sept-Iles",           "postal": "G4R1A1", "expected_mayor": ""},
    {"city": "Baie-Comeau",         "postal": "G4Z1A1", "expected_mayor": ""},
    {"city": "Alma",                "postal": "G8B1A1", "expected_mayor": ""},
    {"city": "Rouyn-Noranda",       "postal": "J9X1A1", "expected_mayor": ""},
    {"city": "Shawinigan",          "postal": "G9N1A1", "expected_mayor": ""},
    {"city": "Joliette",            "postal": "J6E1A1", "expected_mayor": ""},
    {"city": "Saint-Georges",       "postal": "G5Y1A1", "expected_mayor": ""},
]

# Remove duplicates
seen_postals = set()
QC_CITIES_DEDUP = []
for c in QC_CITIES:
    if c["postal"] not in seen_postals:
        QC_CITIES_DEDUP.append(c)
        seen_postals.add(c["postal"])


def normalize(s):
    """Lowercase + remove accents for fuzzy name matching."""
    import unicodedata
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )


def find_mayor(reps):
    MAYOR_KEYWORDS = ["mayor", "maire", "warden", "reeve"]
    for r in reps:
        office = (r.elected_office or "").lower()
        if any(kw in office for kw in MAYOR_KEYWORDS):
            return r
    return None


def run_audit():
    print("\n=== InfoCivic — Quebec Municipal Audit ===")
    print(f"{'City':<28} {'Status':<10} {'API Returns':<35} {'Expected'}")
    print("-" * 100)

    results = {"ok": [], "stale": [], "missing": [], "check": []}

    for entry in QC_CITIES_DEDUP:
        city    = entry["city"]
        postal  = entry["postal"]
        expected = entry["expected_mayor"]

        try:
            reps   = client.get_representatives_by_postal_code(postal)
            mayor  = find_mayor(reps)

            if mayor is None:
                status = "[MISSING]"
                api_name = "-- no mayor found --"
                results["missing"].append(entry)
            elif not expected:
                status = "[CHECK]"
                api_name = mayor.name
                results["check"].append({**entry, "api_mayor": mayor.name})
            elif normalize(expected) in normalize(mayor.name) or normalize(mayor.name) in normalize(expected):
                status = "[OK]    "
                api_name = mayor.name
                results["ok"].append(entry)
            else:
                status = "[STALE] "
                api_name = mayor.name
                results["stale"].append({**entry, "api_mayor": mayor.name})

        except Exception as e:
            status   = "[ERROR] "
            api_name = str(e)[:50]
            results["missing"].append({**entry, "error": str(e)})

        print(f"  {city:<26} {status:<10} {api_name:<35} {expected}")

    # Summary
    print("\n" + "=" * 100)
    print(f"  Total checked : {len(QC_CITIES_DEDUP)}")
    print(f"  OK            : {len(results['ok'])}")
    print(f"  Stale         : {len(results['stale'])}")
    print(f"  Missing mayor : {len(results['missing'])}")
    print(f"  Need check    : {len(results['check'])}")

    if results["stale"]:
        print("\n  STALE — need override:")
        for e in results["stale"]:
            print(f"    {e['city']:<28} API: {e['api_mayor']:<30} Expected: {e['expected_mayor']}")

    if results["missing"]:
        print("\n  MISSING mayor — investigate:")
        for e in results["missing"]:
            print(f"    {e['city']:<28} postal: {e['postal']}")

    if results["check"]:
        print("\n  NEED MANUAL CHECK (no expected name set):")
        for e in results["check"]:
            print(f"    {e['city']:<28} API returns: {e['api_mayor']}")

    print()


if __name__ == "__main__":
    run_audit()
