import re

_POSTAL_CODE_RE = re.compile(r"^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$")


def validate_postal_code(postal_code: str) -> bool:
    """Return True if postal_code matches the A1A 1A1 or A1A1A1 format."""
    return bool(_POSTAL_CODE_RE.match(postal_code.strip()))


def normalize_postal_code(postal_code: str) -> str:
    """
    Uppercase, strip whitespace, ensure exactly one space after the first 3 chars.
    Examples: 'h2x1y6' -> 'H2X 1Y6', 'H2X1Y6' -> 'H2X 1Y6'
    """
    code = postal_code.strip().upper().replace(" ", "")
    if len(code) == 6:
        return f"{code[:3]} {code[3:]}"
    return code
