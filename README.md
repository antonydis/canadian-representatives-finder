# Canadian Representatives Finder

**Find your federal MP, provincial MNA/MLA/MPP, and municipal councillors by postal code.**

Powered by the [Represent API](https://represent.opennorth.ca) — free, no API key required.

---

🇫🇷 *La version française complète est disponible dans [README.fr.md](README.fr.md).*

---

## Features

- Look up all elected representatives for any Canadian postal code
- Covers all **3 levels of government**: federal, provincial/territorial, and municipal
- Live data from the Represent API — always up to date
- 24-hour local cache to minimize API requests
- JSON output for easy integration with other tools
- Bilingual display (English / French)

## Requirements

- Python 3.10+
- Internet connection (for live data)

## Installation

```bash
git clone https://github.com/yourusername/canadian-representatives-finder.git
cd canadian-representatives-finder
pip install -r requirements.txt
```

Or install as a CLI tool:

```bash
pip install -e .
```

## Quick Start

```bash
# By postal code (with or without space)
python -m src.main H2X1Y6
python -m src.main "H2X 1Y6"

# Interactive prompt (no argument)
python -m src.main

# After pip install -e .
canrep H2X1Y6
```

## Sample Output

```
============================================================
Representatives for postal code H2X 1Y6
============================================================

--- FEDERAL ---

  MP: Steven Guilbeault
  Party / Parti: Liberal
  District: Laurier—Sainte-Marie
  Phone / Tél.: 514-522-1339
  Email: steven.guilbeault@parl.gc.ca
  Web: https://www.ourcommons.ca/members/en/steven-guilbeault(89263)

--- PROVINCIAL ---

  MNA: Andrés Fontecilla
  Party / Parti: Québec solidaire
  District: Laurier-Dorion
  Phone / Tél.: 514-948-2095
  Email: afontecilla-laurdor@assnat.qc.ca

--- MUNICIPAL ---

  Mayor: Valérie Plante
  Party / Parti: Projet Montréal
  District: Montréal
  Phone / Tél.: 514-872-3101
  Email: valerie.plante@montreal.ca

  City Councillor: Robert Beaudry
  Party / Parti: Projet Montréal
  District: Saint-Jacques
  Phone / Tél.: 514-872-3167
  Email: robert.beaudry@montreal.ca

============================================================
Data provided by the Represent API (represent.opennorth.ca)
```

## Options

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON |
| `--level federal\|provincial\|municipal` | Filter by government level |
| `--lang en\|fr` | Display language (default: `en`) |
| `--no-cache` | Bypass 24-hour local cache, fetch fresh data |

### Examples

```bash
# JSON output
python -m src.main K1A0A6 --json

# Federal representatives only
python -m src.main H2X1Y6 --level federal

# French labels
python -m src.main H2X1Y6 --lang fr

# Force fresh fetch
python -m src.main H2X1Y6 --no-cache
```

## Running Tests

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing
```

## Project Structure

```
canadian-representatives-finder/
├── src/
│   ├── models.py       Representative and Office dataclasses
│   ├── validators.py   Postal code validation and normalization
│   ├── api_client.py   Represent API wrapper with caching
│   ├── formatters.py   Text and JSON output formatters
│   └── main.py         CLI entry point
├── tests/
│   ├── test_validators.py
│   ├── test_formatters.py
│   └── test_api_client.py
├── data/
│   ├── cache/          Live API responses (gitignored, 24h TTL)
│   └── examples/
│       └── quebec_sample.json   Demo data for H2X 1Y6 (Montréal)
└── docs/
    └── API_REFERENCE.md
```

## Data Source & Attribution

This project uses the **[Represent API](https://represent.opennorth.ca)** by
[OpenNorth](https://opennorth.ca), a Canadian non-profit. The API is free and
open with no authentication required.

- Coverage: 338 federal MPs, all provincial/territorial legislators, 7,000+ municipal officials
- Rate limit: 60 requests/minute
- Data is updated as elections occur

Please review [OpenNorth's terms of use](https://represent.opennorth.ca/api/) before
deploying this tool publicly.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
