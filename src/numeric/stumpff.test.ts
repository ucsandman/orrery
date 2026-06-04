import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { stumpff, stumpffClosed, stumpffSeries, STUMPFF_SERIES_CUTOFF } from './stumpff'
import { closeTo } from '../../test/harness/closeTo'

/**
 * Seam tolerance. Acceptance criterion: the closed form and the Taylor series
 * agree to 1e-12 across the cutover near |z| = 1e-4. The cutover sits at
 * |z| = 1.5e-4 (STUMPFF_SERIES_CUTOFF); a fine sweep measures their worst
 * disagreement over |z| in [1.5e-4, 1] at 6.8e-13, so 1e-12 is met with
 * headroom. Below the cutover the closed form's cancellation makes the series
 * the only trustworthy branch, so the comparison runs at and above it.
 */
const SEAM_TOL = { rtol: 1e-12, atol: 1e-12 }

describe('Stumpff special values', () => {
  it('takes the exact limits C(0) = 1/2 and S(0) = 1/6', () => {
    expect(stumpff(0)).toEqual({ C: 0.5, S: 1 / 6 })
    expect(stumpffClosed(0)).toEqual({ C: 0.5, S: 1 / 6 })
    expect(stumpffSeries(0)).toEqual({ C: 0.5, S: 1 / 6 })
  })
})

describe('Stumpff closed form vs Taylor series across the seam', () => {
  it('agrees to 1e-12 at sampled points at and above the cutover', () => {
    const samples = [
      STUMPFF_SERIES_CUTOFF, 3e-4, 1e-3, 3e-3, 1e-2, 1e-1, 1,
      -STUMPFF_SERIES_CUTOFF, -3e-4, -1e-3, -3e-3, -1e-2, -1e-1, -1,
    ]
    for (const z of samples) {
      const c = stumpffClosed(z)
      const s = stumpffSeries(z)
      expect(closeTo(c.C, s.C, SEAM_TOL), `C(${z})`).toBe(true)
      expect(closeTo(c.S, s.S, SEAM_TOL), `S(${z})`).toBe(true)
    }
  })

  it('production dispatch is seamless: series and closed match at the cutover to 1e-12', () => {
    // Just below the cutover the series is used, just above the closed form; the
    // two must meet to 1e-12 so the switch introduces no discontinuity.
    const cMinus = stumpffSeries(STUMPFF_SERIES_CUTOFF)
    const cPlus = stumpffClosed(STUMPFF_SERIES_CUTOFF)
    expect(closeTo(cMinus.C, cPlus.C, SEAM_TOL)).toBe(true)
    expect(closeTo(cMinus.S, cPlus.S, SEAM_TOL)).toBe(true)
  })

  it('agrees to 1e-12 over a continuous sweep of |z| in [cutover, 1]', () => {
    const mag = fc.double({ min: STUMPFF_SERIES_CUTOFF, max: 1, noNaN: true, noDefaultInfinity: true })
    const sign = fc.constantFrom(1, -1)
    fc.assert(
      fc.property(mag, sign, (m, s) => {
        const z = m * s
        const c = stumpffClosed(z)
        const t = stumpffSeries(z)
        expect(closeTo(c.C, t.C, SEAM_TOL)).toBe(true)
        expect(closeTo(c.S, t.S, SEAM_TOL)).toBe(true)
      }),
      { numRuns: 2000 },
    )
  })
})

describe('Stumpff production dispatch', () => {
  it('uses the series below the cutover and the closed form above it', () => {
    const below = STUMPFF_SERIES_CUTOFF / 2
    const above = STUMPFF_SERIES_CUTOFF * 2
    expect(stumpff(below)).toEqual(stumpffSeries(below))
    expect(stumpff(above)).toEqual(stumpffClosed(above))
  })

  it('stays finite and positive across the conic range of z', () => {
    const z = fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true })
    fc.assert(
      fc.property(z, (zz) => {
        const { C, S } = stumpff(zz)
        expect(Number.isFinite(C) && Number.isFinite(S)).toBe(true)
        // C(z) and S(z) are positive for all real z.
        expect(C).toBeGreaterThan(0)
        expect(S).toBeGreaterThan(0)
      }),
    )
  })
})
