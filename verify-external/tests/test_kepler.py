"""Differential test: Kepler propagation.

Engine propagateUniversal (universal-variable) vs hapsira danby (a different Kepler
solver) on the same state, time step, and gravitational parameter.
"""

import numpy as np

from conftest import load_generated, vec_close, record
import oracles
import tolerances as T


def test_kepler_propagation():
    doc = load_generated("kepler")
    worst = 0.0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        r_ref, v_ref = oracles.propagate(inp["r0"], inp["v0"], inp["dt"], inp["mu"])
        fail_r = vec_close(
            eng["r"], r_ref, rtol=T.KEPLER_RTOL, atol=T.ELEMENTS_POS_ATOL
        )
        fail_v = vec_close(
            eng["v"], v_ref, rtol=T.KEPLER_RTOL, atol=T.ELEMENTS_VEL_ATOL
        )
        scale = max(np.linalg.norm(r_ref), 1e-30)
        worst = max(worst, np.linalg.norm(np.array(eng["r"]) - r_ref) / scale)
        assert fail_r is None, ("r", inp, fail_r)
        assert fail_v is None, ("v", inp, fail_v)
    record("kepler", worst)
