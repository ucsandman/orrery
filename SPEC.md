# Orrery specification

Orrery is a deterministic astrodynamics engine and mission planner. The core is a
pure TypeScript library with no runtime dependencies: no network, no database, no
file input or output, no environment variables. It runs and is fully tested
offline. A thin Hono API and a Next.js plus PixiJS sandbox sit on top as later
layers and never gate verification of the core.

Astrodynamics is the study of how spacecraft and natural bodies move under
gravity. The terms used below are defined the first time they appear.

This document is the contract. Every acceptance criterion is phrased as a binary,
measurable thing a test demonstrates. The numeric thresholds are mirrored in
`bar.json`, which tracks how far each one is from its target.

## Architecture decision

The core uses a hybrid layered design, chosen after a design study that drafted
three candidate architectures and scored them with an independent judge panel on
four axes (correctness, testability, determinism, performance, each 1 to 10).

| Candidate | Correctness | Testability | Determinism | Performance | Overall |
| --- | --- | --- | --- | --- | --- |
| Functional immutable | 9 | 9 | 7 | 4 | 7 |
| Data-oriented typed-array | 6 | 6 | 9 | 9 | 7 |
| Hybrid layered (chosen) | 9 | 9 | 9 | 9 | 9 |

The decision rule was to place each workload on the representation that minimizes
its dominant failure mode, and to confine the one dangerous representation (raw
typed-array index arithmetic) to the single milestone that benefits from it.

- The analytic layer (orbital elements, Kepler propagation, Lambert, maneuvers,
  the three-body problem) uses an immutable `Vec3 = {x, y, z}` value type with
  pure free functions. That is exactly where precision loss, unclamped `acos`
  returning NaN, quadrant-sign mistakes, and catastrophic cancellation hide, so
  it gets full aliasing safety and is trivially round-trippable by property
  tests.
- The N-body simulation layer (milestone 4) and the porkchop scan grids use a
  packed `Float64Array` of length `6 * N` (per body: position x, y, z then
  velocity x, y, z) with zero per-step allocation, a single canonical pairwise
  force kernel as the one source of summation-order truth, and exact byte
  comparison of the underlying buffer for replay.
- The seam between the two layers is two functions (`fromBodies` packs, `toBodies`
  unpacks) plus one `Body` type. It is crossed exactly twice per run cycle (at
  build and at each recorded snapshot), never inside the step loop, so the
  simulation layer never pays the `Vec3` cost and the analytic layer never sees
  raw index math.

The chosen design also commits to the strongest validation posture: two
independent Kepler implementations that must agree (a universal-variable
propagator and a per-regime solver away from the parabolic boundary), and two
independent Lambert solvers that must agree (Izzo as the production solver,
Bate-Mueller-White as the oracle). Two implementations that must agree is a
stronger correctness signal than one implementation checked against transcribed
textbook numbers.

## Module layout

Lower-numbered milestones never import higher-numbered ones; the dependency graph
points one way.

```
src/
  core/
    constants.ts   physical constants, SI, frozen, sourced            (M1)
    vec3.ts        immutable Vec3 value type and pure operations       (M1)
    mat3.ts        rotation matrices, perifocal to inertial transform  (M1)
    units.ts       conversions, used only at a boundary                (M1)
    time.ts        seconds from J2000 TT, split two-part Julian Date   (M1)
    rng.ts         seeded splitmix64 plus xoshiro256** generator       (M1)
  numeric/
    sum.ts         compensated (Neumaier) summation                    (M1)
    stumpff.ts     Stumpff functions C(z), S(z) with Taylor fallback   (M2)
    rootfind.ts    Newton, Danby, Householder iterators, fail loud     (M2)
  twobody/
    elements.ts    state vectors to and from classical elements        (M2)
    kepler.ts      universal-variable propagator plus per-regime oracle (M2)
  orbit/
    classify.ts    period, apoapsis, periapsis, energy, conic type     (M3)
  integrators/
    state.ts       packed Float64Array StateBuffer, the seam           (M4)
    force.ts       the single canonical pairwise gravity kernel        (M4)
    index.ts       integrator interface and four methods               (M4)
    run.ts         fixed-step run, record and replay                   (M4)
  lambert/
    bmw.ts         Bate-Mueller-White universal-variable oracle        (M5)
    izzo.ts        Izzo 2014 production solver, multi-revolution        (M5)
  maneuvers/
    index.ts       Hohmann, bi-elliptic, plane change, delta-v         (M6)
  transfer/
    ephemeris.ts   ephemeris interface plus a deterministic model      (M7)
    patchedconic.ts sphere of influence, departure and arrival         (M7)
    porkchop.ts    deterministic departure-arrival scan                (M7)
  cr3bp/
    index.ts       Jacobi constant, five Lagrange points               (M8)
  index.ts         public barrel
test/
  harness/         shared invariant and tolerance helpers
  fixtures/        committed golden scenes and textbook oracles
  roadmap.test.ts  pending acceptance criteria as test.todo
```

## Determinism contract

Determinism means the same scene and seed produce bit-identical state after the
same number of steps, and a replay reproduces a recorded trajectory exactly. It
is enforced structurally, with honest scope.

1. Fixed floating-point operation order. The force kernel iterates body pairs in
   fixed ascending index order (i before j) with fixed operand order, and writes
   equal-and-opposite contributions (Newton's third law) so total momentum
   cancels to round-off. The conservation harness sums in the same order. No
   unordered or parallel reduction ever touches a numeric path, because IEEE-754
   addition is not associative. This index and operand order is public: changing
   it is a breaking change.
2. No nondeterministic inputs. `Math.random`, `Date.now`, `performance.now`, and
   any locale, time zone, or environment read are forbidden in the core. All
   randomness flows through one seeded `xoshiro256**` generator.
3. Integer-driven time. Simulation time is `stepIndex * dt` by a single multiply,
   never a running `t += dt` accumulation. A zero-step run returns the input
   byte-identical.
4. Correctly-rounded arithmetic in the hot loop. IEEE-754 guarantees correct
   rounding for add, subtract, multiply, divide, and square root, but not for
   sine, cosine, power, cube root, or exponential. The N-body force loop uses
   only the correctly-rounded set, so the simulation path is bit-identical across
   engine versions on a pinned runtime. Transcendental functions are quarantined
   in the analytic Kepler, Lambert, and three-body layers, whose cross-engine
   bit-identity is not promised; that layer is pinned to a Node and V8 major
   version, with cross-platform runs allowed a documented tolerance band.
5. Replay as a binary test. `recordTrajectory` stores the scene, seed, integrator,
   step size, step count, compensation flag, and snapshots; `replayTrajectory`
   re-runs and asserts the underlying `ArrayBuffer` bytes are equal at every
   snapshot. Any nonzero difference is a failure.
6. Finiteness guard. A required softening length greater than zero in the squared
   separation (or explicit rejection of coincident bodies at scene validation)
   plus a per-step finiteness check over the whole buffer makes the no-NaN,
   no-Infinity rule a hard, zero-tolerance check.

## Tolerance philosophy

No physics assertion uses bare equality or a fixed number of decimal places.
Every comparison uses a mixed tolerance, `|a - b| <= atol + rtol max(|a|, |b|)`.
The relative term scales with magnitude; the absolute term is the floor near
zero, used for quantities that cancel to exactly zero (a momentum component).
Every tolerance is a named, commented constant that traces to a source or to a
measured run. Placeholder tolerances are marked as such and tightened only from a
real run, never fabricated.

## Verification strategy

This is the backbone. It is restated in the tests.

- Two-body analytic solutions are ground truth. A two-body case is a single small
  body orbiting one large mass, which has a closed-form solution. Numerical
  propagation of a two-body case must match the closed-form Kepler result within
  a stated tolerance.
- Conservation invariants must hold across integration. Total energy, total
  linear momentum, and total angular momentum stay within stated drift limits,
  and no NaN or infinite value ever appears.
- Integrators cross-check against each other on the same scene and against the
  analytic two-body case.
- Lambert solutions reproduce the input endpoints when re-propagated, and match a
  published Earth to Mars reference within tolerance. Lambert's problem is: given
  two positions and a flight time between them, find the connecting orbit.
- Lagrange point positions, including the collinear point distances, match known
  values for representative mass ratios. A Lagrange point is one of five points
  in a two-body rotating frame where a small body can stay fixed relative to the
  two large bodies.
- Determinism: the same scene and seed produce bit-identical state after the same
  number of steps, and a replay reproduces a recorded trajectory exactly.

## Build and break loop

Work proceeds as alternating pushes.

- A build push extends the engine toward the next milestone.
- A break push tries to falsify the engine: random multi-body scenes checked
  against the conservation invariants, random two-body cases checked against the
  analytic solution, random Lambert problems checked by re-propagation, and
  adversarial edge cases (near-parabolic orbits, extreme eccentricity, exact
  collisions, degenerate coplanar geometry). A break push that finds a failure
  files it as a failing test before any fix is attempted.

## Milestones

Each milestone lists why it exists and the acceptance criteria a test
demonstrates. The criteria for milestones 2 through 8 are recorded as
`test.todo` in `test/roadmap.test.ts` until a build push implements them.

### Milestone 1: vector and linear algebra primitives, time, units, constants

Rationale: every later milestone stands on these. Vectors and rotation matrices
carry all geometry; SI constants are the single source of physical numbers; the
split Julian Date and the seeded generator are the foundation of deterministic,
reproducible time and scenes. Status: implemented and green.

Acceptance criteria:
- Every `Vec3` operation returns a fresh frozen object and a property test over
  10000 cases confirms no input is mutated.
- Every unit converter round-trips to identity within the round-trip tolerance
  under a property test (`kmToM(mToKm(x))`, `degToRad(radToDeg(x))`, and the
  rest).
- The split two-part Julian Date round trip, seconds to JD to seconds, is exact
  to within 1e-6 s over a property sweep of epochs spanning plus or minus 200
  years from J2000.
- Every exported physical constant carries a unit, source, and verified flag in
  its documentation, and no constant reconstructs a gravitational parameter by
  multiplying G by a mass (a test strips comments and greps the module).
- A test confirms the constants module imports nothing.

### Milestone 2: two-body Kepler propagation

Rationale: the two-body problem is the analytic spine of everything. Orbital
elements are six numbers (such as size, shape, and orientation) that name an
orbit; converting between elements and a position-and-velocity state, and
advancing an orbit in time by solving Kepler's equation, are the operations every
transfer and propagation reuse.

Acceptance criteria:
- Classical elements to state to elements round-trips to rtol 1e-12, atol 1e-9 SI
  across a property grid of well-conditioned orbits (eccentricity in 0.01 to 0.9,
  inclination in 5 to 175 degrees).
- State to elements returns the correct discriminated tag and substitute angle
  for dedicated circular, equatorial (inclination 0 and 180 degrees), and
  circular-equatorial fixtures, with no NaN.
- The universal-variable propagator and the per-regime solver agree to 1e-9 on
  the resulting state for the same state and time step, away from the parabolic
  boundary, across elliptic, hyperbolic, and (universal only) parabolic cases.
- Propagating any bound orbit by exactly one period returns the original state to
  1e-8 relative.
- The Stumpff functions C(z) and S(z) agree between closed form and Taylor series
  to 1e-12 across the cutover near |z| = 1e-4.
- State to elements reproduces the Curtis Example 4.3 output to the textbook
  printed precision after recomputing full-precision oracle values.

### Milestone 3: orbit classification and properties

Rationale: once an orbit is known, its derived properties (the shape, the high
and low points, the energy) are what a planner reasons about. These are cheap
closed-form quantities that must agree with a propagated orbit.

Acceptance criteria:
- The period equals 2 pi times the square root of (semi-major axis cubed over the
  gravitational parameter) for bound orbits and is Infinity for parabolic and
  hyperbolic orbits, checked against the analytic identity.
- Apoapsis (the far point) equals a(1 + e) and periapsis (the near point) equals
  a(1 - e), matching the propagated maximum and minimum radius over one orbit to
  1e-9 relative.
- The specific orbital energy from the vis-viva relation, v squared over 2 minus
  the gravitational parameter over r, equals minus the gravitational parameter
  over twice the semi-major axis at every point of a propagated orbit to 1e-10
  relative.
- A circular state classifies as circular and a parabolic state classifies as
  parabolic, exercising the conic boundary.

### Milestone 4: N-body integration

Rationale: more than two bodies has no closed-form solution, so it is integrated
numerically. A symplectic integrator preserves the geometric structure of the
equations of motion, which keeps energy error bounded instead of drifting; a
non-symplectic method like RK4 is accurate over short spans but drifts over long
ones. Several methods are provided so they cross-check each other and the analytic
case.

Acceptance criteria:
- All four integrators run on one shared two-body scene and each matches the
  analytic Kepler solution at matched times within its stated tolerance (leapfrog
  to 1e-4, RK4 to 1e-6 over 1 to 10 orbits at step size period/1000).
- Over a 1000-orbit fixed-step run, leapfrog and PEFRL show bounded, non-growing
  relative energy error (the maximum over the second half does not exceed the
  maximum over the first half beyond noise) while RK4 shows secular growth.
- Total linear momentum drift stays at machine-noise level for all integrators on
  an isolated system, and tracks exactly zero on an equal-mass binary.
- Every integrator coefficient set passes a startup sum assertion (PEFRL drift and
  kick coefficients sum to 1.0 exactly; the Forest-Ruth set is within 1 unit in
  the last place of 1.0).
- `recordTrajectory` then `replayTrajectory` produces byte-identical buffers at
  every snapshot for a fixed scene, seed, integrator, step size, and step count
  on the pinned engine.
- A zero-step run returns the initial buffer byte-identical, and a per-step
  finiteness gate throws on a coincident-body scene rather than producing NaN.
- A test fails if the accepted step sequence on the replay path is not constant.

### Milestone 5: Lambert solver

Rationale: Lambert's problem connects two positions with a chosen flight time,
which is the heart of transfer design and the porkchop scan. Two independent
solvers must agree, and every solution must re-propagate back to its endpoints.

Acceptance criteria:
- Propagating the solved departure velocity from the first position over the given
  flight time recovers the second position to rtol 1e-9 across a property grid of
  geometries and flight times, with no NaN or Infinity.
- The Bate-Mueller-White and Izzo single-revolution solutions agree to relative
  1e-9 on both velocity vectors across the fuzzed grid.
- The solver reproduces the Curtis Example 5.2 velocity vectors to relative 1e-3
  (resulting semi-major axis 20000 km, eccentricity 0.4335).
- Collinear positions (transfer angle 0 or 180 degrees, where the plane is
  undefined) are detected and rejected, not silently solved.
- A multi-revolution request beyond the achievable number of revolutions returns
  an empty branch list, and each returned branch re-propagates to the endpoints
  to rtol 1e-9.
- Prograde versus retrograde is selected by the sign of the z component of the
  cross product of the two positions and is overridable by an explicit flag.

### Milestone 6: maneuver planning

Rationale: a maneuver is a change in velocity (delta-v) that moves a spacecraft
from one orbit to another. The standard transfers and the delta-v budget are what
a mission planner adds up.

Acceptance criteria:
- The Hohmann transfer delta-v between two circular orbits matches the closed-form
  two-burn sum to 1e-10 relative and returns a two-element burn list whose total
  equals the sum.
- The bi-elliptic versus Hohmann recommendation flips at radius ratio 11.94 and
  15.58 (the computed crossover matches to two decimal places at the
  infinite-intermediate-apoapsis limit).
- A pure plane change returns delta-v = 2 v sin(i/2) and a combined burn returns
  the square root of (v1 squared plus v2 squared minus 2 v1 v2 cos i), with the
  combined value strictly less than two separate burns for inclination changes
  between 0 and 180 degrees.
- Every maneuver returns an auditable named-burn list and the total is the exact
  sum of the burn magnitudes.
- A plane change of zero returns delta-v of zero with no negative square-root
  argument near cos(i) = 1.

### Milestone 7: patched-conic interplanetary transfer and porkchop

Rationale: an interplanetary transfer is approximated by patching together
two-body arcs: a heliocentric (Sun-centered) Lambert arc between planets, joined
to departure and arrival hyperbolas inside each planet's sphere of influence (the
region where that planet's gravity dominates). A porkchop plot scans departure and
arrival dates to find cheap launch windows.

Acceptance criteria:
- The sphere-of-influence radius equals the planet semi-major axis times (planet
  mass over Sun mass) to the two-fifths power, to 1e-10 relative for a known
  planet.
- Using the hardcoded Curtis Example 8.8 planet state vectors, the heliocentric
  Lambert arc yields departure and arrival hyperbolic excess speeds matching
  3.1651 and 2.8851 km/s to relative 1e-3.
- The departure delta-v from a 180 km low Earth parking orbit matches Curtis
  Example 8.9 (3.674 km/s) to relative 1e-3.
- The porkchop scan returns bit-identical characteristic-energy and arrival
  excess-speed arrays across repeated runs for the same ephemeris and grids.
- Grid cells where arrival precedes departure (non-positive flight time) are
  masked and never passed to the Lambert solver, confirmed by an injected
  inverted date pair.

### Milestone 8: circular restricted three-body problem, Jacobi constant, Lagrange points

Rationale: the circular restricted three-body problem describes a massless body
moving under two large bodies on circular orbits. It has one conserved quantity,
the Jacobi constant, and five equilibrium (Lagrange) points. These have known
positions for known mass ratios and are a sharp test of the rotating-frame
machinery.

Acceptance criteria:
- L4 and L5 are returned at exactly (1/2 minus mu, plus or minus the square root
  of 3 over 2) to 1e-14 relative for representative mass parameters (Earth-Moon
  and Sun-Earth), where mu is the smaller body's mass fraction.
- The collinear points L1, L2, L3 converge with an equilibrium residual
  |dOmega/dx| at or below 1e-12, and the Earth-Moon L1 and L2 reproduce roughly
  326,381 km and 448,915 km from Earth, using the nondimensional distance solved
  from the quintic.
- The Jacobi constant uses the documented convention C = 2 Omega minus v squared
  and, propagated with leapfrog in the rotating-frame equations of motion, drifts
  with bounded, non-secular oscillation under the calibrated bound.
- A mass parameter of 0.5 (equal masses) still converges for the collinear points
  and returns symmetric positions; a mass parameter of 0 is handled or rejected
  explicitly.
- Evaluating the effective potential or the Jacobi constant exactly on a primary
  guards the singularity and never returns silent NaN.
- The Sun-Earth mass parameter choice (Earth alone versus the Earth-Moon
  barycenter) is documented and recomputed from the chosen gravitational
  parameters, not transcribed, before any Lagrange-point oracle is asserted.

## Reference values

These are published numbers used as test oracles. A verified flag of false means
the number still needs confirmation in code before a test asserts against it. The
core standardizes on JPL DE440 gravitational parameters for production and uses a
textbook's own values when reproducing that textbook's worked example.

| Quantity | Value | Unit | Source | Verified |
| --- | --- | --- | --- | --- |
| G | 6.67430e-11 | m^3 kg^-1 s^-2 | CODATA 2018 | yes |
| Astronomical unit | 149597870700 | m (exact) | IAU 2012 B2 | yes |
| Day | 86400 | s (exact) | SI | yes |
| J2000.0 epoch | 2451545.0 | JD (TT) | IAU | yes |
| GM Sun | 1.32712440041279419e20 | m^3 s^-2 | JPL DE440 | yes |
| GM Earth | 3.98600435507e14 | m^3 s^-2 | JPL DE440 (399) | yes |
| GM Moon | 4.902800118e12 | m^3 s^-2 | JPL DE440 (301) | yes |
| GM Mars system | 4.2828375816e13 | m^3 s^-2 | JPL DE440 (4) | no |
| Earth/Moon mass ratio | 81.300568221497215 | dimensionless | JPL DE440 EMRAT | yes |
| Lambert oracle | Curtis Example 5.2 | km, s, km/s | Curtis, Orbital Mechanics | yes |
| Earth-Mars excess speeds | 3.1651 and 2.8851 | km/s | Curtis Example 8.8 | yes |
| Earth-Mars departure delta-v | 3.674 | km/s | Curtis Example 8.9 | yes |
| Bi-elliptic crossover | 11.94 and 15.58 | dimensionless | Curtis, Vallado | yes |
| PEFRL coefficients | xi 0.1786178958448091, lambda -0.2123418310626054, chi -0.6626458266981849 | dimensionless | Omelyan-Mryglod-Folk 2002 | yes |
| Forest-Ruth coefficients | w1 1.3512071919596578, w0 -1.7024143839193153 | dimensionless | Forest and Ruth 1990 | yes |

## Open questions

These are resolved during the milestone that needs them, recorded so they are not
forgotten.

- Sun-Earth mass parameter: is the second primary Earth alone (mu near 3.0035e-6)
  or the Earth-Moon barycenter (mu near 3.0404e-6)? Pick one, document it, and
  recompute mu from the chosen gravitational parameters before any Sun-Earth
  Lagrange-point oracle is asserted.
- GM Sun digit set: IAU 2009 (1.32712440018e20) versus DE440
  (1.32712440041279419e20). The core uses DE440 consistently.
- GM Mars and Mars radius: the Curtis examples use 42830 km^3 s^-2 and 3380 km,
  while DE440 and IAU give about 42828.37 and 3389.5. Use the Curtis values to
  reproduce the Curtis examples; use DE440 for production constants; keep the two
  clearly separated.
- Cross-platform replay scope: confirm on the target Node and V8 versions whether
  the basic-arithmetic simulation path is bit-identical across the CI operating
  systems, and whether V8 ever fuses a multiply-add in the force kernel. Pin the
  guarantee to the verified engine set.
- Softening versus rejection for coincident bodies: decide whether the core
  requires a softening length greater than zero in the squared separation or
  rejects coincident bodies at scene validation. The choice affects the energy
  expression and is captured in the scene config for replay.
- Compensated-summation default: confirm it is off by default (the simplest
  exact-bits path) and enabled only per recorded scene, since enabling it changes
  the replay bytes.
