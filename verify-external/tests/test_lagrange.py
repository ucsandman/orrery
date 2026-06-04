"""Differential test: Lagrange points.

Engine lagrangePoints vs the exact equilateral closed form (L4/L5), an independent
scipy.optimize.brentq root of the collinear quintic (L1/L2/L3), and the hapsira
library lagrange_points mapped into the engine frame. The collinear equilibrium
residual |dOmega/dx| at the engine point is also checked.
"""

import math

from conftest import load_generated, close_to, record
import oracles
import tolerances as T


def test_lagrange_equilateral():
    doc = load_generated("lagrange")
    worst = 0.0
    for c in doc["cases"]:
        mu = c["input"]["mu"]
        eng = c["engineOutput"]
        ex = 0.5 - mu
        ey = math.sqrt(3) / 2
        for pt, sy in (("L4", +ey), ("L5", -ey)):
            worst = max(worst, abs(eng[pt][0] - ex))
            assert close_to(
                eng[pt][0],
                ex,
                rtol=T.LAGRANGE_EQUILATERAL_RTOL,
                atol=T.LAGRANGE_EQUILATERAL_ATOL,
            ), (pt, mu)
            assert close_to(
                eng[pt][1],
                sy,
                rtol=T.LAGRANGE_EQUILATERAL_RTOL,
                atol=T.LAGRANGE_EQUILATERAL_ATOL,
            ), (pt, mu)
    record("lagrange_equilateral", worst)


def test_lagrange_collinear_vs_scipy():
    doc = load_generated("lagrange")
    worst = 0.0
    for c in doc["cases"]:
        mu = c["input"]["mu"]
        eng = c["engineOutput"]
        xs = oracles.lagrange_collinear_x_brentq(mu)
        for pt, xref in zip(("L1", "L2", "L3"), xs):
            x_eng = eng[pt][0]
            worst = max(worst, abs(x_eng - xref) / max(abs(xref), 1e-30))
            assert close_to(
                x_eng,
                xref,
                rtol=T.LAGRANGE_COLLINEAR_RTOL,
                atol=T.LAGRANGE_COLLINEAR_ATOL,
            ), (pt, mu, x_eng, xref)
            # equilibrium residual at the engine's own point
            assert (
                oracles.collinear_residual(x_eng, mu)
                <= T.LAGRANGE_COLLINEAR_RESIDUAL_ATOL
            ), (pt, mu)
    record("lagrange_collinear", worst)


def test_lagrange_collinear_vs_hapsira():
    doc = load_generated("lagrange")
    worst = 0.0
    for c in doc["cases"]:
        mu = c["input"]["mu"]
        eng = c["engineOutput"]
        xs = oracles.lagrange_collinear_x_hapsira(mu)
        for pt, xref in zip(("L1", "L2", "L3"), xs):
            x_eng = eng[pt][0]
            worst = max(worst, abs(x_eng - xref) / max(abs(xref), 1e-30))
            assert close_to(
                x_eng,
                xref,
                rtol=T.LAGRANGE_COLLINEAR_RTOL,
                atol=T.LAGRANGE_COLLINEAR_ATOL,
            ), (pt, mu, x_eng, xref)
    record("lagrange_library", worst)
