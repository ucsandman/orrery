import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { rvToElements, coeToRv } from './elements'
import { type Vec3, vec3, norm, scale } from '../core/vec3'
import { MU_EARTH } from '../core/constants'
import { degToRad, radToDeg } from '../core/units'
import { closeTo, angleCloseTo } from '../../test/harness/closeTo'

// Round-trip acceptance: COE -> RV -> COE to rtol 1e-12, atol 1e-9 SI over a
// grid of well-conditioned orbits (e in [0.01, 0.9], i in [5, 175] degrees).
const RT_TOL = { rtol: 1e-12, atol: 1e-9 }

const wellConditioned = fc.record({
  a: fc.double({ min: 7e6, max: 4.5e8, noNaN: true }), // 7000 km to ~0.45 Gm
  e: fc.double({ min: 0.01, max: 0.9, noNaN: true }),
  i: fc.double({ min: degToRad(5), max: degToRad(175), noNaN: true }),
  raan: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
  argp: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
  nu: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
})

/** Every numeric field of the returned element set must be finite (no NaN). */
function assertNoNaN(el: object): void {
  for (const [key, value] of Object.entries(el)) {
    if (typeof value === 'number') {
      expect(Number.isFinite(value), key).toBe(true)
    }
  }
}

describe('classical elements round trip', () => {
  it('COE -> RV -> COE to rtol 1e-12, atol 1e-9 SI', () => {
    fc.assert(
      fc.property(wellConditioned, (coe) => {
        const { r, v } = coeToRv(coe.a, coe.e, coe.i, coe.raan, coe.argp, coe.nu, MU_EARTH)
        const el = rvToElements(r, v, MU_EARTH)
        expect(el.kind).toBe('classical')
        if (el.kind !== 'classical') return
        expect(closeTo(el.a, coe.a, RT_TOL)).toBe(true)
        expect(closeTo(el.e, coe.e, RT_TOL)).toBe(true)
        expect(angleCloseTo(el.i, coe.i, RT_TOL)).toBe(true)
        expect(angleCloseTo(el.raan, coe.raan, RT_TOL)).toBe(true)
        expect(angleCloseTo(el.argp, coe.argp, RT_TOL)).toBe(true)
        expect(angleCloseTo(el.nu, coe.nu, RT_TOL)).toBe(true)
        assertNoNaN(el)
      }),
      { numRuns: 10000 },
    )
  })
})

describe('degenerate geometry tags and substitute angles', () => {
  const mu = 398600 // km^3/s^2; fixtures are in km, km/s
  const ANG = { atol: 1e-9 }

  it('circular inclined: tag circular, argument of latitude, no NaN', () => {
    const R = 7000
    const { r, v } = coeToRv(R, 0, degToRad(45), degToRad(30), 0, degToRad(40), mu)
    const el = rvToElements(r, v, mu)
    expect(el.kind).toBe('circular')
    if (el.kind !== 'circular') return
    expect(closeTo(el.e, 0, { atol: 1e-12 })).toBe(true)
    expect(angleCloseTo(el.i, degToRad(45), ANG)).toBe(true)
    expect(angleCloseTo(el.raan, degToRad(30), ANG)).toBe(true)
    expect(angleCloseTo(el.argLat, degToRad(40), ANG)).toBe(true)
    assertNoNaN(el)
  })

  // Equatorial fixture built directly at periapsis so the longitude of periapsis
  // is unambiguous: position toward periapsis at longitude phi, true anomaly 0.
  function equatorialAtPeriapsis(a: number, e: number, phiDeg: number, prograde: boolean): { r: Vec3; v: Vec3 } {
    const phi = degToRad(phiDeg)
    const rp = a * (1 - e)
    const vp = Math.sqrt(mu / a) * Math.sqrt((1 + e) / (1 - e))
    const r = scale(vec3(Math.cos(phi), Math.sin(phi), 0), rp)
    const tangential = prograde ? vec3(-Math.sin(phi), Math.cos(phi), 0) : vec3(Math.sin(phi), -Math.cos(phi), 0)
    return { r, v: scale(tangential, vp) }
  }

  it('equatorial prograde (i = 0): tag equatorial, longitude of periapsis, no NaN', () => {
    const { r, v } = equatorialAtPeriapsis(10000, 0.3, 50, true)
    const el = rvToElements(r, v, mu)
    expect(el.kind).toBe('equatorial')
    if (el.kind !== 'equatorial') return
    expect(closeTo(el.e, 0.3, { rtol: 1e-9 })).toBe(true)
    expect(angleCloseTo(el.i, 0, ANG)).toBe(true)
    expect(angleCloseTo(el.lonPeri, degToRad(50), ANG)).toBe(true)
    expect(angleCloseTo(el.nu, 0, ANG)).toBe(true)
    assertNoNaN(el)
  })

  it('equatorial retrograde (i = pi): tag equatorial, inclination pi, no NaN', () => {
    const { r, v } = equatorialAtPeriapsis(10000, 0.3, 50, false)
    const el = rvToElements(r, v, mu)
    expect(el.kind).toBe('equatorial')
    if (el.kind !== 'equatorial') return
    expect(closeTo(el.e, 0.3, { rtol: 1e-9 })).toBe(true)
    expect(angleCloseTo(el.i, Math.PI, ANG)).toBe(true)
    expect(angleCloseTo(el.lonPeri, degToRad(50), ANG)).toBe(true)
    expect(angleCloseTo(el.nu, 0, ANG)).toBe(true)
    assertNoNaN(el)
  })

  it('circular-equatorial (i = 0): tag circular-equatorial, true longitude, no NaN', () => {
    const R = 8000
    const l = degToRad(70)
    const r = scale(vec3(Math.cos(l), Math.sin(l), 0), R)
    const v = scale(vec3(-Math.sin(l), Math.cos(l), 0), Math.sqrt(mu / R))
    const el = rvToElements(r, v, mu)
    expect(el.kind).toBe('circular-equatorial')
    if (el.kind !== 'circular-equatorial') return
    expect(closeTo(el.e, 0, { atol: 1e-12 })).toBe(true)
    expect(angleCloseTo(el.i, 0, ANG)).toBe(true)
    expect(angleCloseTo(el.trueLon, l, ANG)).toBe(true)
    assertNoNaN(el)
  })
})

describe('Curtis Example 4.3 (state to elements)', () => {
  // r, v, mu in Curtis's units (km, km/s, km^3/s^2). Each tolerance reflects the
  // textbook's printed precision: the recomputed full-precision value must round
  // to the printed figure.
  const r = vec3(-6045, -3490, 2500)
  const v = vec3(-3.457, 6.618, 2.533)
  const mu = 398600

  it('reproduces the printed elements to printed precision', () => {
    const el = rvToElements(r, v, mu)
    expect(el.kind).toBe('classical')
    if (el.kind !== 'classical') return
    expect(closeTo(el.h, 58311, { rtol: 5e-5 })).toBe(true) // printed 5 sig figs
    expect(closeTo(el.a, 8788, { rtol: 5e-4 })).toBe(true) // printed 4 sig figs
    expect(closeTo(el.e, 0.1712, { atol: 5e-5 })).toBe(true)
    expect(closeTo(radToDeg(el.i), 153.2, { atol: 0.05 })).toBe(true)
    expect(closeTo(radToDeg(el.raan), 255.3, { atol: 0.05 })).toBe(true)
    expect(closeTo(radToDeg(el.argp), 20.07, { atol: 0.005 })).toBe(true)
    expect(closeTo(radToDeg(el.nu), 28.45, { atol: 0.005 })).toBe(true)
  })
})
