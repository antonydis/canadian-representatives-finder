import json
import os
import sys
import time
from collections import defaultdict

from dotenv import load_dotenv
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"), override=True)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import anthropic
from flask import Flask, jsonify, render_template, request

from src.api_client import RepresentAPIError, RepresentClient, RepresentRateLimitError

app = Flask(__name__, template_folder="templates", static_folder="static")
client = RepresentClient()
ai_client = anthropic.Anthropic()

# Simple in-memory rate limiter: 5 classify calls / 60 s per IP
_rl_store: dict[str, list[float]] = defaultdict(list)
_RL_MAX = 5
_RL_WINDOW = 60


def _allow_request(ip: str) -> bool:
    now = time.monotonic()
    bucket = _rl_store[ip]
    bucket[:] = [t for t in bucket if now - t < _RL_WINDOW]
    if len(bucket) >= _RL_MAX:
        return False
    bucket.append(now)
    return True

_CLASSIFY_SYSTEM_PROMPT = (
    "You are a Canadian civic assistant. The user will describe a situation or problem. "
    "Determine which SINGLE level of government is primarily responsible. "
    "Return ONLY a valid JSON object with exactly three keys: "
    '"jurisdiction": MUST be exactly one of "federal", "provincial", or "municipal". '
    'NEVER return "mixed" or multiple levels. Force a decision to the most pertinent level. '
    '"service": Can be "311", "811", "211", or "null" if not applicable. '
    '"explanation": A polite, helpful explanation (max 20 words) in the exact same language '
    "the user wrote, explaining why this specific level of government handles it."
)

TRANSLATIONS_DIR = os.path.join(os.path.dirname(__file__), "translations")
SUPPORTED_LANGS = ["en", "fr", "es", "zh", "tl"]


def load_translations():
    translations = {}
    for lang in SUPPORTED_LANGS:
        path = os.path.join(TRANSLATIONS_DIR, f"{lang}.json")
        with open(path, encoding="utf-8") as f:
            translations[lang] = json.load(f)
    return translations


TRANSLATIONS = load_translations()


@app.route("/")
def index():
    return render_template("index.html", translations=TRANSLATIONS, langs=SUPPORTED_LANGS)


@app.route("/api/search", methods=["POST"])
def search():
    data = request.get_json(silent=True) or {}
    postal_code = data.get("postal_code", "").strip()

    try:
        reps = client.get_representatives_by_postal_code(postal_code)
        return jsonify({
            "success": True,
            "postal_code": postal_code,
            "representatives": [
                {
                    "name": r.name,
                    "elected_office": r.elected_office,
                    "level": r.level,
                    "party": r.party_name,
                    "district": r.district_name,
                    "email": r.email,
                    "phone": r.get_phone(),
                    "url": r.url,
                    "photo_url": r.photo_url,
                }
                for r in reps
            ],
        })
    except ValueError as e:
        return jsonify({"success": False, "error": "invalid_postal_code", "message": str(e)}), 400
    except RepresentRateLimitError:
        return jsonify({"success": False, "error": "rate_limit"}), 429
    except RepresentAPIError as e:
        return jsonify({"success": False, "error": "api_error", "message": str(e)}), 502


@app.route("/api/classify-situation", methods=["POST"])
def classify_situation():
    # Rate limit
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    if not _allow_request(ip):
        return jsonify({"success": False, "error": "rate_limit"}), 429

    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()

    # Input validation
    if not text:
        return jsonify({"success": False, "error": "empty_text"}), 400
    if len(text) < 10:
        return jsonify({"success": False, "error": "too_short"}), 400
    if len(text) > 500:
        return jsonify({"success": False, "error": "too_long"}), 400

    try:
        response = ai_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=_CLASSIFY_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
        )
        result = json.loads(response.content[0].text)
        return jsonify({"success": True, **result})
    except json.JSONDecodeError:
        return jsonify({"success": False, "error": "parse_error"}), 502
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": "ai_error", "message": str(e)}), 502


@app.route("/api/translations")
def translations():
    return jsonify(load_translations())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
