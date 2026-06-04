import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { createRng } from './rng'

describe('seeded deterministic rng', () => {
  it('produces identical sequences for the same seed', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    for (let i = 0; i < 1000; i++) {
      expect(a.next()).toBe(b.next())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    let anyDifferent = false
    for (let i = 0; i < 100; i++) {
      if (a.next() !== b.next()) anyDifferent = true
    }
    expect(anyDifferent).toBe(true)
  })

  it('returns doubles in the half-open interval [0, 1)', () => {
    fc.assert(fc.property(fc.integer(), (seed) => {
      const rng = createRng(seed)
      for (let i = 0; i < 200; i++) {
        const x = rng.next()
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(1)
      }
    }))
  })

  it('accepts a bigint seed and stays deterministic', () => {
    const a = createRng(0xdeadbeefn)
    const b = createRng(0xdeadbeefn)
    expect(a.nextU64()).toBe(b.nextU64())
  })

  it('has an approximately uniform mean over a large sample', () => {
    const rng = createRng(99)
    let sum = 0
    const n = 100000
    for (let i = 0; i < n; i++) sum += rng.next()
    const mean = sum / n
    // A uniform [0,1) sample of this size has a mean near 0.5; 0.01 is a loose,
    // safe band (the standard error is about 1/sqrt(12 n) ~ 9e-4).
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.01)
  })
})
