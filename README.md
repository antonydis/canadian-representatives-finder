# Canadian Representatives Finder

**Find your federal MP, provincial MNA/MLA/MPP, and municipal councillors by Canadian postal code — and get help contacting them.**

A bilingual civic web tool with AI-powered situation routing, multilingual support, and smart email templates.

---

## What it does

### 🔍 Find My Representatives
Enter any Canadian postal code to instantly see your elected representatives across all three levels of government — federal, provincial/territorial, and municipal — with their contact information (phone, email, website).

### 🤔 Who Do I Contact?
Not sure which level of government handles your issue? Describe your situation in plain language and the AI classifier will:
- Identify the most relevant level of government (federal, provincial, or municipal)
- Suggest a key contact service

Once classified, enter your postal code to find your specific representative and get a ready-to-personalize email example.

### ✉️ Smart Email Templates
Each representative card in the triage flow includes an **"Get email example"** button that opens a pre-drafted email with:
- A contextual guide on what details to include (exact address, date of issue, description)
- Language-matched content: French for Quebec representatives, English for all others

---

## Languages supported

| Language | Code |
|----------|------|
| English | `en` |
| Français | `fr` |
| Español | `es` |
| Português | `pt` |
| 中文 | `zh` |
| Filipino | `tl` |

---

## Tech stack

- **Backend:** Python / Flask
- **AI classifier:** Claude Haiku (Anthropic) — fast, low-cost civic situation routing
- **Representative data:** Represent API by OpenNorth
- **Frontend:** Vanilla JS, no framework dependencies

---

## Running locally

### Requirements
- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/antonydis/canadian-representatives-finder.git
cd canadian-representatives-finder
pip install -r requirements.txt
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### Start the web app

```bash
cd web
python app.py
# Open http://localhost:5000
```

### CLI (original tool)

```bash
python -m src.main H2X1Y6
python -m src.main H2X1Y6 --level federal
python -m src.main H2X1Y6 --json
```

---

## Running tests

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing
```
---

## Project structure

```
canadian-representatives-finder/
├── web/
│   ├── app.py                  Flask server + AI classifier endpoint
│   ├── templates/index.html    Single-page web UI
│   ├── static/
│   │   ├── js/app.js           Frontend logic (tabs, triage, email modal)
│   │   └── css/style.css       Styles
│   └── translations/           JSON files for en, fr, es, pt, zh, tl
├── src/
│   ├── api_client.py           Represent API wrapper
│   ├── models.py               Representative dataclasses
│   ├── validators.py           Postal code validation
│   └── main.py                 CLI entry point
└── tests/
```
---
## Data & attribution

Representative data is provided by the **[Represent API](https://represent.opennorth.ca)** by [OpenNorth](https://opennorth.ca), a Canadian non-profit. The API is free and open with no authentication required.

- 338 federal MPs, all provincial/territorial legislators, 7,000+ municipal officials
- Data updated as elections occur
- Rate limit: 60 requests/minute

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).


## License

MIT — see [LICENSE](LICENSE).
