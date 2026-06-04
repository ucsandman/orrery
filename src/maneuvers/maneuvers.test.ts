import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  hohmann, biElliptic, planeChange, combinedPlaneChange, circularSpeed,
  biEllipticLowerRatio, biEllipticUpperRatio, recommendTransfer,
} from './index'
import { MU_EARTH } from '../core/constants'
import { closeTo } from '../../test/harness/closeTo'

const mu = MU_EARTH

describe('Hohmann transfer', () => {
  it('matches the closed-form two-burn sum to 1e-10 and totals exactly', () => {
    const r1 = 6678e3 // 300 km altitude LEO
    const r2 = 42164e3 // GEO
    const m = hohmann(r1, r2, mu)
    // Independent closed form.
    const vc1 = Math.sqrt(mu / r1)
    const vc2 = Math.sqrt(mu / r2)
    const aT = (r1 + r2) / 2
    const dv1 = Math.sqrt(mu * (2 / r1 - 1 / aT)) - vc1
    const dv2 = vc2 - Math.sqrt(mu * (2 / r2 - 1 / aT))
    expect(closeTo(m.totalDv, dv1 + dv2, { rtol: 1e-10 })).toBe(true)
    expect(m.burns.length).toBe(2)
    expect(m.totalDv).toBe(m.burns[0]!.dv + m.burns[1]!.dv)
    // Sanity: LEO to GEO Hohmann is about 3.9 km/s.
    expect(m.totalDv).toBeGreaterThan(3.8e3)
    expect(m.totalDv).toBeLessThan(4.0e3)
  })
})

describe('bi-elliptic vs Hohmann recommendation', () => {
  it('the lower and upper crossover ratios round to 11.94 and 15.58', () => {
    expect(Math.round(biEllipticLowerRatio() * 100) / 100).toBe(11.94)
    expect(Math.round(biEllipticUpperRatio() * 100) / 100).toBe(15.58)
  })

  it('the recommendation flips at the two crossovers', () => {
    expect(recommendTransfer(11)).toBe('hohmann')
    expect(recommendTransfer(13)).toBe('conditional')
    expect(recommendTransfer(16)).toBe('bielliptic')
    // Just inside each boundary.
    expect(recommendTransfer(11.9)).toBe('hohmann')
    expect(recommendTransfer(15.6)).toBe('bielliptic')
  })

  it('above the upper ratio, a concrete bi-elliptic beats Hohmann', () => {
    const r1 = 7000e3
    const r2 = 20 * r1 // ratio 20, above 15.58
    const rb = 100 * r1
    expect(biElliptic(r1, r2, rb, mu).totalDv).toBeLessThan(hohmann(r1, r2, mu).totalDv)
  })
})

describe('plane change', () => {
  it('a pure plane change costs 2 v sin(i/2)', () => {
    const v = 7.5e3
    for (const incDeg of [10, 30, 60, 90, 150]) {
      const inc = (incDeg * Math.PI) / 180
      expect(closeTo(planeChange(v, inc).totalDv, 2 * v * Math.sin(inc / 2), { rtol: 1e-14 })).toBe(true)
    }
  })

  it('a combined burn is sqrt(v1^2 + v2^2 - 2 v1 v2 cos i) and beats two separate burns', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e3, max: 1e4, noNaN: true }),
        fc.double({ min: 200, max: 5e3, noNaN: true }), // a real speed gap so the two burns are distinct
        fc.double({ min: 0.05, max: Math.PI - 0.05, noNaN: true }),
        (v1, gap, inc) => {
          const v2 = v1 + gap
          const combined = combinedPlaneChange(v1, v2, inc).totalDv
          // Equals the standard law-of-cosines magnitude.
          const reference = Math.sqrt(v1 * v1 + v2 * v2 - 2 * v1 * v2 * Math.cos(inc))
          expect(closeTo(combined, reference, { rtol: 1e-9 })).toBe(true)
          // Strictly cheaper than a separate plane change plus speed change (the
          // two-impulse path is collinear only at i = 0 or pi, excluded here).
          const separate = 2 * v1 * Math.sin(inc / 2) + Math.abs(v2 - v1)
          expect(combined).toBeLessThan(separate)
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('a zero plane change costs zero with no negative square-root argument near cos(i)=1', () => {
    const v = 7.5e3
    expect(planeChange(v, 0).totalDv).toBe(0)
    expect(combinedPlaneChange(v, v, 0).totalDv).toBe(0)
    // Tiny inclination, equal speeds: finite and non-negative (no NaN from a
    // negative argument under the root).
    for (const inc of [1e-12, 1e-9, 1e-6]) {
      const dv = combinedPlaneChange(v, v, inc).totalDv
      expect(Number.isFinite(dv)).toBe(true)
      expect(dv).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('every maneuver is an auditable named-burn list', () => {
  it('each burn is named and totalDv is the exact sum of magnitudes', () => {
    const r1 = 7000e3
    const r2 = 105000e3
    const v = circularSpeed(r1, mu)
    const maneuvers = [
      hohmann(r1, r2, mu),
      biElliptic(r1, r2, 5 * r2, mu),
      planeChange(v, 0.5),
      combinedPlaneChange(v, circularSpeed(r2, mu), 0.3),
    ]
    for (const m of maneuvers) {
      expect(m.burns.length).toBeGreaterThan(0)
      for (const b of m.burns) {
        expect(typeof b.name === 'string' && b.name.length > 0).toBe(true)
        expect(Number.isFinite(b.dv)).toBe(true)
      }
      const sum = m.burns.reduce((s, b) => s + b.dv, 0)
      expect(m.totalDv).toBe(sum)
    }
  })
})
