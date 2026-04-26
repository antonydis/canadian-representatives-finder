import json
import logging
import os
import re
import sys
import time
from collections import defaultdict

from dotenv import load_dotenv
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"), override=True)

sys.path.insert(0, _ROOT)

import anthropic
from flask import Flask, jsonify, render_template, request
from werkzeug.middleware.proxy_fix import ProxyFix

from src.api_client import RepresentAPIError, RepresentClient, RepresentRateLimitError

app = Flask(__name__, template_folder="templates", static_folder="static")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Application Insights — only active when connection string is configured
_ai_telemetry = None
_APPINSIGHTS_CONN = os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING", "")
if _APPINSIGHTS_CONN:
    try:
        from opencensus.ext.azure import log_exporter
        from opencensus.ext.azure.trace_exporter import AzureExporter
        from opencensus.trace.samplers import AlwaysOnSampler
        from opencensus.trace.tracer import Tracer
        from opencensus.ext.azure.common.protocol import Envelope
        import opencensus.ext.azure.log_exporter as _azure_log
        _handler = _azure_log.AzureLogHandler(connection_string=_APPINSIGHTS_CONN)
        logging.getLogger().addHandler(_handler)
        _ai_telemetry = True
        logging.info("Application Insights connected.")
    except Exception as _e:
        logging.warning(f"Application Insights not loaded: {_e}")

client = RepresentClient()
ai_client = anthropic.Anthropic()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiter: 10 req / 60 s per IP (shared across both API endpoints)
_rl_store: dict[str, list[float]] = defaultdict(list)
_RL_MAX = 10
_RL_WINDOW = 60

_VALID_POSTAL = re.compile(r"^[A-Z]\d[A-Z]\d[A-Z]\d$")
_VALID_JURISDICTIONS = {"federal", "provincial", "municipal"}
_VALID_SERVICES = {"311", "811", "211", "null", None}


def _allow_request(ip: str) -> bool:
    now = time.monotonic()
    bucket = _rl_store[ip]
    bucket[:] = [t for t in bucket if now - t < _RL_WINDOW]
    if len(bucket) >= _RL_MAX:
        return False
    bucket.append(now)
    return True


def _client_ip() -> str:
    # Fix #2: after ProxyFix, remote_addr is already the real client IP
    return request.remote_addr or "unknown"


_LANG_NAMES = {
    "en": "English", "fr": "French", "es": "Spanish",
    "pt": "Portuguese", "zh": "Chinese", "tl": "Filipino",
}

_CLASSIFY_SYSTEM_PROMPT_TEMPLATE = (
    "You are a Canadian civic assistant. The user will describe a situation or problem. "
    "Determine which SINGLE level of government is primarily responsible. "
    "Return ONLY a valid JSON object with exactly five keys: "
    '"jurisdiction": MUST be exactly one of "federal", "provincial", or "municipal". '
    'NEVER return "mixed" or multiple levels. Force a decision to the most pertinent level. '
    '"service": Can be "311", "811", "211", or "null" if not applicable. '
    '"explanation": A polite, helpful explanation (max 20 words) written in {lang_name}, '
    "explaining why this specific level of government handles it. "
    '"situation_en": A short neutral English summary of the user\'s situation (max 8 words, no period). '
    '"situation_fr": A short neutral French summary of the user\'s situation (max 8 words, no period).'
)

TRANSLATIONS_DIR = os.path.join(os.path.dirname(__file__), "translations")
SUPPORTED_LANGS = ["en", "fr", "es", "pt", "zh", "tl"]


def load_translations():
    translations = {}
    for lang in SUPPORTED_LANGS:
        path = os.path.join(TRANSLATIONS_DIR, f"{lang}.json")
        with open(path, encoding="utf-8") as f:
            translations[lang] = json.load(f)
    return translations


TRANSLATIONS = load_translations()


# Fix #3: Security headers on every response
@app.after_request
def set_security_headers(response):
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
    if request.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.route("/")
def index():
    return render_template("index.html", translations=TRANSLATIONS, langs=SUPPORTED_LANGS)


@app.route("/api/search", methods=["POST"])
def search():
    # Fix #4: rate limit on search too
    if not _allow_request(_client_ip()):
        return jsonify({"success": False, "error": "rate_limit"}), 429

    data = request.get_json(silent=True) or {}
    postal_code = data.get("postal_code", "").strip().upper().replace(" ", "")

    # Fix #8: server-side postal code validation
    if not _VALID_POSTAL.match(postal_code):
        return jsonify({"success": False, "error": "invalid_postal_code"}), 400

    try:
        reps = client.get_representatives_by_postal_code(postal_code)
        logger.info("postal_search", extra={"custom_dimensions": {
            "postal_code": postal_code,
            "result_count": len(reps),
        }})
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
    except ValueError:
        return jsonify({"success": False, "error": "invalid_postal_code"}), 400
    except RepresentRateLimitError:
        return jsonify({"success": False, "error": "rate_limit"}), 429
    except RepresentAPIError:
        # Fix #7: no internal error details in response
        logger.exception("Represent API error during search")
        return jsonify({"success": False, "error": "api_error"}), 502


@app.route("/api/classify-situation", methods=["POST"])
def classify_situation():
    if not _allow_request(_client_ip()):
        return jsonify({"success": False, "error": "rate_limit"}), 429

    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    lang = data.get("lang", "en")
    if lang not in _LANG_NAMES:
        lang = "en"
    lang_name = _LANG_NAMES[lang]

    if not text:
        return jsonify({"success": False, "error": "empty_text"}), 400
    if len(text) < 10:
        return jsonify({"success": False, "error": "too_short"}), 400
    if len(text) > 500:
        return jsonify({"success": False, "error": "too_long"}), 400

    system_prompt = _CLASSIFY_SYSTEM_PROMPT_TEMPLATE.format(lang_name=lang_name)

    try:
        response = ai_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=system_prompt,
            messages=[{"role": "user", "content": text}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rsplit("```", 1)[0].strip()

        result = json.loads(raw)

        # Fix #6: validate AI response has exactly the expected shape
        if result.get("jurisdiction") not in _VALID_JURISDICTIONS:
            raise ValueError("invalid jurisdiction in AI response")

        logger.info("classify_situation", extra={"custom_dimensions": {
            "jurisdiction": result.get("jurisdiction"),
            "service": result.get("service"),
            "lang": lang,
        }})
        return jsonify({"success": True, **result})

    except (json.JSONDecodeError, ValueError, KeyError):
        logger.exception("AI response validation failed")
        return jsonify({"success": False, "error": "parse_error"}), 502
    except anthropic.AuthenticationError:
        logger.error("Anthropic API key invalid or not set")
        return jsonify({"success": False, "error": "auth_error"}), 502
    except anthropic.APIError:
        logger.exception("Anthropic API error")
        return jsonify({"success": False, "error": "ai_error"}), 502
    except Exception:
        logger.exception("Unexpected error in classify_situation")
        return jsonify({"success": False, "error": "ai_error"}), 502


@app.route("/api/health")
def health():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    key_set = bool(key and len(key) > 10)
    return jsonify({
        "status": "ok",
        "anthropic_key_configured": key_set,
        "key_prefix": key[:12] + "..." if key_set else "NOT SET",
    })


@app.route("/api/translations")
def translations():
    return jsonify(load_translations())


if __name__ == "__main__":
    # Fix #5: debug mode controlled by env var, never on by default
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug, port=5000)
