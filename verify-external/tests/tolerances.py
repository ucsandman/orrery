"""Named tolerance constants for the external differential suite.

Every comparison uses the mixed tolerance |a - b| <= atol + rtol * max(|a|, |b|).
Every constant here cites its source. Exact methods are anchored to the core's own
measured internal envelope in bar.json plus headroom for the oracle's different
numerical method; they are not held to machine precision against a second
implementation. Approximate models are anchored to the model's published accuracy
envelope. A value still awaiting its first real measurement is marked "(target)".
"""

import math as _math

# --- Elements (state <-> classical elements), exact ---------------------------
ELEMENTS_FWD_RTOL = (
    1e-11  # bar.json keplerRoundTripError 8.7e-14 (atan2) + oracle headroom (target)
)
ELEMENTS_INV_RTOL = (
    1e-11  # bar.json keplerRoundTripError 2.0e-14 relative + oracle headroom (target)
)
ELEMENTS_POS_ATOL = 1e-3  # m, floor for a position component cancelling near zero
ELEMENTS_VEL_ATOL = 1e-6  # m/s, floor for a velocity component cancelling near zero

# --- Kepler propagation, exact ------------------------------------------------
KEPLER_RTOL = (
    1e-9  # bar.json universalVsRegimeError 7.0e-14 + oracle solver cutoff (target)
)

# --- Lambert, exact -----------------------------------------------------------
LAMBERT_VEL_RTOL = (
    1e-8  # bar.json lambertIzzoVsBmwError 4.4e-13 + third-solver Izzo cutoff (target)
)
LAMBERT_VEL_ATOL = 1e-6  # m/s, floor for a transfer velocity component near zero
# The endpoint invariant here re-propagates the engine v1 with an EXTERNAL propagator
# (hapsira farnocchia), so its floor is that propagator's accuracy on the sampled
# transfer geometries, not the engine's own internal 4.2e-12 (bar.json
# lambertEndpointError). farnocchia vs the engine's universal-variable propagator
# disagree by up to about 1.6e-9 on the largest, most eccentric sampled transfers; the
# bound carries margin above that. The tight engine-internal re-propagation stays the
# core's own test; this is the independent cross-propagator physics confirmation.
LAMBERT_ENDPOINT_RTOL = (
    1e-7  # external-propagator regime (measured worst 1.6e-9 nominal)
)
LAMBERT_ENDPOINT_ATOL = 1e-3  # m, floor

# --- Maneuvers, exact closed form ---------------------------------------------
MANEUVER_DV_RTOL = 1e-10  # closed-form vis-viva and plane-change identity, correctly-rounded arithmetic (target)
MANEUVER_DV_ATOL = 1e-6  # m/s, floor for a vanishing burn (R near 1, inc near 0)

# --- Lagrange points, exact ---------------------------------------------------
LAGRANGE_EQUILATERAL_RTOL = (
    1e-13  # bar.json lagrangeL4L5Error 4.7e-16 (exact closed form both sides)
)
LAGRANGE_EQUILATERAL_ATOL = 1e-15
LAGRANGE_COLLINEAR_RTOL = (
    1e-10  # bar.json collinearResidual 2.95e-14 + brentq-vs-Newton headroom (target)
)
LAGRANGE_COLLINEAR_ATOL = 1e-12
LAGRANGE_COLLINEAR_RESIDUAL_ATOL = (
    1e-12  # bar.json collinearResidual 2.95e-14 (residual at the engine point)
)

# --- Standish ephemeris, approximate model (published envelope, not precision) -
# JPL "Keplerian Elements for Approximate Positions of the Major Planets" (Standish,
# https://ssd.jpl.nasa.gov/planets/approx_pos.html). The dominant model error is
# angular (along-track), so the bound is a RELATIVE position error (the displacement
# magnitude over the heliocentric distance), which captures the published angular
# envelope at every planet's distance.
#
# The envelope is two-tier, not a single number: the giant planets (driven by the
# Jupiter-Saturn great inequality, which this low-precision linear-rate set omits)
# have larger 1800-2050 errors than the terrestrial planets, so a single bound would
# be too tight for Saturn or too loose for Mercury. The two tiers below are
# CONSERVATIVE CEILINGS for the low-precision Standish set, consistent with the memo's
# statement that it reproduces planetary positions to within a few arcminutes
# (terrestrial) to about ten arcminutes (giant) over 1800-2050. They are marked
# pending exact per-planet figures from the memo's error table, the same
# re-verification discipline as the element tables. They are never tightened to engine
# precision, and the real measured per-planet error is recorded in bar-external.json.
_ARCSEC = _math.pi / (180.0 * 3600.0)
STANDISH_POS_RTOL_TERRESTRIAL = 1.0e-3  # ~3.4 arcminutes (target, conservative ceiling)
STANDISH_POS_RTOL_GIANT = 4.0e-3  # ~13.8 arcminutes (target, conservative ceiling)
_GIANTS = {"jupiter", "saturn", "uranus", "neptune"}
STANDISH_POS_ATOL_AU = 1e-5  # AU, small floor under the angular envelope
STANDISH_VEL_ATOL_AUPD = 1e-6  # AU/day, floor


def standish_pos_rtol(planet: str) -> float:
    """Per-planet relative position envelope for the low-precision Standish set:
    the giant-planet tier for the four outer planets, the terrestrial tier otherwise."""
    return (
        STANDISH_POS_RTOL_GIANT if planet in _GIANTS else STANDISH_POS_RTOL_TERRESTRIAL
    )


# --- Patched-conic transfer, approximate model --------------------------------
PATCHED_CONIC_VINF_RTOL = (
    1e-3  # bar.json earthMarsVinfError target 1e-3, patched-conic published envelope
)
