"""Tests for engine location resolution + setter."""

from unittest.mock import MagicMock

from evf.config.manager import ConfigManager
from evf.engine.engine import Engine


def _make_engine(tmp_path):
    """Build an Engine with config isolated to tmp_path."""
    cfg = ConfigManager(config_dir=tmp_path / "evf-config")
    return Engine(dev_mode=False, config=cfg)


def test_location_none_by_default(tmp_path):
    eng = _make_engine(tmp_path)
    assert eng.location == {"latitude": None, "longitude": None, "source": None}


def test_location_from_manual_config(tmp_path):
    eng = _make_engine(tmp_path)
    eng.set_location(13.0878, 80.2785)
    assert eng.location == {
        "latitude": 13.0878,
        "longitude": 80.2785,
        "source": "manual",
    }


def test_location_from_stellarium_takes_precedence(tmp_path):
    eng = _make_engine(tmp_path)
    eng.set_location(13.0878, 80.2785)  # manual

    # Mock a Stellarium server with a location
    fake_server = MagicMock()
    fake_server.stellarium_status = {
        "location": {"name": "London", "latitude": 51.5, "longitude": -0.1},
    }
    eng._stellarium = fake_server

    loc = eng.location
    assert loc["source"] == "stellarium"
    assert loc["latitude"] == 51.5
    assert loc["longitude"] == -0.1


def test_set_location_clear(tmp_path):
    eng = _make_engine(tmp_path)
    eng.set_location(13.0878, 80.2785)
    eng.set_location(None, None)
    assert eng.location == {"latitude": None, "longitude": None, "source": None}
