import json
import pytest
from datetime import timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

from src.api_client import RepresentAPIError, RepresentClient, RepresentRateLimitError
from src.models import Representative


@pytest.fixture
def client(tmp_path):
    return RepresentClient(cache_dir=tmp_path, cache_ttl_hours=24)


@pytest.fixture
def sample_api_response():
    return {
        "code": "H2X1Y6",
        "city": "Montreal",
        "province": "QC",
        "representatives_centroid": [
            {
                "name": "Jane Smith",
                "first_name": "Jane",
                "last_name": "Smith",
                "elected_office": "MP",
                "representative_set_name": "House of Commons",
                "district_name": "Test District",
                "party_name": "Liberal",
                "email": "jane@parl.gc.ca",
                "url": "https://example.com",
                "personal_url": "",
                "photo_url": "",
                "source_url": "https://represent.opennorth.ca/",
                "offices": [
                    {"type": "legislature", "tel": "613-555-0001", "fax": "", "postal": ""}
                ],
                "related": {
                    "representative_set_url": "/sets/hoc/",
                    "boundary_url": "/boundaries/test/",
                },
                "extra": {},
            }
        ],
        "representatives_concordance": [],
    }


class TestClassifyLevel:
    def test_mp_is_federal(self, client):
        assert client._classify_level("MP", "House of Commons") == "federal"

    def test_senator_is_federal(self, client):
        assert client._classify_level("Senator", "Senate of Canada") == "federal"

    def test_mna_is_provincial(self, client):
        assert client._classify_level("MNA", "Assemblée nationale") == "provincial"

    def test_mla_is_provincial(self, client):
        assert client._classify_level("MLA", "Legislative Assembly of BC") == "provincial"

    def test_mpp_is_provincial(self, client):
        assert client._classify_level("MPP", "Legislative Assembly of Ontario") == "provincial"

    def test_mayor_is_municipal(self, client):
        assert client._classify_level("Mayor", "City of Ottawa") == "municipal"

    def test_councillor_is_municipal(self, client):
        assert client._classify_level("City Councillor", "Ville de Montréal") == "municipal"

    def test_case_insensitive(self, client):
        assert client._classify_level("mp", "house of commons") == "federal"


class TestFetchFromAPI:
    def test_successful_fetch(self, client, sample_api_response):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = sample_api_response

        with patch.object(client.session, "get", return_value=mock_resp):
            reps = client.get_representatives_by_postal_code("H2X 1Y6")

        assert len(reps) == 1
        assert reps[0].name == "Jane Smith"
        assert reps[0].level == "federal"
        assert reps[0].get_phone() == "613-555-0001"

    def test_404_raises_api_error(self, client):
        mock_resp = MagicMock()
        mock_resp.ok = False
        mock_resp.status_code = 404

        with patch.object(client.session, "get", return_value=mock_resp):
            with pytest.raises(RepresentAPIError, match="not found"):
                client.get_representatives_by_postal_code("H2X 1Y6")

    def test_503_raises_rate_limit_error(self, client):
        mock_resp = MagicMock()
        mock_resp.ok = False
        mock_resp.status_code = 503

        with patch.object(client.session, "get", return_value=mock_resp):
            with pytest.raises(RepresentRateLimitError):
                client.get_representatives_by_postal_code("H2X 1Y6")

    def test_invalid_postal_code_raises_value_error(self, client):
        with pytest.raises(ValueError, match="Invalid postal code"):
            client.get_representatives_by_postal_code("INVALID")


class TestCache:
    def test_result_cached_after_fetch(self, client, sample_api_response):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = sample_api_response

        with patch.object(client.session, "get", return_value=mock_resp) as mock_get:
            client.get_representatives_by_postal_code("H2X 1Y6")
            client.get_representatives_by_postal_code("H2X 1Y6")

        assert mock_get.call_count == 1

    def test_stale_cache_refetches(self, client, sample_api_response):
        client.cache_ttl = timedelta(seconds=0)

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = sample_api_response

        with patch.object(client.session, "get", return_value=mock_resp) as mock_get:
            client.get_representatives_by_postal_code("H2X 1Y6")
            client.get_representatives_by_postal_code("H2X 1Y6")

        assert mock_get.call_count == 2

    def test_corrupt_cache_ignored(self, client, sample_api_response, tmp_path):
        cache_file = tmp_path / "H2X_1Y6.json"
        cache_file.write_text("NOT VALID JSON", encoding="utf-8")

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = sample_api_response

        with patch.object(client.session, "get", return_value=mock_resp):
            reps = client.get_representatives_by_postal_code("H2X 1Y6")

        assert len(reps) == 1

    def test_concordance_dedup(self, client, sample_api_response):
        """Representatives appearing in both centroid and concordance should not be duplicated."""
        response = dict(sample_api_response)
        response["representatives_concordance"] = [
            sample_api_response["representatives_centroid"][0]
        ]

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = response

        with patch.object(client.session, "get", return_value=mock_resp):
            reps = client.get_representatives_by_postal_code("H2X 1Y6")

        assert len(reps) == 1
