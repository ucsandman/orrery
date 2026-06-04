"""Differential test: short-span two-body propagation against real Horizons truth.

Oracle A, second check. The engine propagateUniversal advances a real JPL Horizons
heliocentric state by a short span; the result is checked against the real Horizons
state at the later epoch. Pure two-body motion about the Sun neglects the planet's
own gravitational parameter and every third-body perturbation, so the disagreement
is the two-body model's short-span truncation, held to a documented truncation
envelope (SHORTSPAN_POS_RTOL / SHORTSPAN_VEL_RTOL), never to machine precision. The
position error scales as the span squared and the velocity error linearly, the
signature of an acceleration-level perturbation rather than a constant offset.

The truth is the committed fixtures/horizons_shortspan.json (fetched once, by hand).
A planet that disagrees beyond the truncation envelope is a real finding, reported
with the body, span, and observed error, not silently passed.
"""

import json

import numpy as np
import pytest

from conftest import FIXTURES, load_generated, record
import tolerances as T


def _load_shortspan_truth():
    path = FIXTURES / "horizons_shortspan.json"
    if not path.exists():
        pytest.skip(
            "no short-span Horizons fixtures; run fixtures/fetch_horizons_shortspan.py"
        )
    doc = json.loads(path.read_text(encoding="utf-8"))
    return {(p["body"], p["span_days"]): p for p in doc["pairs"]}


def test_shortspan_two_body_propagation():
    gen = load_generated("shortspan")
    if not gen["cases"]:
        pytest.skip("no short-span cases emitted; fetch fixtures then emit shortspan")
    truth = _load_shortspan_truth()
    worst_pos = 0.0
    worst_vel = 0.0
    offenders = []
    checked = 0
    for c in gen["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        p = truth[(inp["body"], inp["spanDays"])]
        r_eng = np.array(eng["r_km"], float)
        v_eng = np.array(eng["v_kms"], float)
        r_truth = np.array(p["r1_km"], float)
        v_truth = np.array(p["v1_kms"], float)
        r_mag = max(float(np.linalg.norm(r_truth)), 1e-30)
        v_mag = max(float(np.linalg.norm(v_truth)), 1e-30)
        rel_pos = float(np.linalg.norm(r_eng - r_truth)) / r_mag
        rel_vel = float(np.linalg.norm(v_eng - v_truth)) / v_mag
        worst_pos = max(worst_pos, rel_pos)
        worst_vel = max(worst_vel, rel_vel)
        checked += 1
        # Mixed tolerance on the displacement magnitude: |dr| <= atol + rtol |r_truth|.
        pos_ok = rel_pos <= T.SHORTSPAN_POS_RTOL + T.SHORTSPAN_POS_ATOL_KM / r_mag
        vel_ok = rel_vel <= T.SHORTSPAN_VEL_RTOL + T.SHORTSPAN_VEL_ATOL_KMS / v_mag
        if not (pos_ok and vel_ok):
            offenders.append(
                (inp["body"], inp["spanDays"], float(rel_pos), float(rel_vel))
            )
    record("shortspan_pos", worst_pos)
    record("shortspan_vel", worst_vel)
    assert checked == len(gen["cases"]), "not every short-span case was checked"
    assert not offenders, (
        f"short-span propagation exceeds the two-body truncation envelope at "
        f"(body, span_days, rel_pos, rel_vel): {offenders}"
    )
