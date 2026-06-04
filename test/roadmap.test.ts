import { describe, it, expect } from 'vitest'
import * as orrery from '../src/index'

/**
 * Milestone roadmap.
 *
 * Every acceptance criterion from SPEC.md is now demonstrated by a real test in
 * the module that owns it (no remaining test.todo). This file verifies that the
 * full public surface for all eight milestones is exported from the barrel, and
 * points to where each milestone's detailed criteria are checked:
 *
 * - M1 primitives:      src/core/*.test.ts, src/numeric/sum.test.ts
 * - M2 two-body Kepler:  src/numeric/{stumpff,rootfind}.test.ts, src/twobody/*.test.ts
 * - M3 classification:   src/orbit/classify.test.ts
 * - M4 N-body:           src/integrators/integrators.test.ts
 * - M5 Lambert:          src/lambert/lambert.test.ts
 * - M6 maneuvers:        src/maneuvers/maneuvers.test.ts
 * - M7 patched conic:    src/transfer/transfer.test.ts
 * - M8 CR3BP:            src/cr3bp/cr3bp.test.ts
 */

const expectFunctions = (names: string[]): void => {
  for (const name of names) {
    expect(typeof (orrery as Record<string, unknown>)[name], name).toBe('function')
  }
}

describe('milestone roadmap: the public surface of every milestone is exported', () => {
  it('M1: vectors, matrices, units, time, rng, summation', () => {
    expectFunctions(['vec3', 'cross', 'rotationZ', 'kmToM', 'secondsToSplitJD', 'createRng', 'compensatedSum'])
    expect(typeof orrery.MU_SUN).toBe('number')
    expect(typeof orrery.G).toBe('number')
  })

  it('M2: Stumpff, root finders, elements, Kepler propagators', () => {
    expectFunctions(['stumpff', 'newton', 'danby', 'householder', 'rvToElements', 'coeToRv', 'propagateUniversal', 'propagateRegime'])
  })

  it('M3: orbit classification', () => {
    expectFunctions(['classify', 'orbitalPeriod'])
  })

  it('M4: state buffer, force kernel, integrators, record/replay', () => {
    expectFunctions(['fromBodies', 'toBodies', 'accelerations', 'leapfrog', 'pefrl', 'forestRuth', 'rk4', 'recordTrajectory', 'replayTrajectory'])
  })

  it('M5: Lambert solvers', () => {
    expectFunctions(['lambertBMW', 'lambertIzzo', 'lambertIzzoSingle'])
  })

  it('M6: maneuver planning', () => {
    expectFunctions(['hohmann', 'biElliptic', 'planeChange', 'combinedPlaneChange', 'recommendTransfer', 'biEllipticLowerRatio', 'biEllipticUpperRatio'])
  })

  it('M7: patched-conic transfer, ephemeris, porkchop', () => {
    expectFunctions(['sphereOfInfluence', 'transferArc', 'departureDeltaV', 'planetStateAtJD', 'standishEphemeris', 'keplerEphemeris', 'porkchopScan'])
  })

  it('M8: CR3BP, Jacobi constant, Lagrange points', () => {
    expectFunctions(['lagrangePoints', 'jacobiConstant', 'effectivePotential', 'effectivePotentialGradient', 'propagateRotating', 'earthMoonMassParameter', 'sunEarthMassParameter'])
  })
})
