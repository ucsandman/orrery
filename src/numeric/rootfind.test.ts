import { describe, it, expect } from 'vitest'
import { newton, danby, householder } from './rootfind'
import { closeTo } from '../../test/harness/closeTo'

const TIGHT = { rtol: 0, atol: 1e-13 }

describe('root finders converge', () => {
  // f(x) = x^2 - 2, root sqrt(2). f' = 2x, f'' = 2.
  const f = (x: number) => x * x - 2
  const df = (x: number) => 2 * x
  const d2f = (_x: number) => 2
  const root = Math.SQRT2

  it('Newton finds sqrt(2)', () => {
    expect(closeTo(newton(f, df, 1), root, TIGHT)).toBe(true)
  })

  it('Danby finds sqrt(2)', () => {
    expect(closeTo(danby(f, df, d2f, 1), root, TIGHT)).toBe(true)
  })

  it('Householder finds sqrt(2)', () => {
    expect(closeTo(householder(f, df, d2f, 1), root, TIGHT)).toBe(true)
  })

  it('all three solve Kepler E - e sin E = M for a sample case', () => {
    const e = 0.5
    const M = 1.0
    const kf = (E: number) => E - e * Math.sin(E) - M
    const kdf = (E: number) => 1 - e * Math.cos(E)
    const kd2f = (E: number) => e * Math.sin(E)
    const en = newton(kf, kdf, M)
    const ed = danby(kf, kdf, kd2f, M)
    const eh = householder(kf, kdf, kd2f, M)
    // Independently verified: each must satisfy the equation it solved.
    for (const E of [en, ed, eh]) {
      expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12)
    }
    expect(closeTo(en, ed, TIGHT)).toBe(true)
    expect(closeTo(ed, eh, TIGHT)).toBe(true)
  })
})

describe('root finders fail loud', () => {
  it('Newton throws on a zero derivative rather than returning NaN', () => {
    // f(x) = x^2 + 1 has no real root; the derivative is zero at the guess x = 0.
    expect(() => newton((x) => x * x + 1, (x) => 2 * x, 0)).toThrow(RangeError)
  })

  it('Newton throws when it cannot converge within the iteration budget', () => {
    // No real root, nonzero derivative: the iteration wanders and never converges.
    expect(() => newton((x) => x * x + 1, (x) => 2 * x, 1, { maxIter: 20 })).toThrow(RangeError)
  })

  it('Danby throws on a non-finite step', () => {
    expect(() => danby((x) => x * x + 1, (x) => 2 * x, () => 2, 0)).toThrow(RangeError)
  })
})
