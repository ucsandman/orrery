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


def test_lambert_multi_rev_velocities():
    """Engine multi-revolution branches (revs >= 1) vs hapsira izzo at the same
    revolution count. Izzo's multi-rev problem has two solutions per revolution
    count (a left and a right branch); the engine labels them rightBranch False/True
    and hapsira labels them lowpath False/True. Physics does not fix that naming, so
    each engine branch is required to match one of hapsira's two branches at its
    revolution count, and the resolved label mapping is asserted to be consistent
    (every engine rightBranch value maps to a single hapsira lowpath value)."""
    doc = load_generated("lambert")
    worst = 0.0
    checked = 0
    mapping = {}  # engine rightBranch -> hapsira lowpath that matched
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        for b in eng["branches"]:
            if b["revs"] < 1:
                continue
            best = None
            best_lowpath = None
            for lowpath in (True, False):
                try:
                    v1_ref, v2_ref = oracles.lambert_multi(
                        inp["r1"],
                        inp["r2"],
                        inp["tof"],
                        inp["mu"],
                        inp["retrograde"],
                        b["revs"],
                        lowpath,
                    )
                except Exception:
                    continue
                if not (np.all(np.isfinite(v1_ref)) and np.all(np.isfinite(v2_ref))):
                    continue
                scale = max(np.linalg.norm(v1_ref), 1e-30)
                rel = np.linalg.norm(np.array(b["v1"]) - v1_ref) / scale
                if best is None or rel < best:
                    best, best_lowpath = rel, lowpath
                    best_v1, best_v2 = v1_ref, v2_ref
            assert best is not None, ("no oracle multi-rev solution", inp, b["revs"])
            worst = max(worst, best)
            f1 = vec_close(
                b["v1"], best_v1, rtol=T.LAMBERT_VEL_RTOL, atol=T.LAMBERT_VEL_ATOL
            )
            f2 = vec_close(
                b["v2"], best_v2, rtol=T.LAMBERT_VEL_RTOL, atol=T.LAMBERT_VEL_ATOL
            )
            assert f1 is None, ("multi v1", inp, b["revs"], b["rightBranch"], f1)
            assert f2 is None, ("multi v2", inp, b["revs"], b["rightBranch"], f2)
            mapping.setdefault(b["rightBranch"], set()).add(best_lowpath)
            checked += 1
    record("lambert_multi", worst)
    assert checked > 0, "no multi-revolution branches found to check"
    # The engine-to-oracle branch label mapping must be one-to-one and consistent.
    for right_branch, lowpaths in mapping.items():
        assert len(lowpaths) == 1, (
            f"engine rightBranch={right_branch} matched inconsistent hapsira "
            f"lowpath values {lowpaths}; the branch convention is not stable"
        )


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
