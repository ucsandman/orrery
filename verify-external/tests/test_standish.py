"""Differential test: the Standish ephemeris against real JPL Horizons truth.

Engine planetStateAtJD (Curtis Algorithm 8.1, an approximate Keplerian model) vs
committed Horizons heliocentric ecliptic-J2000 geometric vectors at the same
epochs. This is an approximate model, so each planet is bounded by its own
published accuracy envelope from the JPL Standish 1800-2050 maximum-error table,
never by machine precision. The giant planets carry much larger published errors
than the inner planets, so the envelope is per planet.

Earth and Mars anchor to the in-core STANDISH_EARTH / STANDISH_MARS; the other six
planets use the cited data file. A planet that disagrees beyond its published
envelope is a real finding (a transcription error in the element table, or a model
limitation), reported with the planet, epoch, and observed error, not silently
passed.
"""

import numpy as np

from conftest import load_generated, load_horizons, record
import tolerances as T

ANCHORED = {"earth", "mars"}
ALL_PLANETS = {
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
}


def _index_horizons():
    doc = load_horizons()
    return {(rec["body"], round(rec["jd_tdb"], 6)): rec for rec in doc["records"]}


def _check(planets, gen, hz):
    worst = 0.0
    offenders = []
    checked = 0
    for c in gen["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        if inp["planet"] not in planets:
            continue
        rec = hz[(inp["planet"], round(inp["jd"], 6))]
        au_km = inp["auKm"]
        r_model_au = np.array(eng["r_km"], float) / au_km
        r_truth_au = np.array(rec["r_au"], float)
        truth_mag = max(float(np.linalg.norm(r_truth_au)), 1e-30)
        rel = float(np.linalg.norm(r_model_au - r_truth_au)) / truth_mag
        bound = T.standish_pos_rtol(inp["planet"]) + T.STANDISH_POS_ATOL_AU / truth_mag
        worst = max(worst, rel)
        checked += 1
        if rel > bound:
            offenders.append(
                (inp["planet"], round(inp["jd"], 1), float(rel), float(bound))
            )
    return worst, offenders, checked


def test_standish_anchored_planets():
    """Earth and Mars, anchored to the core constants, within their published envelope."""
    gen = load_generated("standish")
    if not gen["cases"]:
        import pytest

        pytest.skip(
            "no Standish cases emitted; run the one-time Horizons fetch then emit"
        )
    hz = _index_horizons()
    worst, offenders, checked = _check(ANCHORED, gen, hz)
    record("standish_anchored", worst)
    assert checked > 0, "no anchored-planet Standish cases found"
    assert not offenders, (
        f"anchored Standish exceeds its published envelope at: {offenders}"
    )


def test_standish_all_planets():
    """All eight planets, each within its own published Standish envelope. A planet
    beyond its envelope is filed here with planet, epoch, observed error, and bound."""
    gen = load_generated("standish")
    if not gen["cases"]:
        import pytest

        pytest.skip(
            "no Standish cases emitted; run the one-time Horizons fetch then emit"
        )
    hz = _index_horizons()
    worst, offenders, checked = _check(ALL_PLANETS, gen, hz)
    record("standish_all", worst)
    assert checked == len(gen["cases"]), "not every Standish case was checked"
    assert not offenders, f"Standish exceeds the published envelope at: {offenders}"
