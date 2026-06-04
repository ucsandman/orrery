"""Independent oracle wrappers.

The pinned library is hapsira 0.18.0 (the maintained poliastro fork). Where hapsira
provides the operation, it is the oracle and the engine result is checked against
it. Where it does not (the pure plane-change and combined plane-change burns), a
cited closed form is used instead, labeled as such. The Lagrange collinear oracle
additionally uses scipy.optimize.brentq, a bracketing root finder different from
the engine's Newton iteration.

Every oracle takes raw SI floats (m, m/s, rad, m^3/s^2) and the same gravitational
parameter the engine used, so the comparison is apples to apples (no library
default GM is ever substituted).
"""

from __future__ import annotations

import math
import numpy as np
from scipy.optimize import brentq

from hapsira.core.elements import rv2coe, coe2rv
from hapsira.core.propagation import danby, farnocchia
from hapsira.core.iod import izzo as izzo_core
from hapsira.core.maneuver import hohmann as hap_hohmann, bielliptic as hap_bielliptic
from hapsira.threebody.restricted import lagrange_points as hap_lagrange_points
from astropy import units as u


# --- Elements -----------------------------------------------------------------


def elements_from_rv(r, v, mu):
    """hapsira rv2coe -> classical elements dict. Returns semi-major axis a (not p)."""
    p, ecc, inc, raan, argp, nu = rv2coe(mu, np.asarray(r, float), np.asarray(v, float))
    a = math.inf if abs(1.0 - ecc) < 1e-15 else p / (1.0 - ecc * ecc)
    return {"a": a, "e": ecc, "i": inc, "p": p, "raan": raan, "argp": argp, "nu": nu}


def rv_from_elements(a, e, i, raan, argp, nu, mu):
    """hapsira coe2rv -> (r, v). Engine gives a; hapsira wants the semi-latus rectum p."""
    p = a * (1.0 - e * e)
    r, v = coe2rv(mu, p, e, i, raan, argp, nu)
    return np.asarray(r, float), np.asarray(v, float)


# --- Kepler propagation -------------------------------------------------------


def propagate(r0, v0, dt, mu):
    """hapsira danby propagator (a Kepler solver independent of the engine's universal
    variables). Returns (r, v). The convergence tolerance is tightened to 1e-13 (well
    below danby's 1e-8 default) so the oracle converges to comparable precision and the
    comparison measures the engines' agreement, not danby's early-stop residual."""
    out = danby(mu, np.asarray(r0, float), np.asarray(v0, float), float(dt), 200, 1e-13)
    return np.asarray(out[0], float), np.asarray(out[1], float)


def propagate_robust(r0, v0, dt, mu):
    """hapsira farnocchia propagator (robust across every conic, including the highly
    eccentric and hyperbolic transfer arcs a Lambert solve can produce). Returns (r, v)."""
    out = farnocchia(mu, np.asarray(r0, float), np.asarray(v0, float), float(dt))
    return np.asarray(out[0], float), np.asarray(out[1], float)


def propagate_regime(r0, v0, dt, mu):
    """Independent Kepler propagation, choosing the oracle by orbit regime.

    danby is hapsira's "Kepler solver for both elliptic and parabolic orbits" (its
    own docstring); its hyperbolic branch reduces the mean anomaly modulo 2*pi, which
    is only valid for periodic elliptic motion, so it returns a wrong state for an
    unbounded orbit. For bound orbits (specific orbital energy < 0) danby is used as a
    method independent of the engine's universal variables; for unbounded orbits
    (energy >= 0, every hyperbola the adversarial sample reaches) the robust all-conic
    farnocchia is the independent oracle. The regime test uses the energy of the state
    itself, not any engine output. Returns (r, v)."""
    r0a = np.asarray(r0, float)
    v0a = np.asarray(v0, float)
    energy = 0.5 * float(v0a @ v0a) - float(mu) / float(np.linalg.norm(r0a))
    if energy < 0.0:
        return propagate(r0a, v0a, dt, mu)
    return propagate_robust(r0a, v0a, dt, mu)


# --- Lambert ------------------------------------------------------------------


def lambert_single(r1, r2, tof, mu, retrograde):
    """hapsira core izzo single-revolution Lambert. Returns (v1, v2)."""
    v1, v2 = izzo_core(
        float(mu),
        np.asarray(r1, float),
        np.asarray(r2, float),
        float(tof),
        0,
        not retrograde,
        True,
        35,
        1e-8,
    )
    return np.asarray(v1, float), np.asarray(v2, float)


def lambert_multi(r1, r2, tof, mu, retrograde, revs, lowpath):
    """hapsira core izzo multi-revolution Lambert for a given revolution count `revs`
    and branch `lowpath` (the vacant focus below the chord when True). Returns (v1, v2).
    The engine's two multi-rev branches per revolution count (rightBranch False/True)
    are matched against hapsira's two (lowpath False/True)."""
    v1, v2 = izzo_core(
        float(mu),
        np.asarray(r1, float),
        np.asarray(r2, float),
        float(tof),
        int(revs),
        not retrograde,
        bool(lowpath),
        35,
        1e-8,
    )
    return np.asarray(v1, float), np.asarray(v2, float)


# --- Patched-conic transfer ---------------------------------------------------


def patched_conic_vinf(r1, v_planet1, r2, v_planet2, tof, mu, retrograde=False):
    """Independent hyperbolic excess speeds for a heliocentric transfer arc.

    Solves the same heliocentric Lambert arc with hapsira izzo (an algorithm
    independent of the engine's Bate-Mueller-White solver inside transferArc), then
    forms v_inf as the magnitude of the transfer velocity minus the planet velocity
    at each end, the same definition the engine uses. Returns (vInfDepart, vInfArrive)."""
    v1, v2 = lambert_single(r1, r2, tof, mu, retrograde)
    vinf_depart = float(np.linalg.norm(v1 - np.asarray(v_planet1, float)))
    vinf_arrive = float(np.linalg.norm(v2 - np.asarray(v_planet2, float)))
    return vinf_depart, vinf_arrive


# --- Maneuvers ----------------------------------------------------------------


def _sum_impulse_norms(ret):
    """Total delta-v from a hapsira maneuver return: sum of the 3-vector impulse norms."""
    total = 0.0
    for x in ret:
        a = np.atleast_1d(np.asarray(x, float))
        if a.shape == (3,):
            total += float(np.linalg.norm(a))
    return total


def hohmann_total_dv(r1, r2, mu):
    """hapsira core hohmann between circular orbits of radii r1, r2."""
    vc1 = math.sqrt(mu / r1)
    rv = (np.array([r1, 0.0, 0.0]), np.array([0.0, vc1, 0.0]))
    return _sum_impulse_norms(hap_hohmann(mu, rv, r2))


def bielliptic_total_dv(r1, r2, rb, mu):
    """hapsira core bi-elliptic via intermediate apoapsis rb."""
    vc1 = math.sqrt(mu / r1)
    rv = (np.array([r1, 0.0, 0.0]), np.array([0.0, vc1, 0.0]))
    return _sum_impulse_norms(hap_bielliptic(mu, rb, r2, rv))


def plane_change_dv(v, inc):
    """Cited closed form (Curtis, Vallado): pure plane change dv = 2 v |sin(inc/2)|.
    hapsira has no direct plane-change-cost function, so this is the independent oracle."""
    return 2.0 * v * abs(math.sin(inc / 2.0))


def combined_plane_change_dv(v1, v2, inc):
    """Cited closed form: dv = sqrt(v1^2 + v2^2 - 2 v1 v2 cos inc), in the
    cancellation-free arrangement sqrt((v1-v2)^2 + 4 v1 v2 sin^2(inc/2))."""
    half = math.sin(inc / 2.0)
    return math.sqrt((v1 - v2) ** 2 + 4.0 * v1 * v2 * half * half)


# --- Lagrange points ----------------------------------------------------------


def lagrange_collinear_x_brentq(mu):
    """Independent collinear roots of dOmega/dx = 0 on y = z = 0, by scipy brentq
    (bracketing), in the engine's frame (larger primary at -mu, smaller at 1-mu).
    Returns (xL1, xL2, xL3)."""

    def f(x):
        return (
            x
            - (1.0 - mu) * (x + mu) / abs(x + mu) ** 3
            - mu * (x - (1.0 - mu)) / abs(x - (1.0 - mu)) ** 3
        )

    eps = 1e-9
    x_big = -mu  # larger primary
    x_small = 1.0 - mu  # smaller primary
    xL1 = brentq(f, x_big + eps, x_small - eps, xtol=1e-15, rtol=1e-15)
    xL2 = brentq(f, x_small + eps, x_small + 2.0, xtol=1e-15, rtol=1e-15)
    xL3 = brentq(f, x_big - 2.0, x_big - eps, xtol=1e-15, rtol=1e-15)
    return xL1, xL2, xL3


def lagrange_collinear_x_hapsira(mu):
    """hapsira library collinear x, mapped to the engine frame.

    hapsira.threebody.restricted.lagrange_points(r12, m1, m2) returns x measured from
    the larger primary; with separation 1 and the larger primary at engine x = -mu,
    engine_x = hapsira_value - mu. Verified across L1, L2, L3, L4 for Earth-Moon.
    Returns (xL1, xL2, xL3)."""
    lp = hap_lagrange_points(1.0 * u.km, (1.0 - mu) * u.kg, mu * u.kg).to_value(u.km)
    return lp[0] - mu, lp[1] - mu, lp[2] - mu


def collinear_residual(x, mu):
    """|dOmega/dx| at a collinear point, the physics equilibrium residual."""
    return abs(
        x
        - (1.0 - mu) * (x + mu) / abs(x + mu) ** 3
        - mu * (x - (1.0 - mu)) / abs(x - (1.0 - mu)) ** 3
    )
