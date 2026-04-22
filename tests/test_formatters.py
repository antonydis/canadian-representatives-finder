import json
import pytest
from src.formatters import (
    filter_by_level,
    format_representatives_json,
    format_representatives_text,
)
from src.models import Office, Representative


@pytest.fixture
def sample_reps():
    return [
        Representative(
            name="Jane Smith",
            elected_office="MP",
            level="federal",
            party_name="Liberal",
            district_name="Test District",
            representative_set_name="House of Commons",
            email="jane@parl.gc.ca",
            offices=[Office(type="legislature", tel="613-555-0001")],
        ),
        Representative(
            name="Pierre Dupont",
            elected_office="MNA",
            level="provincial",
            party_name="PQ",
            district_name="Mont-Royal",
            representative_set_name="Assemblée nationale",
            email="pierre@assnat.qc.ca",
            offices=[Office(type="legislature", tel="418-555-0002")],
        ),
        Representative(
            name="Marie Tremblay",
            elected_office="Mayor",
            level="municipal",
            district_name="Ville de Test",
            representative_set_name="Ville de Test",
            offices=[],
        ),
    ]


class TestFormatText:
    def test_contains_postal_code(self, sample_reps):
        output = format_representatives_text(sample_reps, "H2X 1Y6")
        assert "H2X 1Y6" in output

    def test_contains_all_names(self, sample_reps):
        output = format_representatives_text(sample_reps, "H2X 1Y6")
        assert "Jane Smith" in output
        assert "Pierre Dupont" in output
        assert "Marie Tremblay" in output

    def test_groups_by_level_order(self, sample_reps):
        output = format_representatives_text(sample_reps, "H2X 1Y6")
        federal_pos = output.index("FEDERAL")
        provincial_pos = output.index("PROVINCIAL")
        municipal_pos = output.index("MUNICIPAL")
        assert federal_pos < provincial_pos < municipal_pos

    def test_french_output(self, sample_reps):
        output = format_representatives_text(sample_reps, "H2X 1Y6", lang="fr")
        assert "code postal" in output

    def test_empty_reps_english(self):
        output = format_representatives_text([], "Z9Z 9Z9")
        assert "No representatives found" in output

    def test_empty_reps_french(self):
        output = format_representatives_text([], "Z9Z 9Z9", lang="fr")
        assert "Aucun représentant" in output

    def test_phone_shown(self, sample_reps):
        output = format_representatives_text(sample_reps, "H2X 1Y6")
        assert "613-555-0001" in output

    def test_email_shown(self, sample_reps):
        output = format_representatives_text(sample_reps, "H2X 1Y6")
        assert "jane@parl.gc.ca" in output


class TestFormatJson:
    def test_valid_json(self, sample_reps):
        output = format_representatives_json(sample_reps, "H2X 1Y6")
        parsed = json.loads(output)
        assert parsed["postal_code"] == "H2X 1Y6"
        assert parsed["total"] == 3

    def test_phone_surfaced(self, sample_reps):
        parsed = json.loads(format_representatives_json(sample_reps, "H2X 1Y6"))
        mp = next(r for r in parsed["representatives"] if r["elected_office"] == "MP")
        assert mp["phone"] == "613-555-0001"

    def test_no_phone_is_none(self, sample_reps):
        parsed = json.loads(format_representatives_json(sample_reps, "H2X 1Y6"))
        mayor = next(r for r in parsed["representatives"] if r["elected_office"] == "Mayor")
        assert mayor["phone"] is None

    def test_accented_characters_preserved(self, sample_reps):
        output = format_representatives_json(sample_reps, "H2X 1Y6")
        assert "Assemblée nationale" in output


class TestFilterByLevel:
    def test_filter_federal(self, sample_reps):
        result = filter_by_level(sample_reps, "federal")
        assert len(result) == 1
        assert result[0].name == "Jane Smith"

    def test_filter_provincial(self, sample_reps):
        result = filter_by_level(sample_reps, "provincial")
        assert len(result) == 1
        assert result[0].name == "Pierre Dupont"

    def test_filter_municipal(self, sample_reps):
        result = filter_by_level(sample_reps, "municipal")
        assert len(result) == 1
        assert result[0].name == "Marie Tremblay"

    def test_filter_nonexistent_level(self, sample_reps):
        result = filter_by_level(sample_reps, "galactic")
        assert result == []
