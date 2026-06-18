"""Command-line interface.

    python -m laval_events june 2026
    python -m laval_events 6 --json
    python -m laval_events --between 2026-01-01 2026-03-31
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json as _json
import sys

from .client import LavalEventsClient, LavalEventsError, get_events


def _print_table(events) -> None:
    if not events:
        print("No events found.")
        return
    width = max(len(e.seance_type) for e in events)
    for e in events:
        title = e.title or e.document_type
        print(
            f"{e.date.isoformat()}  {e.seance_type:<{width}}  "
            f"{e.document_type:<16}  {title}"
        )
        if e.document_url:
            print(f"            {e.document_url}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="laval_events",
        description="List Ville de Laval council documents for a month.",
    )
    parser.add_argument("month", nargs="?", help="Month name or number (1-12).")
    parser.add_argument("year", nargs="?", type=int, help="Year (default: current).")
    parser.add_argument(
        "--between",
        nargs=2,
        metavar=("START", "END"),
        help="Inclusive ISO date range (YYYY-MM-DD YYYY-MM-DD) instead of a month.",
    )
    parser.add_argument(
        "--category",
        metavar="WORD",
        help="Filter by title category, e.g. ADJUDICATION, ADOPTION, OCTROI.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    parser.add_argument(
        "--asc", action="store_true", help="Sort ascending by date (default: descending)."
    )
    args = parser.parse_args(argv)

    try:
        if args.between:
            start = _dt.date.fromisoformat(args.between[0])
            end = _dt.date.fromisoformat(args.between[1])
            events = LavalEventsClient().get_events_between(
                start, end, category=args.category, order_desc=not args.asc
            )
        elif args.month is not None:
            events = get_events(
                args.month, args.year, category=args.category, order_desc=not args.asc
            )
        else:
            parser.error("provide a month, or use --between START END")
            return 2
    except (LavalEventsError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(_json.dumps([e.to_dict() for e in events], ensure_ascii=False, indent=2))
    else:
        _print_table(events)
        print(f"\n{len(events)} document(s).", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
