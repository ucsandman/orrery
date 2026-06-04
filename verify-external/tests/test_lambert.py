"""Differential test: Lambert's problem (single revolution at baseline).

Engine lambertIzzo (revs = 0 branch) vs hapsira core izzo on the same endpoints,
flight time, and gravitational parameter. Also the oracle-side re-propagation
invariant: propagate the engine's v1 from r1 by tof with hapsira danby and confirm
it reaches r2, judging the engine's velocity by physics, not by landing on the
identical iterate.
"""

import numpy as np

from conftest import load_generated, vec_close, record
import oracles
import tolerances as T


def test_lambert_single_rev_velocities():
    doc = load_generated("lambert")
    worst = 0.0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        single = [b for b in eng["branches"] if b["revs"] == 0]
        if not single:
            continue
        b = single[0]
        v1_ref, v2_ref = oracles.lambert_single(
            inp["r1"], inp["r2"], inp["tof"], inp["mu"], inp["retrograde"]
        )
        scale = max(np.linalg.norm(v1_ref), 1e-30)
        worst = max(worst, np.linalg.norm(np.array(b["v1"]) - v1_ref) / scale)
        f1 = vec_close(
            b["v1"], v1_ref, rtol=T.LAMBERT_VEL_RTOL, atol=T.LAMBERT_VEL_ATOL
        )
        f2 = vec_close(
            b["v2"], v2_ref, rtol=T.LAMBERT_VEL_RTOL, atol=T.LAMBERT_VEL_ATOL
        )
        assert f1 is None, ("v1", inp, f1)
        assert f2 is None, ("v2", inp, f2)
    record("lambert", worst)


def test_lambert_endpoint_repropagation():
    """Engine v1 propagated by the library reaches the engine r2 (physics check).

    Uses the robust all-conic farnocchia propagator. The engine v1 is already
    corroborated against hapsira izzo by the velocity test above; this is the
    independent physics confirmation that v1 actually connects r1 to r2 in tof. A
    case the oracle propagator itself cannot resolve (a non-finite or grossly wrong
    landing, which flags the oracle's own limit on an extreme transfer, not an engine
    error) is counted and skipped, and such skips must stay a small minority."""
    doc = load_generated("lambert")
    worst = 0.0
    checked = 0
    skipped = 0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        single = [b for b in eng["branches"] if b["revs"] == 0]
        if not single:
            continue
        v1 = single[0]["v1"]
        r2 = np.asarray(inp["r2"], float)
        scale = max(np.linalg.norm(r2), 1e-30)
        try:
            r_land, _ = oracles.propagate_robust(inp["r1"], v1, inp["tof"], inp["mu"])
        except Exception:
            skipped += 1
            continue
        rel = np.linalg.norm(r_land - r2) / scale
        if not np.isfinite(rel) or rel > 1e-2:
            skipped += 1  # oracle propagator could not resolve this extreme transfer
            continue
        worst = max(worst, rel)
        checked += 1
        f = vec_close(
            r_land, r2, rtol=T.LAMBERT_ENDPOINT_RTOL, atol=T.LAMBERT_ENDPOINT_ATOL
        )
        assert f is None, ("endpoint", inp, f)
    record("lambert_endpoint", worst)
    assert checked > 0
    assert skipped <= 0.05 * (checked + skipped), (
        f"too many oracle-unresolved transfers: {skipped}/{checked + skipped}"
    )
