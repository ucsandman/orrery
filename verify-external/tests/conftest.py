"""Shared fixtures and helpers for the external differential suite.

Enforces offline operation (no IERS or remote-data download), loads the committed
engine-output JSON and the Horizons fixtures, and provides the mixed-tolerance
helper that matches the core's symmetric closeTo.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from astropy.utils import iers
from astropy.utils.data import conf as _data_conf

# Offline enforcement: disable astropy IERS auto-download and remote data so a
# missing network can never trigger a silent download during the test run.
iers.conf.auto_download = False
_data_conf.allow_internet = False

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated"
FIXTURES = ROOT / "fixtures"


def close_to(a: float, b: float, rtol: float = 0.0, atol: float = 0.0) -> bool:
    """Symmetric mixed tolerance: |a - b| <= atol + rtol * max(|a|, |b|).

    Mirrors test/harness/closeTo.ts in the core. A NaN or Infinity on either side
    fails loudly (it is never within tolerance).
    """
    if not (math.isfinite(a) and math.isfinite(b)):
        return False
    return abs(a - b) <= atol + rtol * max(abs(a), abs(b))


def vec_close(a, b, rtol: float = 0.0, atol: float = 0.0):
    """Return the first componentwise failure as (index, a_i, b_i, |diff|), or None."""
    for i, (ai, bi) in enumerate(zip(a, b)):
        if not close_to(float(ai), float(bi), rtol, atol):
            return (i, float(ai), float(bi), abs(float(ai) - float(bi)))
    return None


def load_generated(category: str, profile: str = "nominal") -> dict:
    """Load the committed engine-output JSON for a category, found by glob so the
    seed need not be duplicated on the Python side (it lives in sample/seeds.ts)."""
    matches = sorted(GENERATED.glob(f"{category}.*.{profile}.json"))
    if not matches:
        raise FileNotFoundError(
            f"missing engine-output {category}.*.{profile}.json in {GENERATED}. "
            f"Run: npm --prefix verify-external run emit:all"
        )
    return json.loads(matches[-1].read_text(encoding="utf-8"))


def load_horizons() -> dict:
    path = FIXTURES / "horizons_planets.json"
    if not path.exists():
        raise FileNotFoundError(
            f"missing Horizons fixtures {path}. Run the one-time fetch: "
            f"verify-external/.venv/Scripts/python.exe verify-external/fixtures/fetch_horizons.py"
        )
    return json.loads(path.read_text(encoding="utf-8"))


# --- Measured agreement recording (feeds bar-external.json currents honestly) ---
_MEASURED: dict[str, float] = {}


def record(category: str, value: float) -> None:
    """Record the worst (largest) observed agreement error for a category."""
    if math.isfinite(value):
        _MEASURED[category] = max(_MEASURED.get(category, 0.0), value)


def pytest_sessionfinish(session, exitstatus):
    out = GENERATED / "measured.json"
    out.write_text(json.dumps(_MEASURED, indent=1), encoding="utf-8")
