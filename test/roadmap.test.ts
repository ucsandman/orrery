import { describe, test } from 'vitest'

/**
 * The milestone roadmap as pending tests.
 *
 * Each `test.todo` is one acceptance criterion from SPEC.md that a future build
 * push must turn into a real, passing test. Todos are reported by vitest but do
 * not fail the suite, so this file is the live checklist of what the engine
 * still owes. Milestone 1 is implemented and tested in the src tree; it is not
 * repeated here.
 */

describe('milestone 2: two-body Kepler propagation', () => {
  test.todo('COE -> RV -> COE round-trips to rtol 1e-12 / atol 1e-9 over a fast-check grid of well-conditioned orbits')
  test.todo('RV -> COE returns the correct discriminated tag and substitute angle for circular, equatorial (i=0 and i=pi), and circular-equatorial fixtures, with no NaN')
  test.todo('universal-variable propagator and per-regime solver agree to 1e-9 on state for the same (state, dt) away from e=1, across elliptic, hyperbolic, parabolic')
  test.todo('propagating a bound orbit by exactly one period returns the original state to 1e-8 relative')
  test.todo('Stumpff C(z) and S(z) agree between closed form and Taylor series to 1e-12 across the |z| ~ 1e-4 seam')
  test.todo('RV -> COE reproduces Curtis Example 4.3 outputs to printed precision after recomputing full-precision oracle values')
})

describe('milestone 3: orbit classification and properties', () => {
  test.todo('period equals 2 pi sqrt(a^3/mu) for bound orbits and is Infinity for parabolic/hyperbolic')
  test.todo('apoapsis a(1+e) and periapsis a(1-e) match propagated max/min radius over one orbit to 1e-9 relative')
  test.todo('specific orbital energy v^2/2 - mu/r equals -mu/(2a) at every point of a propagated orbit to 1e-10 relative')
  test.todo('a circular state classifies as circular and an e=1 state classifies as parabolic')
})

describe('milestone 4: N-body integration', () => {
  test.todo('all four integrators match the analytic Kepler solution within stated tolerance on a shared two-body scene')
  test.todo('over a 1000-orbit run, leapfrog and PEFRL show bounded non-growing energy error while RK4 drifts secularly')
  test.todo('total linear momentum drift stays at machine-noise level for all integrators and tracks zero on an equal-mass binary')
  test.todo('every integrator coefficient set passes the startup sum assertion within its ULP budget')
  test.todo('recordTrajectory then replayTrajectory produces byte-identical ArrayBuffers at every snapshot on the pinned engine')
  test.todo('nSteps = 0 returns the initial buffer byte-identical and a per-step finiteness gate throws on a coincident-body scene')
  test.todo('a test fails if the accepted step sequence on the replay path is not constant')
})

describe('milestone 5: Lambert solver', () => {
  test.todo('propagating solved v1 from r1 over TOF recovers r2 to rtol 1e-9 across a fuzzed grid, with no NaN or Infinity')
  test.todo('BMW and Izzo single-rev solutions agree to relative 1e-9 on both velocity vectors')
  test.todo('reproduces Curtis Example 5.2 velocity vectors to relative 1e-3 (a = 20000 km, e = 0.4335)')
  test.todo('collinear r1, r2 (transfer angle 0 or pi) is detected and rejected, not silently solved')
  test.todo('a multi-rev request beyond the achievable N returns an empty branch list and each returned branch re-propagates to the endpoints')
  test.todo('prograde vs retrograde follows the sign of (r1 x r2).z and is overridable by an explicit flag')
})

describe('milestone 6: maneuver planning', () => {
  test.todo('Hohmann dv matches the closed-form two-burn sum to 1e-10 relative with a two-element burn list whose totalDv equals the sum')
  test.todo('the bi-elliptic vs Hohmann recommendation flips at R = 11.94 and R = 15.58 at the infinite-apoapsis limit')
  test.todo('pure plane change returns 2 v sin(i/2) and the combined burn returns sqrt(v1^2 + v2^2 - 2 v1 v2 cos i), strictly less than separate burns for 0 < i < pi')
  test.todo('every maneuver returns an auditable named-burn list and totalDv is the exact sum of burn magnitudes')
  test.todo('a plane change of i = 0 returns dv = 0 with no negative sqrt argument near cos(i) = 1')
})

describe('milestone 7: patched-conic interplanetary transfer + porkchop', () => {
  test.todo('SOI radius equals a_planet (m_planet/m_sun)^(2/5) to 1e-10 relative')
  test.todo('Curtis Example 8.8 planet states yield departure and arrival excess speeds 3.1651 and 2.8851 km/s to relative 1e-3')
  test.todo('departure dv from a 180 km LEO matches Curtis Example 8.9 (3.674 km/s) to relative 1e-3')
  test.todo('porkchopScan returns bit-identical C3 and arrival v-infinity arrays across repeated runs for the same inputs')
  test.todo('grid cells with TOF <= 0 are masked and never passed to the Lambert solver')
})

describe('milestone 8: CR3BP, Jacobi constant, Lagrange points', () => {
  test.todo('L4 and L5 are returned at exactly (1/2 - mu, +/- sqrt(3)/2) to 1e-14 relative for representative mu')
  test.todo('collinear L1, L2, L3 converge with |dOmega/dx| <= 1e-12 and Earth-Moon L1/L2 reproduce ~326,381 km and ~448,915 km from Earth')
  test.todo('jacobiConstant uses C = 2 Omega - v^2 and drifts with bounded non-secular oscillation under leapfrog in the rotating frame')
  test.todo('mu = 0.5 still converges for collinear points with symmetric positions; mu = 0 is handled or rejected explicitly')
  test.todo('effectivePotential and jacobiConstant on a primary guard the r->0 singularity and never return silent NaN')
  test.todo('the Sun-Earth mu choice (Earth-alone vs Earth-Moon barycenter) is documented and recomputed from the chosen GM constants')
})
