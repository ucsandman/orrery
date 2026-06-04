import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { propagateUniversal, propagateRegime } from './kepler'
import { coeToRv } from './elements'
import { MU_EARTH, TWO_PI } from '../core/constants'
import { type Vec3, vec3, sub, dot, norm } from '../core/vec3'
import { degToRad } from '../core/units'

// Acceptance: the universal-variable propagator and the per-regime solver agree
// to 1e-9 on the resulting state away from the parabolic boundary.
const AGREE_TOL = 1e-9
// Acceptance: one full period returns the original state to 1e-8 relative.
const PERIOD_TOL = 1e-8

const relErr = (a: Vec3, b: Vec3): number => norm(sub(a, b)) / norm(b)

describe('universal vs per-regime agreement (elliptic)', () => {
  const ellipse = fc.record({
    a: fc.double({ min: 7e6, max: 4.5e8, noNaN: true }),
    e: fc.double({ min: 0.01, max: 0.9, noNaN: true }),
    i: fc.double({ min: degToRad(5), max: degToRad(175), noNaN: true }),
    raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    nu: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    frac: fc.double({ min: 0.05, max: 0.95, noNaN: true }),
  })

  it('agrees to 1e-9 on state over a grid of elliptic orbits and times', () => {
    fc.assert(
      fc.property(ellipse, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, MU_EARTH)
        const period = TWO_PI * Math.sqrt(o.a ** 3 / MU_EARTH)
        const dt = o.frac * period
        const u = propagateUniversal(r, v, dt, MU_EARTH)
        const g = propagateRegime(r, v, dt, MU_EARTH)
        expect(relErr(u.r, g.r)).toBeLessThanOrEqual(AGREE_TOL)
        expect(relErr(u.v, g.v)).toBeLessThanOrEqual(AGREE_TOL)
        expect(Number.isFinite(norm(u.r)) && Number.isFinite(norm(u.v))).toBe(true)
      }),
      { numRuns: 4000 },
    )
  })
})

describe('universal vs per-regime agreement (hyperbolic)', () => {
  const hyperbola = fc.record({
    a: fc.double({ min: -4.5e8, max: -7e6, noNaN: true }),
    e: fc.double({ min: 1.1, max: 3.0, noNaN: true }),
    i: fc.double({ min: degToRad(5), max: degToRad(175), noNaN: true }),
    raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    nu: fc.double({ min: -1, max: 1, noNaN: true }), // well inside the asymptote
    g: fc.double({ min: -1, max: 1, noNaN: true }), // mean-anomaly change in [-1, 1]
  })

  it('agrees to 1e-9 on state over a grid of hyperbolic orbits and times', () => {
    fc.assert(
      fc.property(hyperbola, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, MU_EARTH)
        const tChar = Math.sqrt((-o.a) ** 3 / MU_EARTH)
        const dt = o.g * tChar
        const u = propagateUniversal(r, v, dt, MU_EARTH)
        const gReg = propagateRegime(r, v, dt, MU_EARTH)
        expect(relErr(u.r, gReg.r)).toBeLessThanOrEqual(AGREE_TOL)
        expect(relErr(u.v, gReg.v)).toBeLessThanOrEqual(AGREE_TOL)
      }),
      { numRuns: 4000 },
    )
  })
})

describe('one-period closure', () => {
  it('propagating a bound orbit by exactly one period returns the start to 1e-8', () => {
    const orbit = fc.record({
      a: fc.double({ min: 7e6, max: 4.5e8, noNaN: true }),
      e: fc.double({ min: 0.01, max: 0.9, noNaN: true }),
      i: fc.double({ min: degToRad(5), max: degToRad(175), noNaN: true }),
      raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
      argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
      nu: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    })
    fc.assert(
      fc.property(orbit, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, MU_EARTH)
        const period = TWO_PI * Math.sqrt(o.a ** 3 / MU_EARTH)
        const back = propagateUniversal(r, v, period, MU_EARTH)
        expect(relErr(back.r, r)).toBeLessThanOrEqual(PERIOD_TOL)
        expect(relErr(back.v, v)).toBeLessThanOrEqual(PERIOD_TOL)
      }),
      { numRuns: 2000 },
    )
  })
})

describe('parabolic propagation (universal only)', () => {
  // A parabola has e = 1 and specific energy 0; the per-regime solver excludes
  // it, so only the universal propagator is exercised here.
  const mu = MU_EARTH
  const rp = 8.0e6 // periapsis radius (m)
  const r0 = vec3(rp, 0, 0)
  const v0 = vec3(0, Math.sqrt((2 * mu) / rp), 0) // escape speed, perpendicular

  it('starts on a parabola: specific energy is zero', () => {
    const energy = dot(v0, v0) / 2 - mu / norm(r0)
    expect(Math.abs(energy)).toBeLessThanOrEqual(1e-9 * (mu / rp))
  })

  it('forward then backward propagation recovers the initial state to 1e-9', () => {
    for (const dt of [120, 3600, 36000, 200000]) {
      const fwd = propagateUniversal(r0, v0, dt, mu)
      const back = propagateUniversal(fwd.r, fwd.v, -dt, mu)
      expect(relErr(back.r, r0)).toBeLessThanOrEqual(1e-9)
      expect(relErr(back.v, v0)).toBeLessThanOrEqual(1e-9)
      // Energy stays at parabolic zero throughout.
      const energy = dot(fwd.v, fwd.v) / 2 - mu / norm(fwd.r)
      expect(Math.abs(energy)).toBeLessThanOrEqual(1e-9 * (mu / rp))
    }
  })
})
