"""Differential test: impulsive maneuvers.

Hohmann and bi-elliptic delta-v vs hapsira core maneuver functions; pure and
combined plane-change delta-v vs the cited closed form (hapsira has no direct
plane-change-cost function).
"""

from conftest import load_generated, close_to, record
import oracles
import tolerances as T


def test_maneuver_delta_v():
    doc = load_generated("maneuvers")
    worst = 0.0
    for c in doc["cases"]:
        inp, eng = c["input"], c["engineOutput"]
        kind = inp["kind"]
        eng_total = float(eng["totalDv"])
        if kind == "hohmann":
            ref = oracles.hohmann_total_dv(inp["r1"], inp["r2"], inp["mu"])
        elif kind == "biElliptic":
            ref = oracles.bielliptic_total_dv(
                inp["r1"], inp["r2"], inp["rb"], inp["mu"]
            )
        elif kind == "planeChange":
            ref = oracles.plane_change_dv(inp["v"], inp["inc"])
        elif kind == "combinedPlaneChange":
            ref = oracles.combined_plane_change_dv(inp["v1"], inp["v2"], inp["inc"])
        else:
            raise AssertionError(f"unknown maneuver kind {kind}")
        worst = max(worst, abs(eng_total - ref) / max(abs(ref), 1e-30))
        assert close_to(
            eng_total, ref, rtol=T.MANEUVER_DV_RTOL, atol=T.MANEUVER_DV_ATOL
        ), (kind, inp, eng_total, ref)
    record("maneuvers", worst)
