import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  vec3, ZERO, add, sub, scale, neg, dot, cross, norm, norm2,
  distance, normalize, lerp, isFinite3, equals, type Vec3,
} from './vec3'
import { closeTo } from '../../test/harness/closeTo'

const finite = fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })
const arbVec: fc.Arbitrary<Vec3> = fc.tuple(finite, finite, finite).map(([x, y, z]) => vec3(x, y, z))

describe('vec3 algebra', () => {
  it('adds, subtracts, scales, and negates component-wise', () => {
    const a = vec3(1, 2, 3)
    const b = vec3(4, 5, 6)
    expect(add(a, b)).toEqual(vec3(5, 7, 9))
    expect(sub(b, a)).toEqual(vec3(3, 3, 3))
    expect(scale(a, 2)).toEqual(vec3(2, 4, 6))
    expect(neg(a)).toEqual(vec3(-1, -2, -3))
  })

  it('computes the dot product', () => {
    expect(dot(vec3(1, 2, 3), vec3(4, -5, 6))).toBe(1 * 4 + 2 * -5 + 3 * 6)
  })

  it('computes the right-handed cross product of the basis vectors', () => {
    const ex = vec3(1, 0, 0)
    const ey = vec3(0, 1, 0)
    const ez = vec3(0, 0, 1)
    expect(cross(ex, ey)).toEqual(ez)
    expect(cross(ey, ez)).toEqual(ex)
    expect(cross(ez, ex)).toEqual(ey)
  })

  it('computes norm, norm2, and distance', () => {
    expect(norm(vec3(3, 4, 0))).toBe(5)
    expect(norm2(vec3(3, 4, 0))).toBe(25)
    expect(distance(vec3(1, 0, 0), vec3(4, 4, 0))).toBe(5)
  })
})

describe('vec3 immutability', () => {
  it('freezes every constructed vector', () => {
    expect(Object.isFrozen(vec3(1, 2, 3))).toBe(true)
    expect(Object.isFrozen(ZERO)).toBe(true)
  })

  it('never mutates its inputs and always returns a fresh frozen object', () => {
    fc.assert(
      fc.property(arbVec, arbVec, finite, (a, b, s) => {
        const aBefore = { x: a.x, y: a.y, z: a.z }
        const bBefore = { x: b.x, y: b.y, z: b.z }
        const results = [
          add(a, b), sub(a, b), scale(a, s), neg(a), cross(a, b), lerp(a, b, s),
        ]
        for (const r of results) {
          expect(Object.isFrozen(r)).toBe(true)
        }
        // Inputs are unchanged.
        expect(a).toEqual(aBefore)
        expect(b).toEqual(bBefore)
      }),
      { numRuns: 10000 },
    )
  })
})

describe('vec3 normalize', () => {
  it('returns a unit vector for any non-zero input', () => {
    fc.assert(
      fc.property(arbVec, (v) => {
        fc.pre(norm(v) > 1e-6)
        const u = normalize(v)
        expect(closeTo(norm(u), 1, { rtol: 1e-12, atol: 1e-12 })).toBe(true)
      }),
    )
  })

  it('throws on a zero-length vector instead of returning NaN', () => {
    expect(() => normalize(ZERO)).toThrow(RangeError)
  })

  it('throws on a non-finite vector', () => {
    expect(() => normalize(vec3(Infinity, 0, 0))).toThrow(RangeError)
  })
})

describe('vec3 helpers', () => {
  it('detects non-finite components', () => {
    expect(isFinite3(vec3(1, 2, 3))).toBe(true)
    expect(isFinite3(vec3(NaN, 0, 0))).toBe(false)
    expect(isFinite3(vec3(0, Infinity, 0))).toBe(false)
  })

  it('compares with a mixed tolerance', () => {
    expect(equals(vec3(1, 2, 3), vec3(1 + 1e-13, 2, 3), 1e-9, 1e-12)).toBe(true)
    expect(equals(vec3(1, 2, 3), vec3(1.1, 2, 3), 1e-9, 1e-12)).toBe(false)
  })
})
