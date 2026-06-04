"""Differential test: classical elements to and from a state vector.

Engine rvToElements and coeToRv vs hapsira rv2coe and coe2rv on the same SI input
and the same gravitational parameter.
"""

import math

from conftest import load_generated, close_to, vec_close, record
import oracles
import tolerances as T


def test_elements_forward():
    doc = load_generated("elements_fwd")
    worst = 0.0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        if eng.get("kind") != "classical":
            continue  # degenerate kinds carry substitute angles, compared elsewhere
        ref = oracles.elements_from_rv(inp["r"], inp["v"], inp["mu"])
        for key in ("a", "e", "i", "raan", "argp", "nu"):
            a, b = float(eng[key]), float(ref[key])
            if key in ("i", "raan", "argp", "nu"):
                # angle: compare on the circle
                d = abs((a - b + math.pi) % (2 * math.pi) - math.pi)
                worst = max(worst, d)
                assert d <= T.ELEMENTS_FWD_RTOL * max(abs(a), abs(b)) + 1e-9, (
                    key,
                    a,
                    b,
                )
            else:
                worst = max(worst, abs(a - b) / max(abs(a), abs(b), 1e-30))
                assert close_to(a, b, rtol=T.ELEMENTS_FWD_RTOL, atol=1e-6), (key, a, b)
    record("elements_fwd", worst)


def test_elements_inverse():
    doc = load_generated("elements_inv")
    worst = 0.0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        r_ref, v_ref = oracles.rv_from_elements(
            inp["a"], inp["e"], inp["i"], inp["raan"], inp["argp"], inp["nu"], inp["mu"]
        )
        fail_r = vec_close(
            eng["r"], r_ref, rtol=T.ELEMENTS_INV_RTOL, atol=T.ELEMENTS_POS_ATOL
        )
        fail_v = vec_close(
            eng["v"], v_ref, rtol=T.ELEMENTS_INV_RTOL, atol=T.ELEMENTS_VEL_ATOL
        )
        for k in range(3):
            worst = max(worst, abs(eng["r"][k] - r_ref[k]) / max(abs(r_ref[k]), 1e-30))
        assert fail_r is None, ("r", fail_r)
        assert fail_v is None, ("v", fail_v)
    record("elements_inv", worst)
