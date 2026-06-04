import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  kmToM, mToKm, degToRad, radToDeg, dayToS, sToDay,
  auToM, mToAu, kmsToMs, msToKms,
} from './units'
import { closeTo } from '../../test/harness/closeTo'

const finite = fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true })

// Round-trip tolerance: a pair of multiply/divide conversions loses a few ULP
// of double precision at most, so 1e-12 relative is a safe, calibrated bound.
const RTOL = 1e-12

describe('unit conversions round-trip to identity', () => {
  it('kilometres and metres', () => {
    fc.assert(fc.property(finite, (x) => {
      expect(closeTo(kmToM(mToKm(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
      expect(closeTo(mToKm(kmToM(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
    }))
  })

  it('degrees and radians', () => {
    fc.assert(fc.property(finite, (x) => {
      expect(closeTo(degToRad(radToDeg(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
      expect(closeTo(radToDeg(degToRad(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
    }))
  })

  it('days and seconds', () => {
    fc.assert(fc.property(finite, (x) => {
      expect(closeTo(dayToS(sToDay(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
      expect(closeTo(sToDay(dayToS(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
    }))
  })

  it('astronomical units and metres', () => {
    fc.assert(fc.property(finite, (x) => {
      expect(closeTo(auToM(mToAu(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
      expect(closeTo(mToAu(auToM(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
    }))
  })

  it('kilometres per second and metres per second', () => {
    fc.assert(fc.property(finite, (x) => {
      expect(closeTo(kmsToMs(msToKms(x)), x, { rtol: RTOL, atol: 1e-9 })).toBe(true)
    }))
  })
})

describe('unit conversions have the expected fixed points', () => {
  it('converts known anchors exactly enough', () => {
    expect(kmToM(1)).toBe(1000)
    expect(dayToS(1)).toBe(86400)
    expect(closeTo(degToRad(180), Math.PI, { rtol: 1e-15 })).toBe(true)
    expect(auToM(1)).toBe(149597870700)
  })
})
