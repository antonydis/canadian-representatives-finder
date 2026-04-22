import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, render_template, request

from src.api_client import RepresentAPIError, RepresentClient, RepresentRateLimitError

app = Flask(__name__, template_folder="templates", static_folder="static")
client = RepresentClient()

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


@app.route("/api/translations")
def translations():
    return jsonify(TRANSLATIONS)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
