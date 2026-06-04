import { describe, it, expect } from 'vitest'
import {
  lagrangePoints, effectivePotential, effectivePotentialGradient, jacobiConstant,
  propagateRotating, earthMoonMassParameter, sunEarthMassParameter,
} from './index'
import { type Vec3, vec3, add, sub, norm } from '../core/vec3'
import { closeTo } from '../../test/harness/closeTo'

const muEM = earthMoonMassParameter()
const muSE = sunEarthMassParameter()

/** Distance from a point to both primaries (at -mu and 1-mu). */
function primaryDistances(p: Vec3, mu: number): [number, number] {
  return [norm(sub(p, vec3(-mu, 0, 0))), norm(sub(p, vec3(1 - mu, 0, 0)))]
}

describe('equilateral points L4 and L5', () => {
  for (const [label, mu] of [['Earth-Moon', muEM], ['Sun-Earth', muSE]] as const) {
    it(`${label}: L4 and L5 are exactly (1/2 - mu, +/- sqrt(3)/2) to 1e-14`, () => {
      const { L4, L5 } = lagrangePoints(mu)
      const xExpected = 0.5 - mu
      const yExpected = Math.sqrt(3) / 2
      expect(closeTo(L4.x, xExpected, { rtol: 1e-14, atol: 1e-14 })).toBe(true)
      expect(closeTo(L4.y, yExpected, { rtol: 1e-14 })).toBe(true)
      expect(closeTo(L5.x, xExpected, { rtol: 1e-14, atol: 1e-14 })).toBe(true)
      expect(closeTo(L5.y, -yExpected, { rtol: 1e-14 })).toBe(true)
      // Equilateral: unit distance to both primaries, and an exact equilibrium.
      const [d1, d2] = primaryDistances(L4, mu)
      expect(closeTo(d1, 1, { rtol: 1e-14 })).toBe(true)
      expect(closeTo(d2, 1, { rtol: 1e-14 })).toBe(true)
      expect(norm(effectivePotentialGradient(L4, mu))).toBeLessThanOrEqual(1e-14)
    })
  }
})

describe('collinear points L1, L2, L3', () => {
  it('Earth-Moon collinear points converge with |dOmega/dx| <= 1e-12', () => {
    const { L1, L2, L3 } = lagrangePoints(muEM)
    for (const p of [L1, L2, L3]) {
      const g = effectivePotentialGradient(p, muEM)
      expect(Math.abs(g.x)).toBeLessThanOrEqual(1e-12)
      expect(Math.abs(g.y)).toBeLessThanOrEqual(1e-12)
    }
  })

  it('Earth-Moon L1 and L2 reproduce ~326,381 km and ~448,915 km from Earth', () => {
    const { L1, L2 } = lagrangePoints(muEM)
    const D = 384400 // Earth-Moon mean distance (km)
    const l1FromEarth = (L1.x + muEM) * D // Earth is at -mu
    const l2FromEarth = (L2.x + muEM) * D
    expect(closeTo(l1FromEarth, 326381, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(l2FromEarth, 448915, { rtol: 1e-3 })).toBe(true)
  })

  it('Sun-Earth collinear points also converge to a small residual', () => {
    const { L1, L2, L3 } = lagrangePoints(muSE)
    for (const p of [L1, L2, L3]) {
      expect(Math.abs(effectivePotentialGradient(p, muSE).x)).toBeLessThanOrEqual(1e-12)
    }
  })
})

describe('Jacobi constant under leapfrog in the rotating frame', () => {
  it('uses C = 2 Omega - v^2 and drifts with bounded, non-secular oscillation', () => {
    const { L4 } = lagrangePoints(muEM)
    // L4 is stable for mu < 0.0385, so a small perturbation librates (bounded).
    const start = { pos: add(L4, vec3(1e-3, 0, 0)), vel: vec3(0, 0, 0) }
    const h = 0.001
    const steps = 200000 // 200 nondimensional time units
    const traj = propagateRotating(start, muEM, h, steps, 500)

    // Documented convention: C = 2 Omega - v^2 (v the rotating-frame speed).
    const st0 = traj[0]!
    const v2 = st0.vel.x ** 2 + st0.vel.y ** 2 + st0.vel.z ** 2
    expect(jacobiConstant(st0.pos, st0.vel, muEM)).toBe(2 * effectivePotential(st0.pos, muEM) - v2)

    const c0 = jacobiConstant(st0.pos, st0.vel, muEM)
    const drifts = traj.map((st) => Math.abs(jacobiConstant(st.pos, st.vel, muEM) - c0) / Math.abs(c0))
    const maxDrift = Math.max(...drifts)
    expect(maxDrift).toBeLessThanOrEqual(1e-8)
    // Bounded and non-secular: the second half does not exceed the first.
    const mid = Math.floor(drifts.length / 2)
    const firstMax = Math.max(...drifts.slice(0, mid))
    const secondMax = Math.max(...drifts.slice(mid))
    expect(secondMax).toBeLessThanOrEqual(firstMax * 2)
    // The libration stays bounded (no escape).
    expect(Math.max(...traj.map((st) => norm(st.pos)))).toBeLessThan(2)
  })
})

describe('boundary mass parameters', () => {
  it('mu = 0.5 (equal masses) converges and returns symmetric collinear points', () => {
    const { L1, L2, L3 } = lagrangePoints(0.5)
    expect(Math.abs(L1.x)).toBeLessThanOrEqual(1e-12) // midpoint by symmetry
    expect(closeTo(L3.x, -L2.x, { rtol: 1e-12 })).toBe(true)
    for (const p of [L1, L2, L3]) {
      expect(Math.abs(effectivePotentialGradient(p, 0.5).x)).toBeLessThanOrEqual(1e-12)
    }
  })

  it('mu = 0 is rejected explicitly', () => {
    expect(() => lagrangePoints(0)).toThrow(RangeError)
    expect(() => effectivePotential(vec3(0.5, 0.5, 0), 0)).toThrow(RangeError)
    expect(() => lagrangePoints(1)).toThrow(RangeError)
  })
})

describe('singularity guard on a primary', () => {
  it('the effective potential and Jacobi constant on a primary throw, never returning NaN', () => {
    const primary1 = vec3(-muEM, 0, 0)
    const primary2 = vec3(1 - muEM, 0, 0)
    expect(() => effectivePotential(primary1, muEM)).toThrow(RangeError)
    expect(() => effectivePotential(primary2, muEM)).toThrow(RangeError)
    expect(() => effectivePotentialGradient(primary1, muEM)).toThrow(RangeError)
    expect(() => jacobiConstant(primary2, vec3(0, 0, 0), muEM)).toThrow(RangeError)
  })
})

describe('Sun-Earth mass parameter choice', () => {
  it('is recomputed from gravitational parameters as the Earth-Moon barycenter value (~3.0404e-6)', () => {
    // Documented choice: second primary is the Earth-Moon barycenter, not Earth
    // alone (which would give ~3.0035e-6). Recomputed, not transcribed.
    expect(closeTo(muSE, 3.0404e-6, { rtol: 1e-3 })).toBe(true)
    expect(muSE).toBeGreaterThan(3.0035e-6) // distinct from the Earth-alone value
  })
})
