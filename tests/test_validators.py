import pytest
from src.validators import normalize_postal_code, validate_postal_code


class TestValidatePostalCode:
    def test_valid_with_space(self):
        assert validate_postal_code("H2X 1Y6") is True

    def test_valid_without_space(self):
        assert validate_postal_code("H2X1Y6") is True

    def test_valid_lowercase(self):
        assert validate_postal_code("h2x1y6") is True

    def test_valid_k1a(self):
        assert validate_postal_code("K1A 0A6") is True

    def test_valid_newfoundland(self):
        assert validate_postal_code("A1A 1A1") is True

    def test_invalid_all_letters(self):
        assert validate_postal_code("ABCDEF") is False

    def test_invalid_all_digits(self):
        assert validate_postal_code("123456") is False

    def test_invalid_too_short(self):
        assert validate_postal_code("H2X") is False

    def test_invalid_too_long(self):
        assert validate_postal_code("H2X 1Y67") is False

    def test_invalid_wrong_pattern(self):
        assert validate_postal_code("1H2 X1Y") is False

    def test_empty_string(self):
        assert validate_postal_code("") is False

    def test_with_leading_trailing_spaces(self):
        assert validate_postal_code("  H2X1Y6  ") is True


class TestNormalizePostalCode:
    def test_lowercase_no_space(self):
        assert normalize_postal_code("h2x1y6") == "H2X 1Y6"

    def test_uppercase_no_space(self):
        assert normalize_postal_code("H2X1Y6") == "H2X 1Y6"

    def test_already_normalized(self):
        assert normalize_postal_code("H2X 1Y6") == "H2X 1Y6"

    def test_lowercase_with_space(self):
        assert normalize_postal_code("h2x 1y6") == "H2X 1Y6"

    def test_strips_outer_whitespace(self):
        assert normalize_postal_code("  H2X1Y6  ") == "H2X 1Y6"
