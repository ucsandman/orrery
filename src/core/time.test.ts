import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { secondsToSplitJD, splitJDToSeconds, julianDate, simulationTime } from './time'
import { J2000_JD, JULIAN_YEAR_S } from './constants'

// Span the round-trip test over +/- 200 Julian years from J2000.
const TWO_HUNDRED_YEARS_S = 200 * JULIAN_YEAR_S
const epochSeconds = fc.double({
  min: -TWO_HUNDRED_YEARS_S,
  max: TWO_HUNDRED_YEARS_S,
  noNaN: true,
  noDefaultInfinity: true,
})

// Acceptance bound: the split representation must round-trip seconds to under a
// microsecond across centuries (a single float64 JD near 2.45e6 would lose
// roughly 30 microseconds).
const ROUND_TRIP_ATOL_S = 1e-6

describe('split Julian Date', () => {
  it('places J2000 at JD 2451545.0 with a zero fraction', () => {
    const jd = secondsToSplitJD(0)
    expect(jd.jdInteger).toBe(J2000_JD)
    expect(jd.jdFraction).toBe(0)
    expect(julianDate(0)).toBe(J2000_JD)
  })

  it('keeps the fraction in [0, 1)', () => {
    fc.assert(fc.property(epochSeconds, (s) => {
      const jd = secondsToSplitJD(s)
      expect(jd.jdFraction).toBeGreaterThanOrEqual(0)
      expect(jd.jdFraction).toBeLessThan(1)
      expect(Number.isInteger(jd.jdInteger)).toBe(true)
    }))
  })

  it('round-trips seconds -> split JD -> seconds to under a microsecond', () => {
    fc.assert(fc.property(epochSeconds, (s) => {
      const back = splitJDToSeconds(secondsToSplitJD(s))
      expect(Math.abs(back - s)).toBeLessThanOrEqual(ROUND_TRIP_ATOL_S)
    }))
  })

  it('advances one day per 86400 seconds', () => {
    const jd0 = secondsToSplitJD(0)
    const jd1 = secondsToSplitJD(86400)
    expect(jd1.jdInteger - jd0.jdInteger).toBe(1)
    expect(jd1.jdFraction).toBe(0)
  })
})

describe('simulation time', () => {
  it('is an exact multiply, not an accumulated sum', () => {
    const dt = 0.1
    // 0.1 added 10 times drifts; 10 * 0.1 is the exact double 1.0 here.
    expect(simulationTime(10, dt)).toBe(10 * dt)
  })

  it('returns zero at step zero', () => {
    expect(simulationTime(0, 123.456)).toBe(0)
  })
})
