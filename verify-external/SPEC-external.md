# Orrery external validation specification

This is the contract for `verify-external/`, a differential-validation layer that
checks the Orrery core against truth the original build did not author. The core
(`src/`) is validated internally against closed-form solutions and conservation
laws. This layer adds an independent, external check: real ephemerides and a
second astrodynamics implementation. It is a separate workspace so the core keeps
its zero runtime dependency rule. This layer may use Python and the network; the
core may not.

A term is defined the first time it appears.

## The two oracle classes

A differential test compares the engine's answer to an independent answer for the
same input and asserts they agree within a stated tolerance. Two independent
sources of truth are used.

### Oracle A: real ephemerides (JPL Horizons)

An ephemeris is a table of a body's position and velocity over time. JPL Horizons
is NASA's reference ephemeris service. We fetch, once, a committed set of Horizons
state vectors for the planets across a range of epochs, then check two things
against them, offline and deterministically:

- The Standish ephemeris in the core (`planetStateAtJD`, Curtis Algorithm 8.1, an
  approximate Keplerian model with centennial rates) against the Horizons truth.
- Short-span two-body propagation (`propagateUniversal`) of a Horizons state
  against the Horizons state a short time later.

The Standish model is approximate, so its check uses the model's own published
accuracy envelope, not machine precision (see Tolerance philosophy).

### Oracle B: an independent implementation (hapsira)

One external astrodynamics library, selected and pinned, recomputes the exact
pieces the core computes, across a large seeded random sample:

- classical elements to and from a state vector,
- Kepler propagation of a given orbit,
- Lambert single- and multi-revolution (Lambert's problem: given two positions
  and a flight time, find the connecting orbit),
- Hohmann, bi-elliptic, and plane-change delta-v (delta-v: the change in velocity
  a maneuver costs),
- the Lagrange points (the five equilibria of the circular restricted three-body
  problem).

The pinned library is **hapsira 0.18.0**, the maintained fork of poliastro (which
was archived in October 2023). hapsira was selected because it is the single
external library that covers the entire surface above (elements, Kepler, Lambert
with multi-revolution, Hohmann and bi-elliptic maneuvers, and Lagrange points via
`hapsira.threebody.restricted.lagrange_points_vec`, which implements Curtis
Eq. 2.204) and it installs cleanly on this machine (Python 3.12, Windows). pykep,
the other full-coverage candidate, ships no Windows wheel on PyPI and so cannot
support an offline pip-only suite here; poliastro is archived. The exact resolved
dependency versions are pinned in `requirements.lock`.

Where hapsira does not provide a piece (the pure plane-change and the combined
plane-change burn), the oracle is a cited closed form (Curtis, Vallado), kept
clearly separate and labeled in `tests/oracles.py`. The independent Lagrange
collinear-point oracle additionally uses `scipy.optimize.brentq`, a bracketing
root finder different from the engine's Newton iteration, so the two solvers do
not share a method.

## Comparison architecture

The engine emits, Python recomputes.

1. A Node emitter (`sample/emit.ts`, run through `tsx`), given a category and a
   fixed integer seed, generates a seeded random sample of input cases, computes
   the engine output for each by calling the public core functions, and writes one
   JSON document per category to `generated/`:

   ```json
   { "category": "kepler", "seed": 20260604,
     "cases": [ { "input": { ... }, "engineOutput": { ... } } ] }
   ```

2. The pytest suite (`tests/`) loads that document, feeds each `input` to the
   pinned oracle (hapsira, scipy, or a cited closed form), and asserts the
   recomputed reference agrees with `engineOutput` within the category tolerance.

This direction was chosen over "Python generates cases and calls Node per case"
because it spawns one process per category instead of one per case, makes the
committed JSON the audit artifact (an engine regression shows up as a changed
fixture in `git diff`), and removes the central failure mode of two languages
disagreeing about what a case even is. IEEE-754 doubles round-trip exactly through
`JSON.stringify` and `json.loads`, so the oracle sees bit-identical inputs.

Vectors are emitted as `[x, y, z]` arrays. The analytic categories are strict SI
(metres, metres per second, radians, gravitational parameter in m^3 s^-2). The
Standish category is the ephemeris unit system (km, km/s, gravitational parameter
in km^3 s^-2, Julian Date).

## Determinism

After the one-time Horizons fetch, the suite is offline and deterministic.

- The engine's case sample is drawn from a single fixed integer seed per category,
  recorded in `sample/seeds.ts` and copied into each emitted JSON. The core
  forbids wall-clock and nondeterministic-random calls and routes all randomness
  through its seeded `xoshiro256**` generator, so a fixed input reproduces a fixed
  output.
- The oracle libraries do no network and no randomness in the paths used. astropy
  IERS auto-download is disabled in `tests/conftest.py`.
- The Horizons truth is the committed fixtures under `fixtures/`. The fetch script
  is never run by the suite.

## Tolerance philosophy

No comparison uses bare equality or a fixed number of decimal places. Every
comparison uses the mixed tolerance `|a - b| <= atol + rtol * max(|a|, |b|)`, the
same shape the core's tests use. Every tolerance is a named constant in
`tests/tolerances.py` whose docstring cites its source. The absolute term is the
floor for quantities that cancel to zero (a velocity component, a vanishing
delta-v).

Two anchoring rules:

- Exact methods are anchored to the core's own measured internal envelope (from
  `bar.json`) plus headroom for the oracle's different numerical method. A second
  independent implementation stops iterating at its own cutoff and sums floats in
  a different order, so it will not match the engine to the engine's own
  self-consistency. The external bound sits one to three orders above the measured
  internal floor. It is not machine precision.
- Approximate models are anchored to the model's published accuracy envelope,
  never machine precision. The Standish ephemeris uses its published 1800-2050
  envelope; the patched-conic transfer uses its stated accuracy.

### Tolerance table

Every constant lives in `tests/tolerances.py`. A value still awaiting its first
real measurement is marked "(target)" and is tightened toward the observed
maximum only from a real run, never fabricated.

| Constant | rtol | atol | units | Source / anchor |
| --- | --- | --- | --- | --- |
| `ELEMENTS_FWD_RTOL` | 1e-11 | angle/dimensionless | rad | bar.json keplerRoundTripError 8.7e-14 (atan2 extraction) + oracle headroom (target) |
| `ELEMENTS_INV_RTOL` | 1e-11 | `ELEMENTS_POS_ATOL`/`ELEMENTS_VEL_ATOL` | m, m/s | bar.json keplerRoundTripError 2.0e-14 relative + oracle headroom (target) |
| `ELEMENTS_POS_ATOL` | - | 1e-3 | m | atol floor for a position component cancelling near zero |
| `ELEMENTS_VEL_ATOL` | - | 1e-6 | m/s | atol floor for a velocity component cancelling near zero |
| `KEPLER_RTOL` | 1e-9 | pos/vel atol | m, m/s | bar.json universalVsRegimeError 7.0e-14 + oracle solver cutoff (target) |
| `LAMBERT_VEL_RTOL` | 1e-8 | `LAMBERT_VEL_ATOL` | m/s | bar.json lambertIzzoVsBmwError 4.4e-13 + third-solver Izzo cutoff (target) |
| `LAMBERT_VEL_ATOL` | - | 1e-6 | m/s | atol floor for a transfer velocity component near zero |
| `LAMBERT_ENDPOINT_RTOL` | 1e-7 | 1e-3 (m) | m | external-propagator regime: engine v1 re-propagated by hapsira farnocchia, measured worst 1.6e-9 (not the engine's tighter internal 4.2e-12) |
| `MANEUVER_DV_RTOL` | 1e-10 | `MANEUVER_DV_ATOL` | m/s | closed-form vis-viva and plane-change identity, correctly-rounded arithmetic (target) |
| `MANEUVER_DV_ATOL` | - | 1e-6 | m/s | atol floor for a vanishing burn (R near 1, inc near 0) |
| `LAGRANGE_EQUILATERAL_RTOL` | 1e-13 | 1e-15 | dimensionless | bar.json lagrangeL4L5Error 4.7e-16 (exact closed form both sides) |
| `LAGRANGE_COLLINEAR_RTOL` | 1e-10 | 1e-12 | dimensionless (x) | bar.json collinearResidual 2.95e-14 + brentq-vs-Newton headroom (target) |
| `LAGRANGE_COLLINEAR_RESIDUAL_ATOL` | - | 1e-12 | dimensionless | bar.json collinearResidual 2.95e-14 (residual at the engine point) |
| `STANDISH_POS_RTOL_TERRESTRIAL` | 1e-3 | 1e-5 (AU) | relative | Standish 1800-2050 terrestrial envelope, about 3.4 arcminutes of heliocentric angle (JPL approx-positions memo); conservative ceiling, target |
| `STANDISH_POS_RTOL_GIANT` | 4e-3 | 1e-5 (AU) | relative | Standish 1800-2050 giant-planet envelope, about 13.8 arcminutes (the Jupiter-Saturn great inequality this low-precision set omits); conservative ceiling, target |
| `PATCHED_CONIC_VINF_RTOL` | 1e-3 | 1e-3 (km/s) | dimensionless | bar.json earthMarsVinfError target 1e-3, patched-conic published envelope |

The Standish position envelope is per planet and relative (the displacement
magnitude over the heliocentric distance), because the dominant model error is
angular. It is two-tier: the terrestrial planets sit within a few arcminutes of
heliocentric longitude over 1800-2050, while the giant planets carry larger errors
(the Jupiter-Saturn great inequality, which the low-precision linear-rate set
omits). The verified run measures Saturn worst at 3.27e-3 (within the 4e-3 giant
tier) and Earth and Mars worst at 3.37e-4 (within the 1e-3 terrestrial tier). The
tiers are conservative ceilings consistent with the memo's stated accuracy class;
the exact per-planet arcsecond figures are pending source re-verification (the same
discipline as the element tables), and the bound is never tightened to engine
precision because the model is approximate.

## Horizons fixture specification

The fixtures in `fixtures/` are heliocentric, ecliptic-of-J2000, geometric state
vectors (no light-time, no aberration) so the comparison frame matches the
Standish elements, which are referred to the J2000 ecliptic and are heliocentric.

- origin: the Sun's center (`location='@sun'`).
- frame: ecliptic and mean equinox of J2000 (`refplane='ecliptic'`).
- geometry: geometric states (`aberrations='geometric'`).
- units as fetched: AU and AU/day; the fixture records both AU/day and a derived
  km, km/s copy for the engine comparison.
- epochs: a grid of Julian dates spread across the model's validity window so the
  centennial rates are exercised, recorded as TDB Julian dates (Horizons epochs
  are TDB). The core treats the Julian date as TT; the TDB minus TT difference is
  at most about 1.7 ms, far below the Standish accuracy envelope, so it is carried
  as a documented, bounded offset and not corrected.
- schema per record: `{ body, naif_id, jd_tdb, frame, origin, units, r_au[3],
  v_aupd[3], r_km[3], v_kms[3], source }`.

## Planet element data provenance

The core exposes Standish element tables only for Earth and Mars
(`STANDISH_EARTH`, `STANDISH_MARS`, Curtis Table 8.1, Standish 1992, referred to
the J2000 ecliptic). To check all the planets, the other six element sets are
committed as data in `data/standish_all_planets.json`, transcribed from the same
source (Curtis Table 8.1 / Standish 1992) and cited there. The Earth and Mars rows
in the data file are asserted equal to the core's own `STANDISH_EARTH` and
`STANDISH_MARS` by the emitter, so the data file's provenance is anchored to the
verified core constants. The six other rows are flagged in the provenance file as
transcribed and pending independent source re-verification; a row with a
transcription error reveals itself as a Standish-vs-Horizons disagreement beyond
the envelope, which is a real filed finding, not a silent pass.

## Build and break loop

- A build push extends the comparison: another category wired to its oracle,
  another planet's fixtures, a measured tolerance tightened from a real run.
- A break push generates adversarial cases (extreme eccentricity near 0, near 1,
  and above 1; very long time of flight; multi-revolution; retrograde;
  near-parabolic; near-collinear Lambert; tiny and large maneuver radius ratios;
  mass parameter near 0.5 and near 0 for Lagrange) and asserts agreement within
  tolerance, or files the discrepancy as a failing test recording the case before
  any fix.

`bar-external.json` is the ratchet. It tracks the maximum agreement error per
category (Standish vs Horizons, Kepler vs library, Lambert vs library, maneuvers
vs library, Lagrange vs library), the fixture count, the sample size, and the
count of unexplained disagreements (target zero). Current values move toward
target only through verified runs.

## Turn close protocol

End every turn with a fenced STATUS block: the literal differential-run output and
exit code, every `bar-external.json` value next to its target, a one-line note on
what advanced and what remains, and any red comparison named. Paste real output.
