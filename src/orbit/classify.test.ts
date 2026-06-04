import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { classify, orbitalPeriod } from './classify'
import { coeToRv } from '../twobody/elements'
import { propagateUniversal } from '../twobody/kepler'
import { MU_EARTH, TWO_PI } from '../core/constants'
import { type Vec3, vec3, dot, norm } from '../core/vec3'
import { degToRad } from '../core/units'
import { closeTo } from '../../test/harness/closeTo'

const mu = MU_EARTH

const boundOrbit = fc.record({
  a: fc.double({ min: 7e6, max: 4.5e8, noNaN: true }),
  e: fc.double({ min: 0.01, max: 0.9, noNaN: true }),
  i: fc.double({ min: degToRad(5), max: degToRad(175), noNaN: true }),
  raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
  argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
  nu: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
})

/** Golden-section search for the extremum of |r(t)| within a time bracket. */
function refineRadius(r0: Vec3, v0: Vec3, lo: number, hi: number, findMax: boolean): number {
  const g = (Math.sqrt(5) - 1) / 2
  const radius = (t: number) => {
    const r = norm(propagateUniversal(r0, v0, t, mu).r)
    return findMax ? -r : r
  }
  let a = lo
  let b = hi
  let c = b - g * (b - a)
  let d = a + g * (b - a)
  let fc_ = radius(c)
  let fd = radius(d)
  // 80 golden steps shrink the bracket by 0.618^80 (~1e-17); the radius at a
  // flat extremum then matches the true value to well under 1e-9.
  for (let k = 0; k < 80; k++) {
    if (fc_ < fd) {
      b = d
      d = c
      fd = fc_
      c = b - g * (b - a)
      fc_ = radius(c)
    } else {
      a = c
      c = d
      fc_ = fd
      d = a + g * (b - a)
      fd = radius(d)
    }
  }
  return norm(propagateUniversal(r0, v0, (a + b) / 2, mu).r)
}

describe('period', () => {
  it('equals 2 pi sqrt(a^3/mu) for bound orbits and closes the orbit when propagated', () => {
    fc.assert(
      fc.property(boundOrbit, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, mu)
        const props = classify(r, v, mu)
        // The reported period is the analytic identity evaluated at the recovered a.
        expect(closeTo(props.period, orbitalPeriod(props.a, mu), { rtol: 1e-12 })).toBe(true)
        // ...and it is the true dynamical period: one period returns to the start.
        const back = propagateUniversal(r, v, props.period, mu)
        expect(norm(back.r) - norm(r)).toBeLessThan(1e-7 * norm(r))
      }),
      { numRuns: 1500 },
    )
  })

  it('is Infinity for parabolic and hyperbolic orbits', () => {
    // Parabolic: escape speed at periapsis.
    const rp = 9e6
    const par = classify(vec3(rp, 0, 0), vec3(0, Math.sqrt((2 * mu) / rp), 0), mu)
    expect(par.conic).toBe('parabolic')
    expect(par.period).toBe(Infinity)
    expect(par.apoapsis).toBe(Infinity)
    // Hyperbolic: 1.3x escape speed.
    const hyp = classify(vec3(rp, 0, 0), vec3(0, 1.3 * Math.sqrt((2 * mu) / rp), 0), mu)
    expect(hyp.conic).toBe('hyperbolic')
    expect(hyp.period).toBe(Infinity)
    expect(hyp.apoapsis).toBe(Infinity)
  })
})

describe('apoapsis and periapsis match the propagated radius extremes', () => {
  it('refined propagated min/max radius equal a(1-e) and a(1+e) to 1e-9 relative', () => {
    fc.assert(
      fc.property(boundOrbit, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, mu)
        const props = classify(r, v, mu)
        const period = props.period
        // Bracket the extrema with a coarse scan, then refine each.
        const N = 90
        let iMin = 0
        let iMax = 0
        let rMin = Infinity
        let rMax = -Infinity
        for (let k = 0; k <= N; k++) {
          const rad = norm(propagateUniversal(r, v, (k / N) * period, mu).r)
          if (rad < rMin) { rMin = rad; iMin = k }
          if (rad > rMax) { rMax = rad; iMax = k }
        }
        const periR = refineRadius(r, v, ((iMin - 1) / N) * period, ((iMin + 1) / N) * period, false)
        const apoR = refineRadius(r, v, ((iMax - 1) / N) * period, ((iMax + 1) / N) * period, true)
        expect(closeTo(periR, props.periapsis, { rtol: 1e-9 })).toBe(true)
        expect(closeTo(apoR, props.apoapsis, { rtol: 1e-9 })).toBe(true)
        // Closed-form identities a(1-e), a(1+e).
        expect(closeTo(props.periapsis, props.a * (1 - props.e), { rtol: 1e-12 })).toBe(true)
        expect(closeTo(props.apoapsis, props.a * (1 + props.e), { rtol: 1e-12 })).toBe(true)
      }),
      { numRuns: 200 },
    )
  })
})

describe('specific orbital energy is constant at -mu/(2a)', () => {
  it('v^2/2 - mu/r equals -mu/(2a) at every propagated point to 1e-10 relative', () => {
    fc.assert(
      fc.property(boundOrbit, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, mu)
        const props = classify(r, v, mu)
        const expected = -mu / (2 * props.a)
        const period = props.period
        const samples = 50
        for (let k = 0; k <= samples; k++) {
          const s = propagateUniversal(r, v, (k / samples) * period, mu)
          const energy = dot(s.v, s.v) / 2 - mu / norm(s.r)
          expect(closeTo(energy, expected, { rtol: 1e-10 })).toBe(true)
        }
      }),
      { numRuns: 200 },
    )
  })
})

describe('conic boundary classification', () => {
  it('a circular state classifies as circular', () => {
    const R = 7000e3
    const speed = Math.sqrt(mu / R)
    const props = classify(vec3(R, 0, 0), vec3(0, speed, 0), mu)
    expect(props.conic).toBe('circular')
    expect(closeTo(props.periapsis, R, { rtol: 1e-12 })).toBe(true)
    expect(closeTo(props.apoapsis, R, { rtol: 1e-12 })).toBe(true)
  })

  it('a parabolic state classifies as parabolic', () => {
    const R = 7000e3
    const escape = Math.sqrt((2 * mu) / R)
    const props = classify(vec3(R, 0, 0), vec3(0, escape, 0), mu)
    expect(props.conic).toBe('parabolic')
    expect(Math.abs(props.energy)).toBeLessThan(1e-9 * (mu / R))
  })
})
