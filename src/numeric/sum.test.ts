import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { compensatedSum } from './sum'

describe('compensated summation', () => {
  it('recovers precision a naive sum loses to cancellation', () => {
    // The large terms cancel exactly, leaving 1 + 1 = 2. A naive left-to-right
    // sum rounds the small terms away and returns 0.
    const terms = [1, 1e100, 1, -1e100]
    const naive = terms.reduce((acc, x) => acc + x, 0)
    expect(naive).toBe(0)
    expect(compensatedSum(terms)).toBe(2)
  })

  it('sums a benign sequence correctly', () => {
    const tenths = Array.from({ length: 10 }, () => 0.1)
    expect(Math.abs(compensatedSum(tenths) - 1)).toBeLessThanOrEqual(1e-15)
  })

  it('stays within a tight bound of the naive sum on well-scaled data', () => {
    const arb = fc.array(
      fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
      { minLength: 0, maxLength: 500 },
    )
    fc.assert(fc.property(arb, (xs) => {
      const naive = xs.reduce((acc, x) => acc + x, 0)
      const compensated = compensatedSum(xs)
      const scale = xs.reduce((acc, x) => acc + Math.abs(x), 0)
      // The compensated sum is at least as accurate as the naive one; on
      // well-scaled data they agree to a small multiple of the magnitude scale.
      expect(Math.abs(compensated - naive)).toBeLessThanOrEqual(1e-9 * (1 + scale))
    }))
  })

  it('returns zero for an empty input', () => {
    expect(compensatedSum([])).toBe(0)
  })
})
