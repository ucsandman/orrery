"""Differential test: the patched-conic transfer hyperbolic excess speed.

Engine transferArc (a heliocentric Bate-Mueller-White Lambert arc joined to
departure and arrival hyperbolas) vs an independent hapsira izzo solve of the same
heliocentric arc, compared on v_inf, the hyperbolic excess speed (the spacecraft's
speed relative to a planet far outside that planet's gravity). The two solvers use
different Lambert algorithms, so this confirms transferArc's velocities and its
v_inf formation against an independent source.

This is the approximate patched-conic model, so the assertion bound is the model's
published accuracy envelope (PATCHED_CONIC_VINF_RTOL), never machine precision. The
real agreement of the two exact Lambert solvers is far tighter and is recorded as
the measured current.
"""

from conftest import load_generated, close_to, record
import oracles
import tolerances as T


def test_patched_conic_vinf():
    doc = load_generated("patchedconic")
    worst = 0.0
    checked = 0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        vinf_d_ref, vinf_a_ref = oracles.patched_conic_vinf(
            inp["r1"],
            inp["vPlanet1"],
            inp["r2"],
            inp["vPlanet2"],
            inp["tof"],
            inp["mu"],
        )
        for name, eng_val, ref_val in (
            ("vInfDepart", eng["vInfDepart"], vinf_d_ref),
            ("vInfArrive", eng["vInfArrive"], vinf_a_ref),
        ):
            scale = max(abs(ref_val), 1e-30)
            worst = max(worst, abs(eng_val - ref_val) / scale)
            assert close_to(
                eng_val,
                ref_val,
                rtol=T.PATCHED_CONIC_VINF_RTOL,
                atol=T.PATCHED_CONIC_VINF_ATOL,
            ), (name, inp, eng_val, ref_val)
        checked += 1
    record("patchedconic", worst)
    assert checked > 0, "no patched-conic cases checked"
