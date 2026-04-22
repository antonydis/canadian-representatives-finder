#!/usr/bin/env python3
"""
Canadian Representatives Finder

Usage:
    python -m src.main H2X1Y6
    python -m src.main "H2X 1Y6" --json
    python -m src.main H2X1Y6 --level federal
    python -m src.main H2X1Y6 --lang fr
    python -m src.main            (interactive prompt)
"""
import argparse
import sys
from datetime import timedelta

from .api_client import RepresentAPIError, RepresentClient, RepresentRateLimitError
from .formatters import filter_by_level, format_representatives_json, format_representatives_text
from .validators import normalize_postal_code, validate_postal_code


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Find Canadian representatives by postal code.",
        epilog="Data provided by the Represent API (represent.opennorth.ca)",
    )
    parser.add_argument(
        "postal_code",
        nargs="?",
        help="Canadian postal code (e.g., H2X1Y6 or 'H2X 1Y6')",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON",
    )
    parser.add_argument(
        "--level",
        choices=["federal", "provincial", "municipal"],
        default=None,
        help="Filter by government level",
    )
    parser.add_argument(
        "--lang",
        choices=["en", "fr"],
        default="en",
        help="Display language (en/fr, default: en)",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Bypass local cache and fetch fresh data",
    )
    return parser


def run(args=None):
    parser = build_parser()
    parsed = parser.parse_args(args)

    if not parsed.postal_code:
        prompts = {
            "en": "Enter a Canadian postal code (e.g., H2X 1Y6): ",
            "fr": "Entrez un code postal canadien (ex: H2X 1Y6) : ",
        }
        try:
            parsed.postal_code = input(prompts.get(parsed.lang, prompts["en"])).strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(0)

    normalized = normalize_postal_code(parsed.postal_code)
    if not validate_postal_code(normalized):
        print(
            f"Error: '{parsed.postal_code}' is not a valid Canadian postal code.",
            file=sys.stderr,
        )
        print("Format: A1A 1A1 (e.g., H2X 1Y6, K1A 0A6)", file=sys.stderr)
        sys.exit(1)

    client = RepresentClient()
    if parsed.no_cache:
        client.cache_ttl = timedelta(seconds=0)

    try:
        reps = client.get_representatives_by_postal_code(normalized)
    except RepresentRateLimitError as e:
        print(f"Rate limit error: {e}", file=sys.stderr)
        sys.exit(2)
    except RepresentAPIError as e:
        print(f"API error: {e}", file=sys.stderr)
        sys.exit(2)
    except ValueError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        sys.exit(1)

    if parsed.level:
        reps = filter_by_level(reps, parsed.level)

    if parsed.json:
        print(format_representatives_json(reps, normalized))
    else:
        print(format_representatives_text(reps, normalized, lang=parsed.lang))


if __name__ == "__main__":
    run()
