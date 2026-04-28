"""
Build Montreal borough override rules from the official CSV.
Source: liste_elus_montreal.csv (from donnees.montreal.ca)

Generates:
  data/mtl_postal_arrondissement.json  — FSA prefix → arrondissement
  data/mtl_borough_overrides.json      — inject_all rules for all 19 boroughs

Run: python scripts/build_mtl_overrides.py
"""

import csv, json, re, sys
from pathlib import Path
from io import StringIO

ROOT = Path(__file__).parent.parent

# ── Postal prefix → arrondissement (derived from Wikipedia + borough office addresses) ──
# Sources:
#   Wikipedia "List of postal codes of Canada: H"
#   Borough office addresses in the CSV (ground truth for at least 1 FSA per borough)
#
# NOTE: Some FSAs span a Montreal borough AND a demerged municipality (Westmount, DDO, etc.)
# We include them when the Montreal arrondissement is the predominant area.
# Excluded (demerged, not Montreal boroughs): H3Y/H3Z (Westmount), H3P/H4P (Mont-Royal),
#   H4V/H4W (Côte-Saint-Luc), H9J (Kirkland), H9R (Pointe-Claire), H9S (Dorval/Pointe-Claire),
#   H9W (Beaconsfield), H4Y (Dorval), H9P (Dorval), H9B (DDO), H9G (DDO), H4X (Mtl-Ouest)

POSTAL_MAP = {
    # Ahuntsic-Cartierville (office: H2N 2H8)
    "H2B": "Ahuntsic-Cartierville",   # Sault-au-Récollet
    "H2C": "Ahuntsic-Cartierville",   # Central Ahuntsic
    "H2M": "Ahuntsic-Cartierville",   # East Ahuntsic
    "H2N": "Ahuntsic-Cartierville",   # Southeast Ahuntsic ✓ confirmed (office)
    "H3L": "Ahuntsic-Cartierville",   # Southwest Ahuntsic
    "H3M": "Ahuntsic-Cartierville",   # Northeast Cartierville
    "H4J": "Ahuntsic-Cartierville",   # Central Cartierville
    "H4K": "Ahuntsic-Cartierville",   # Southwest Cartierville

    # Anjou (office: H1K 4B9)
    "H1J": "Anjou",                   # West Anjou
    "H1K": "Anjou",                   # East Anjou ✓ confirmed (office)

    # Côte-des-Neiges–Notre-Dame-de-Grâce (office: H3X 2H9)
    "H3S": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # North CDN
    "H3T": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # NE CDN (U de M)
    "H3V": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # East CDN
    "H3W": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # SW CDN
    "H3X": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # Snowdon/N-NDG ✓ confirmed (office)
    "H4A": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # NE NDG
    "H4B": "Côte-des-Neiges–Notre-Dame-de-Grâce",  # SW NDG

    # L'Île-Bizard–Sainte-Geneviève (office: H9C 1G9)
    "H9C": "L'Île-Bizard–Sainte-Geneviève",        # NE L'Île-Bizard ✓ confirmed (office)
    "H9E": "L'Île-Bizard–Sainte-Geneviève",        # SW L'Île-Bizard

    # Lachine (office: H8S 2N4)
    "H8S": "Lachine",                  # East Lachine ✓ confirmed (office)
    "H8T": "Lachine",                  # West Lachine

    # LaSalle (office: H8R 4A8)
    "H8N": "LaSalle",                  # NW LaSalle
    "H8P": "LaSalle",                  # SE LaSalle
    "H8R": "LaSalle",                  # LaSalle & Ville-Saint-Pierre ✓ confirmed (office)

    # Le Plateau-Mont-Royal (office: H2T 3E6)
    "H2H": "Le Plateau-Mont-Royal",   # North Plateau
    "H2J": "Le Plateau-Mont-Royal",   # N-Central Plateau
    "H2T": "Le Plateau-Mont-Royal",   # West Plateau (Mile End) ✓ confirmed (office)
    "H2W": "Le Plateau-Mont-Royal",   # S-Central Plateau
    "H2X": "Le Plateau-Mont-Royal",   # SE Plateau

    # Le Sud-Ouest (office: H4C 2K4)
    "H3C": "Le Sud-Ouest",            # Griffintown
    "H3J": "Le Sud-Ouest",            # Petite-Bourgogne
    "H3K": "Le Sud-Ouest",            # Pointe-Saint-Charles
    "H4C": "Le Sud-Ouest",            # Saint-Henri ✓ confirmed (office)
    "H4E": "Le Sud-Ouest",            # Ville-Émard

    # Mercier–Hochelaga-Maisonneuve (office: H1N 1E1)
    "H1L": "Mercier–Hochelaga-Maisonneuve",  # North Mercier
    "H1M": "Mercier–Hochelaga-Maisonneuve",  # West Mercier
    "H1N": "Mercier–Hochelaga-Maisonneuve",  # SE Mercier ✓ confirmed (office)
    "H1V": "Mercier–Hochelaga-Maisonneuve",  # Maisonneuve
    "H1W": "Mercier–Hochelaga-Maisonneuve",  # Hochelaga

    # Montréal-Nord (office: H1H 5R5)
    "H1G": "Montréal-Nord",           # North Montréal-Nord
    "H1H": "Montréal-Nord",           # South Montréal-Nord ✓ confirmed (office)

    # Outremont (office: H2V 4R2)
    "H2V": "Outremont",               # Outremont ✓ confirmed (office)

    # Pierrefonds-Roxboro (office: H9A 2Z4)
    "H8Y": "Pierrefonds-Roxboro",     # Roxboro
    "H8Z": "Pierrefonds-Roxboro",     # East Pierrefonds
    "H9A": "Pierrefonds-Roxboro",     # NW Pierrefonds ✓ confirmed (office); also covers part of DDO
    "H9H": "Pierrefonds-Roxboro",     # Central Pierrefonds & Ste-Geneviève (split)
    "H9K": "Pierrefonds-Roxboro",     # West Pierrefonds (split with Kirkland)

    # Rivière-des-Prairies–Pointe-aux-Trembles (office: H1B 1Z1)
    "H1A": "Rivière-des-Prairies–Pointe-aux-Trembles",  # Pointe-aux-Trembles
    "H1B": "Rivière-des-Prairies–Pointe-aux-Trembles",  # ✓ confirmed (office); also covers Mtl-Est municipality
    "H1C": "Rivière-des-Prairies–Pointe-aux-Trembles",  # NE Rivière-des-Prairies
    "H1E": "Rivière-des-Prairies–Pointe-aux-Trembles",  # SW Rivière-des-Prairies

    # Rosemont–La Petite-Patrie (office: H2G 2B3)
    "H1T": "Rosemont–La Petite-Patrie",  # North Rosemont
    "H1X": "Rosemont–La Petite-Patrie",  # Central Rosemont
    "H1Y": "Rosemont–La Petite-Patrie",  # South Rosemont
    "H2G": "Rosemont–La Petite-Patrie",  # NE Petite-Patrie ✓ confirmed (office)
    "H2S": "Rosemont–La Petite-Patrie",  # SW Petite-Patrie

    # Saint-Laurent (office: H4M 2M7)
    "H4L": "Saint-Laurent",           # Inner NE Saint-Laurent
    "H4M": "Saint-Laurent",           # East Saint-Laurent ✓ confirmed (office)
    "H4N": "Saint-Laurent",           # Outer NE Saint-Laurent
    "H4R": "Saint-Laurent",           # Central Saint-Laurent
    "H4S": "Saint-Laurent",           # SW Saint-Laurent
    "H4T": "Saint-Laurent",           # SE Saint-Laurent

    # Saint-Léonard (office: H1R 3B1)
    "H1P": "Saint-Léonard",           # North Saint-Léonard
    "H1R": "Saint-Léonard",           # West Saint-Léonard ✓ confirmed (office)
    "H1S": "Saint-Léonard",           # SE Saint-Léonard

    # Verdun (office: H4G 1M4)
    "H3E": "Verdun",                  # L'Île-des-Sœurs
    "H4G": "Verdun",                  # North Verdun ✓ confirmed (office)
    "H4H": "Verdun",                  # South Verdun

    # Ville-Marie (office: H2L 2L8)
    "H2K": "Ville-Marie",             # N Centre-Sud (Sainte-Marie)
    "H2L": "Ville-Marie",             # S Centre-Sud (Le Village) ✓ confirmed (office)
    "H2Y": "Ville-Marie",             # South Old Montreal
    "H2Z": "Ville-Marie",             # N Old Montreal & SE Downtown
    "H3A": "Ville-Marie",             # N Downtown (McGill)
    "H3B": "Ville-Marie",             # East Downtown
    "H3G": "Ville-Marie",             # SE Downtown (Concordia)
    "H3H": "Ville-Marie",             # SW Downtown

    # Villeray–Saint-Michel–Parc-Extension (office: H3N 1M3)
    "H1Z": "Villeray–Saint-Michel–Parc-Extension",  # West Saint-Michel
    "H2E": "Villeray–Saint-Michel–Parc-Extension",  # NE Villeray
    "H2P": "Villeray–Saint-Michel–Parc-Extension",  # West Villeray
    "H2R": "Villeray–Saint-Michel–Parc-Extension",  # SE Villeray
    "H3N": "Villeray–Saint-Michel–Parc-Extension",  # Parc-Extension ✓ confirmed (office)
}

# Borough URL map
BOROUGH_URLS = {
    "Ahuntsic-Cartierville":                        "https://montreal.ca/arrondissements/ahuntsic-cartierville",
    "Anjou":                                         "https://montreal.ca/arrondissements/anjou",
    "Côte-des-Neiges–Notre-Dame-de-Grâce":          "https://montreal.ca/arrondissements/cote-des-neiges-notre-dame-de-grace",
    "L'Île-Bizard–Sainte-Geneviève":                "https://montreal.ca/arrondissements/ile-bizard-sainte-genevieve",
    "Lachine":                                       "https://montreal.ca/arrondissements/lachine",
    "LaSalle":                                       "https://montreal.ca/arrondissements/lasalle",
    "Le Plateau-Mont-Royal":                         "https://montreal.ca/arrondissements/plateau-mont-royal",
    "Le Sud-Ouest":                                  "https://montreal.ca/arrondissements/sud-ouest",
    "Mercier–Hochelaga-Maisonneuve":                 "https://montreal.ca/arrondissements/mercier-hochelaga-maisonneuve",
    "Montréal-Nord":                                 "https://montreal.ca/arrondissements/montreal-nord",
    "Outremont":                                     "https://montreal.ca/arrondissements/outremont",
    "Pierrefonds-Roxboro":                           "https://montreal.ca/arrondissements/pierrefonds-roxboro",
    "Rivière-des-Prairies–Pointe-aux-Trembles":     "https://montreal.ca/arrondissements/riviere-des-prairies-pointe-aux-trembles",
    "Rosemont–La Petite-Patrie":                     "https://montreal.ca/arrondissements/rosemont-la-petite-patrie",
    "Saint-Laurent":                                 "https://montreal.ca/arrondissements/saint-laurent",
    "Saint-Léonard":                                 "https://montreal.ca/arrondissements/saint-leonard",
    "Verdun":                                        "https://montreal.ca/arrondissements/verdun",
    "Ville-Marie":                                   "https://montreal.ca/arrondissements/ville-marie",
    "Villeray–Saint-Michel–Parc-Extension":         "https://montreal.ca/arrondissements/villeray-saint-michel-parc-extension",
}


def parse_phone(raw: str) -> str | None:
    """Extract best phone number from the messy CSV phone field.
    Prefers Tél., then Cell., ignores Fax."""
    if not raw:
        return None
    # Split into lines, try to find Tél. or Cell. with a number
    for prefix in ["Tél.", "Tél .", "Tél  .", "Cell.", "Cell ."]:
        pattern = re.escape(prefix) + r"\s*:?\s*([\d\s\(\)\-\+\.]+)"
        m = re.search(pattern, raw)
        if m:
            num = m.group(1).strip()
            # Remove poste/ext info
            num = re.split(r"poste|ext", num, flags=re.I)[0].strip()
            if re.search(r'\d{3}', num):  # at least a 3-digit sequence
                return num
    return None


def parse_csv(csv_path: Path) -> list[dict]:
    """Parse the Montreal elected officials CSV."""
    rows = []
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            prenom = (row.get("Prénom") or "").strip()
            nom    = (row.get("Nom") or "").strip()

            # Handle edge case: email contains last name when Nom is blank
            email  = (row.get("Courriel officiel") or "").strip().lower()
            if not nom and email:
                # e.g. maeva.vilain@montreal.ca → "Vilain"
                local = email.split("@")[0]
                parts = local.split(".")
                if len(parts) >= 2:
                    nom = parts[-1].capitalize()

            if not prenom and not nom:
                continue  # blank row

            name = f"{prenom} {nom}".strip()
            arrondissement = (row.get("Arrondissement") or "").strip()
            district       = (row.get("District") or "").strip()
            fonction       = (row.get("Fonction élective") or "").strip()
            parti          = (row.get("Parti") or "").strip()
            phone_raw      = (row.get("Téléphone") or "").strip()

            # Skip the city mayor (handled by separate override) and blank arrondissements
            if arrondissement in ("Ville de Montréal", "") or not fonction:
                continue
            # Skip the "Départs d'élus" section header rows and re-printed header
            if prenom in ("Appellation", "Prénom"):
                continue
            if arrondissement == "Arrondissement":
                continue

            phone = parse_phone(phone_raw)

            # Build office title: function + district if available
            if district:
                office = f"{fonction} – {district}"
            else:
                office = fonction

            rows.append({
                "name":          name,
                "elected_office": office,
                "level":         "municipal",
                "party_name":    parti,
                "district_name": f"{arrondissement}{' – ' + district if district else ''}",
                "email":         email or None,
                "phone":         phone,
                "arrondissement": arrondissement,
            })
    return rows


def build_borough_rules(rows: list[dict]) -> list[dict]:
    """Group reps by arrondissement and build inject_all override rules."""
    # Group
    by_arr = {}
    for r in rows:
        arr = r["arrondissement"]
        by_arr.setdefault(arr, []).append(r)

    # Invert postal map: arrondissement → list of FSA prefixes
    arr_to_prefixes = {}
    for fsa, arr in POSTAL_MAP.items():
        arr_to_prefixes.setdefault(arr, []).append(fsa)
    for arr in arr_to_prefixes:
        arr_to_prefixes[arr] = sorted(arr_to_prefixes[arr])

    rules = []
    for arr, reps in sorted(by_arr.items()):
        prefixes = arr_to_prefixes.get(arr, [])
        if not prefixes:
            print(f"  WARNING: No postal prefixes found for arrondissement '{arr}'", file=sys.stderr)
            continue

        url = BOROUGH_URLS.get(arr, "https://montreal.ca/arrondissements")

        rep_list = []
        for r in reps:
            entry = {
                "name":          r["name"],
                "elected_office": r["elected_office"],
                "level":         "municipal",
                "party_name":    r["party_name"],
                "district_name": r["district_name"],
                "email":         r["email"],
                "url":           url,
                "photo_url":     "",
            }
            if r["phone"]:
                entry["phone"] = r["phone"]
            rep_list.append(entry)

        rules.append({
            "_note":           f"Montréal – {arr} — verified Apr 2026 from donnees.montreal.ca",
            "action":          "inject_all",
            "postal_prefixes": prefixes,
            "representatives": rep_list,
        })

    return rules


def main():
    csv_path = Path.home() / "Downloads" / "liste_elus_montreal.csv"
    if not csv_path.exists():
        sys.exit(f"CSV not found: {csv_path}")

    print(f"Reading: {csv_path}")
    rows = parse_csv(csv_path)
    print(f"  Parsed {len(rows)} elected officials across arrondissements")

    # Count by arrondissement
    counts = {}
    for r in rows:
        counts[r["arrondissement"]] = counts.get(r["arrondissement"], 0) + 1
    for arr, n in sorted(counts.items()):
        prefixes = sorted(p for p, a in POSTAL_MAP.items() if a == arr)
        print(f"  {arr:<50} {n:>2} élus  FSAs: {', '.join(prefixes)}")

    rules = build_borough_rules(rows)
    print(f"\nBuilt {len(rules)} borough inject_all rules")

    # Save postal map
    postal_out = ROOT / "data" / "mtl_postal_arrondissement.json"
    postal_out.write_text(
        json.dumps(POSTAL_MAP, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8"
    )
    print(f"Saved postal map: {postal_out}")

    # Save borough overrides
    out = ROOT / "data" / "mtl_borough_overrides.json"
    payload = {
        "_comment":      "Montreal borough councillors — generated by scripts/build_mtl_overrides.py",
        "_source":       "donnees.montreal.ca/ville-de-montreal/listes-des-elus-de-la-ville-de-montreal",
        "_last_updated": "2026-04-28",
        "overrides":     rules,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved borough overrides: {out}")
    print(f"  Total reps across all boroughs: {sum(len(r['representatives']) for r in rules)}")


if __name__ == "__main__":
    main()
