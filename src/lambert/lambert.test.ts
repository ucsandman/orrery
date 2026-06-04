import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { lambertBMW } from './bmw'
import { lambertIzzo, lambertIzzoSingle } from './izzo'
import { coeToRv } from '../twobody/elements'
import { propagateUniversal } from '../twobody/kepler'
import { rvToElements } from '../twobody/elements'
import { MU_EARTH, TWO_PI } from '../core/constants'
import { type Vec3, vec3, sub, cross, dot, norm } from '../core/vec3'
import { degToRad } from '../core/units'
import { closeTo } from '../../test/harness/closeTo'

const mu = MU_EARTH

const relErr = (a: Vec3, b: Vec3): number => norm(sub(a, b)) / norm(b)

/** Mean anomaly from true anomaly for an ellipse. */
function trueToMean(nu: number, e: number): number {
  const eAnom = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2))
  return eAnom - e * Math.sin(eAnom)
}

interface TransferCase {
  a: number
  e: number
  i: number
  raan: number
  argp: number
  nu1: number
  dnu: number
  tofFactor: number
}

// A well-conditioned transfer: two points of a prograde bound orbit with a
// transfer angle bounded away from 0 and pi, and a flight time scaled around the
// orbit's own arc time so the connecting conic varies.
const transferCase: fc.Arbitrary<TransferCase> = fc.record({
  a: fc.double({ min: 1e7, max: 4e8, noNaN: true }),
  e: fc.double({ min: 0, max: 0.6, noNaN: true }),
  i: fc.double({ min: degToRad(10), max: degToRad(80), noNaN: true }),
  raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
  argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
  nu1: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
  dnu: fc.double({ min: degToRad(30), max: degToRad(150), noNaN: true }),
  // tofFactor <= 1 keeps the flight time at or below the orbit arc time, which is
  // always below one period: the well-posed single-revolution regime. (tof above
  // a period is multi-revolution territory, handled by the Izzo multi-rev path.)
  tofFactor: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
})

function buildTransfer(c: TransferCase) {
  const nu2 = c.nu1 + c.dnu
  const start = coeToRv(c.a, c.e, c.i, c.raan, c.argp, c.nu1, mu)
  const end = coeToRv(c.a, c.e, c.i, c.raan, c.argp, nu2, mu)
  let dM = trueToMean(nu2, c.e) - trueToMean(c.nu1, c.e)
  dM = ((dM % TWO_PI) + TWO_PI) % TWO_PI // prograde arc, in (0, 2pi)
  const n = Math.sqrt(mu / c.a ** 3)
  const tof = (dM / n) * c.tofFactor
  return { r1: start.r, r2: end.r, v1true: start.v, tof }
}

describe('Lambert re-propagation recovers the target endpoint', () => {
  it('BMW and Izzo solutions re-propagate r1 -> r2 to rtol 1e-9 with no NaN', () => {
    fc.assert(
      fc.property(transferCase, (c) => {
        const { r1, r2, tof } = buildTransfer(c)
        const bmw = lambertBMW(r1, r2, tof, mu)
        const izzo = lambertIzzoSingle(r1, r2, tof, mu)
        for (const sol of [bmw, izzo]) {
          expect(Number.isFinite(norm(sol.v1)) && Number.isFinite(norm(sol.v2))).toBe(true)
          const recovered = propagateUniversal(r1, sol.v1, tof, mu).r
          expect(relErr(recovered, r2)).toBeLessThanOrEqual(1e-9)
        }
      }),
      { numRuns: 3000 },
    )
  })

  it('at the orbit arc time, the single-rev solution recovers the source orbit velocity', () => {
    fc.assert(
      fc.property(transferCase, (c) => {
        const { r1, r2, v1true, tof } = buildTransfer({ ...c, tofFactor: 1 })
        const { v1 } = lambertIzzoSingle(r1, r2, tof, mu)
        expect(relErr(v1, v1true)).toBeLessThanOrEqual(1e-8)
      }),
      { numRuns: 1500 },
    )
  })
})

describe('BMW and Izzo agree on the single-revolution solution', () => {
  it('agree to relative 1e-9 on both velocity vectors over the grid', () => {
    fc.assert(
      fc.property(transferCase, (c) => {
        const { r1, r2, tof } = buildTransfer(c)
        const bmw = lambertBMW(r1, r2, tof, mu)
        const izzo = lambertIzzoSingle(r1, r2, tof, mu)
        expect(relErr(bmw.v1, izzo.v1)).toBeLessThanOrEqual(1e-9)
        expect(relErr(bmw.v2, izzo.v2)).toBeLessThanOrEqual(1e-9)
      }),
      { numRuns: 3000 },
    )
  })
})

describe('Curtis Example 5.2', () => {
  const muKm = 398600
  const r1 = vec3(5000, 10000, 2100)
  const r2 = vec3(-14600, 2500, 7000)
  const tof = 3600
  const expV1 = vec3(-5.9925, 1.9254, 3.2456)
  const expV2 = vec3(-3.3125, -4.1966, -0.38529)

  it('BMW reproduces the printed velocities to relative 1e-3, with a = 20000 km, e = 0.4335', () => {
    const { v1, v2 } = lambertBMW(r1, r2, tof, muKm)
    expect(relErr(v1, expV1)).toBeLessThanOrEqual(1e-3)
    expect(relErr(v2, expV2)).toBeLessThanOrEqual(1e-3)
    const el = rvToElements(r1, v1, muKm)
    expect(closeTo(el.a, 20000, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(el.e, 0.4335, { atol: 5e-4 })).toBe(true)
  })

  it('Izzo reproduces the printed velocities to relative 1e-3', () => {
    const { v1, v2 } = lambertIzzoSingle(r1, r2, tof, muKm)
    expect(relErr(v1, expV1)).toBeLessThanOrEqual(1e-3)
    expect(relErr(v2, expV2)).toBeLessThanOrEqual(1e-3)
  })
})

describe('collinear positions are rejected', () => {
  const r1 = vec3(7000, 0, 0)
  it('rejects transfer angle 0 (parallel positions)', () => {
    expect(() => lambertBMW(r1, vec3(14000, 0, 0), 3000, mu)).toThrow(RangeError)
    expect(() => lambertIzzoSingle(r1, vec3(14000, 0, 0), 3000, mu)).toThrow(RangeError)
  })
  it('rejects transfer angle 180 degrees (anti-parallel positions)', () => {
    expect(() => lambertBMW(r1, vec3(-9000, 0, 0), 3000, mu)).toThrow(RangeError)
    expect(() => lambertIzzoSingle(r1, vec3(-9000, 0, 0), 3000, mu)).toThrow(RangeError)
  })
})

describe('multi-revolution branches', () => {
  // A long flight time over a fixed geometry admits several revolution counts.
  // SI units: positions in metres, mu in m^3/s^2.
  const r1 = vec3(7.0e6, 0, 0)
  const r2 = vec3(0, 9.0e6, 1.2e6)

  it('returns no branch beyond the achievable revolution count, and every branch re-propagates', () => {
    const tof = 50000
    const s = (norm(r1) + norm(r2) + norm(sub(r2, r1))) / 2
    const Tnd = Math.sqrt((2 * mu) / s ** 3) * tof
    const nMax = Math.floor(Tnd / Math.PI)
    const branches = lambertIzzo(r1, r2, tof, mu, { maxRevs: nMax + 3 })
    // No branch exceeds the achievable revolution count.
    expect(Math.max(...branches.map((b) => b.revs))).toBeLessThanOrEqual(nMax)
    // The single-rev solution is always present.
    expect(branches.some((b) => b.revs === 0)).toBe(true)
    // Every returned branch re-propagates to the endpoint.
    for (const b of branches) {
      expect(relErr(propagateUniversal(r1, b.v1, tof, mu).r, r2), `revs ${b.revs}`).toBeLessThanOrEqual(1e-8)
    }
  })

  it('a revolution count the flight time cannot support yields an empty branch list', () => {
    // Short flight time: no full revolution is possible, so revs >= 1 is empty.
    const tof = 1500
    const branches = lambertIzzo(r1, r2, tof, mu, { maxRevs: 4 })
    expect(branches.filter((b) => b.revs >= 1).length).toBe(0)
    expect(branches.length).toBe(1) // single-rev only
  })
})

describe('prograde versus retrograde selection', () => {
  // Geometry with (r1 x r2).z > 0. SI units: positions in metres.
  const r1 = vec3(8.0e6, 0, 0)
  const r2 = vec3(0, 8.0e6, 0)
  const tof = 3000

  it('defaults by the sign of (r1 x r2).z and flips with the retrograde flag', () => {
    expect(cross(r1, r2).z).toBeGreaterThan(0)
    const pro = lambertBMW(r1, r2, tof, mu)
    const retro = lambertBMW(r1, r2, tof, mu, { retrograde: true })
    // Angular momentum z component: prograde positive, retrograde negative.
    expect(cross(r1, pro.v1).z).toBeGreaterThan(0)
    expect(cross(r1, retro.v1).z).toBeLessThan(0)
    // The two solutions are genuinely different.
    expect(norm(sub(pro.v1, retro.v1))).toBeGreaterThan(0)
    // Both re-propagate to r2.
    expect(relErr(propagateUniversal(r1, pro.v1, tof, mu).r, r2)).toBeLessThanOrEqual(1e-9)
    expect(relErr(propagateUniversal(r1, retro.v1, tof, mu).r, r2)).toBeLessThanOrEqual(1e-9)
  })

  it('Izzo follows the same convention as BMW', () => {
    const proB = lambertBMW(r1, r2, tof, mu)
    const proI = lambertIzzoSingle(r1, r2, tof, mu)
    expect(dot(cross(r1, proB.v1), cross(r1, proI.v1))).toBeGreaterThan(0)
  })
})
