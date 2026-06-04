import { describe, it, expect } from 'vitest'
import { type Body, fromBodies, toBodies, buffersEqual } from './state'
import { leapfrog, pefrl, forestRuth, rk4, integratorByName, assertCoefficientSet, type IntegratorName } from './index'
import { type Scene, recordTrajectory, replayTrajectory, assertConstantSteps } from './run'
import { coeToRv } from '../twobody/elements'
import { propagateUniversal } from '../twobody/kepler'
import { TWO_PI } from '../core/constants'
import { type Vec3, vec3, sub, scale, norm } from '../core/vec3'
import { totalEnergy, totalLinearMomentum, totalAngularMomentum } from '../../test/harness/conserve'

const G = 1

function getMasses(bodies: readonly Body[]): Float64Array {
  return new Float64Array(bodies.map((b) => b.mass))
}

/** Build a barycentric two-body scene whose relative motion is exact Kepler. */
function twoBodyScene(M: number, m: number, a: number, e: number, nu: number) {
  const muRel = G * (M + m)
  const { r: rRel, v: vRel } = coeToRv(a, e, 0.3, 0.5, 0.7, nu, muRel)
  const total = M + m
  const bodies: Body[] = [
    { mass: M, position: scale(rRel, -m / total), velocity: scale(vRel, -m / total) },
    { mass: m, position: scale(rRel, M / total), velocity: scale(vRel, M / total) },
  ]
  const period = TWO_PI * Math.sqrt(a ** 3 / muRel)
  return { scene: { bodies, G } as Scene, rRel, vRel, muRel, period }
}

/** Relative separation r1 - r0 from a packed snapshot of a two-body run. */
function relative(data: Float64Array): Vec3 {
  return vec3(data[6]! - data[0]!, data[7]! - data[1]!, data[8]! - data[2]!)
}

describe('integrators match the analytic two-body solution', () => {
  // Shared two-body scene, h = period/1000. Leapfrog is second order: its
  // position error is dominated by phase drift that grows linearly with the
  // horizon (measured 9.1e-5 at one orbit, 8.8e-4 at ten), so its 1e-4 figure is
  // a one-orbit bound and it stays second-order bounded (below 1e-3) across the
  // full one-to-ten-orbit range. The fourth-order methods (RK4, PEFRL,
  // Forest-Ruth) hold 1e-6 over the full ten orbits.
  const shared = twoBodyScene(1, 1e-3, 1, 0.02, 0)

  function maxError(name: IntegratorName, orbits: number): number {
    const dt = shared.period / 1000
    const traj = recordTrajectory({ scene: shared.scene, integrator: name, dt, steps: 1000 * orbits, snapshotEvery: 100 })
    let mx = 0
    for (const snap of traj.snapshots) {
      const analytic = propagateUniversal(shared.rRel, shared.vRel, snap.time, shared.muRel).r
      mx = Math.max(mx, norm(sub(relative(snap.data), analytic)) / norm(analytic))
    }
    return mx
  }

  it('leapfrog matches analytic Kepler to 1e-4 over one orbit and stays below 1e-3 across ten', () => {
    expect(maxError('leapfrog', 1)).toBeLessThanOrEqual(1e-4)
    expect(maxError('leapfrog', 10)).toBeLessThanOrEqual(1e-3)
  })

  it('RK4 matches analytic Kepler to 1e-6 over ten orbits', () => {
    expect(maxError('rk4', 10)).toBeLessThanOrEqual(1e-6)
  })

  it('PEFRL matches analytic Kepler to 1e-6 over ten orbits', () => {
    expect(maxError('pefrl', 10)).toBeLessThanOrEqual(1e-6)
  })

  it('Forest-Ruth matches analytic Kepler to 1e-6 over ten orbits', () => {
    expect(maxError('forestRuth', 10)).toBeLessThanOrEqual(1e-6)
  })
})

describe('energy error: symplectic bounded, RK4 secular', () => {
  // 1000 orbits at h = period/200, sampled four times per orbit so each half of
  // the run captures the full energy-error envelope. A symplectic method's
  // envelope is bounded and constant (max over the second half does not exceed
  // the first); RK4's grows secularly.
  const { scene, period } = twoBodyScene(1, 1e-3, 1, 0.1, 0)
  const masses = getMasses(scene.bodies)
  const dt = period / 200
  const orbits = 1000

  function energyErrors(name: IntegratorName): number[] {
    const traj = recordTrajectory({ scene, integrator: name, dt, steps: 200 * orbits, snapshotEvery: 50 })
    const e0 = totalEnergy(traj.snapshots[0]!.data, masses, 2, G, 0)
    return traj.snapshots.slice(1).map((s) => Math.abs(totalEnergy(s.data, masses, 2, G, 0) - e0) / Math.abs(e0))
  }

  function half(errs: number[], second: boolean): number {
    const mid = Math.floor(errs.length / 2)
    return Math.max(...(second ? errs.slice(mid) : errs.slice(0, mid)))
  }

  it('leapfrog energy error is bounded and below 1e-3', () => {
    const errs = energyErrors('leapfrog')
    expect(Math.max(...errs)).toBeLessThanOrEqual(1e-3)
    expect(half(errs, true)).toBeLessThanOrEqual(half(errs, false) * 1.2)
  })

  it('PEFRL energy error is bounded and below 1e-6', () => {
    const errs = energyErrors('pefrl')
    expect(Math.max(...errs)).toBeLessThanOrEqual(1e-6)
    expect(half(errs, true)).toBeLessThanOrEqual(half(errs, false) * 1.2)
  })

  it('RK4 energy error grows secularly', () => {
    const errs = energyErrors('rk4')
    expect(half(errs, true)).toBeGreaterThan(half(errs, false) * 1.2)
  })
})

describe('momentum and angular momentum', () => {
  it('linear momentum drift stays at machine-noise level for an isolated three-body system', () => {
    const bodies: Body[] = [
      { mass: 1.0, position: vec3(1, 0, 0), velocity: vec3(0, 0.5, 0.1) },
      { mass: 2.0, position: vec3(-1, 0.5, 0), velocity: vec3(0.2, -0.3, 0) },
      { mass: 0.7, position: vec3(0, -1, 0.3), velocity: vec3(-0.1, 0.1, -0.2) },
    ]
    const scene: Scene = { bodies, G }
    const masses = getMasses(bodies)
    const scale0 = bodies.reduce((s, b) => s + b.mass * norm(b.velocity), 0)
    const p0 = totalLinearMomentum(fromBodies(bodies).data, masses, 3)
    for (const name of ['leapfrog', 'pefrl', 'forestRuth', 'rk4'] as IntegratorName[]) {
      const traj = recordTrajectory({ scene, integrator: name, dt: 0.001, steps: 5000, snapshotEvery: 500 })
      let drift = 0
      for (const s of traj.snapshots) {
        const p = totalLinearMomentum(s.data, masses, 3)
        drift = Math.max(drift, norm(sub(p, p0)) / scale0)
      }
      expect(drift, name).toBeLessThanOrEqual(1e-12)
    }
  })

  it('equal-mass binary momentum tracks exactly zero for every integrator', () => {
    const bodies: Body[] = [
      { mass: 1, position: vec3(-1, 0, 0), velocity: vec3(0, -0.5, 0) },
      { mass: 1, position: vec3(1, 0, 0), velocity: vec3(0, 0.5, 0) },
    ]
    const scene: Scene = { bodies, G }
    const masses = getMasses(bodies)
    for (const name of ['leapfrog', 'pefrl', 'forestRuth', 'rk4'] as IntegratorName[]) {
      const traj = recordTrajectory({ scene, integrator: name, dt: 0.01, steps: 2000, snapshotEvery: 200 })
      for (const s of traj.snapshots) {
        const p = totalLinearMomentum(s.data, masses, 2)
        expect(p.x === 0 && p.y === 0 && p.z === 0, `${name} at step ${s.stepIndex}`).toBe(true)
      }
    }
  })

  it('angular momentum drift is bounded below 1e-9 relative under leapfrog and PEFRL', () => {
    const { scene, period } = twoBodyScene(1, 0.5, 1, 0.3, 0)
    const masses = getMasses(scene.bodies)
    const dt = period / 500
    const l0 = norm(totalAngularMomentum(fromBodies(scene.bodies).data, masses, 2))
    for (const name of ['leapfrog', 'pefrl'] as IntegratorName[]) {
      const traj = recordTrajectory({ scene, integrator: name, dt, steps: 50000, snapshotEvery: 1000 })
      let drift = 0
      for (const s of traj.snapshots) {
        drift = Math.max(drift, Math.abs(norm(totalAngularMomentum(s.data, masses, 2)) - l0) / l0)
      }
      expect(drift, name).toBeLessThanOrEqual(1e-9)
    }
  })
})

describe('integrator coefficient startup assertions', () => {
  it('PEFRL drift and kick coefficients sum to exactly 1.0', () => {
    const sets = pefrl(2).coefficientSets
    for (const set of sets) {
      expect(set.values.reduce((a, b) => a + b, 0)).toBe(1)
    }
  })

  it('Forest-Ruth coefficients sum to within 1 ULP of 1.0', () => {
    const sets = forestRuth(2).coefficientSets
    for (const set of sets) {
      expect(Math.abs(set.values.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(Number.EPSILON)
    }
  })

  it('leapfrog coefficients sum to exactly 1.0 and RK4 weights to within 1 ULP', () => {
    for (const set of leapfrog(2).coefficientSets) {
      expect(set.values.reduce((a, b) => a + b, 0)).toBe(1)
    }
    for (const set of rk4(2).coefficientSets) {
      expect(Math.abs(set.values.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(Number.EPSILON)
    }
  })

  it('a corrupted coefficient set fails the startup assertion', () => {
    expect(() =>
      assertCoefficientSet({ label: 'drift', values: [0.5, 0.6], expectedSum: 1, ulpBudget: 0 }, 'broken'),
    ).toThrow(RangeError)
  })
})

describe('record and replay determinism', () => {
  const { scene, period } = twoBodyScene(1, 0.3, 1, 0.2, 0)

  it('replay reproduces byte-identical snapshot buffers for every integrator', () => {
    for (const name of ['leapfrog', 'pefrl', 'forestRuth', 'rk4'] as IntegratorName[]) {
      const traj = recordTrajectory({ scene, integrator: name, dt: period / 500, steps: 3000, snapshotEvery: 300 })
      expect(replayTrajectory(traj), name).toBe(true)
    }
  })

  it('a zero-step run returns the initial buffer byte-identical', () => {
    const traj = recordTrajectory({ scene, integrator: 'pefrl', dt: period / 500, steps: 0, snapshotEvery: 1 })
    expect(traj.snapshots.length).toBe(1)
    expect(buffersEqual(traj.snapshots[0]!.data, fromBodies(scene.bodies).data)).toBe(true)
  })

  it('the finiteness gate throws on a coincident-body scene rather than producing NaN', () => {
    const coincident: Scene = {
      bodies: [
        { mass: 1, position: vec3(0, 0, 0), velocity: vec3(0, 0, 0) },
        { mass: 1, position: vec3(0, 0, 0), velocity: vec3(0, 0.1, 0) },
      ],
      G,
    }
    expect(() =>
      recordTrajectory({ scene: coincident, integrator: 'leapfrog', dt: 0.01, steps: 1, snapshotEvery: 1 }),
    ).toThrow(RangeError)
  })

  it('the accepted step sequence on the replay path is constant, and a non-constant one is rejected', () => {
    const traj = recordTrajectory({ scene, integrator: 'leapfrog', dt: period / 500, steps: 100, snapshotEvery: 50 })
    expect(traj.stepSizes.length).toBe(100)
    assertConstantSteps(traj.stepSizes) // does not throw: fixed-step
    expect(() => assertConstantSteps([traj.spec.dt, traj.spec.dt, 2 * traj.spec.dt])).toThrow(RangeError)
  })

  it('toBodies round-trips fromBodies', () => {
    const bodies = toBodies(fromBodies(scene.bodies))
    expect(bodies.length).toBe(scene.bodies.length)
    expect(bodies[0]!.mass).toBe(scene.bodies[0]!.mass)
    expect(bodies[1]!.position).toEqual(scene.bodies[1]!.position)
  })
})
