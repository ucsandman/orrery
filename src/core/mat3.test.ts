import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  IDENTITY, rotationX, rotationY, rotationZ, apply, multiply, transpose, type Mat3,
} from './mat3'
import { vec3, norm, sub, type Vec3 } from './vec3'
import { closeTo } from '../../test/harness/closeTo'

function vecClose(a: Vec3, b: Vec3, atol = 1e-12): boolean {
  return closeTo(a.x, b.x, { atol }) && closeTo(a.y, b.y, { atol }) && closeTo(a.z, b.z, { atol })
}

function matClose(a: Mat3, b: Mat3, atol = 1e-12): boolean {
  for (let i = 0; i < 9; i++) {
    if (!closeTo(a[i] as number, b[i] as number, { atol })) return false
  }
  return true
}

const angle = fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true })
const finite = fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true })
const arbVec: fc.Arbitrary<Vec3> = fc.tuple(finite, finite, finite).map(([x, y, z]) => vec3(x, y, z))

describe('mat3 rotations', () => {
  it('rotates the x axis to the y axis under a quarter turn about z', () => {
    const r = rotationZ(Math.PI / 2)
    expect(vecClose(apply(r, vec3(1, 0, 0)), vec3(0, 1, 0))).toBe(true)
  })

  it('leaves the rotation axis fixed', () => {
    expect(vecClose(apply(rotationX(0.7), vec3(1, 0, 0)), vec3(1, 0, 0))).toBe(true)
    expect(vecClose(apply(rotationY(0.7), vec3(0, 1, 0)), vec3(0, 1, 0))).toBe(true)
    expect(vecClose(apply(rotationZ(0.7), vec3(0, 0, 1)), vec3(0, 0, 1))).toBe(true)
  })

  it('preserves vector length (rotations are isometries)', () => {
    fc.assert(
      fc.property(angle, arbVec, (a, v) => {
        const before = norm(v)
        for (const r of [rotationX(a), rotationY(a), rotationZ(a)]) {
          expect(closeTo(norm(apply(r, v)), before, { rtol: 1e-12, atol: 1e-9 })).toBe(true)
        }
      }),
    )
  })

  it('has an orthogonal matrix: m times m-transpose is the identity', () => {
    fc.assert(
      fc.property(angle, (a) => {
        for (const r of [rotationX(a), rotationY(a), rotationZ(a)]) {
          expect(matClose(multiply(r, transpose(r)), IDENTITY, 1e-12)).toBe(true)
        }
      }),
    )
  })
})

describe('mat3 algebra', () => {
  it('multiplies by the identity without change', () => {
    const r = rotationZ(1.1)
    expect(matClose(multiply(r, IDENTITY), r)).toBe(true)
    expect(matClose(multiply(IDENTITY, r), r)).toBe(true)
  })

  it('composes rotations about the same axis additively', () => {
    const a = 0.4
    const b = 0.9
    const composed = multiply(rotationZ(a), rotationZ(b))
    const single = rotationZ(a + b)
    expect(matClose(composed, single, 1e-12)).toBe(true)
  })

  it('apply and multiply agree: (a b) v equals a (b v)', () => {
    fc.assert(
      fc.property(angle, angle, arbVec, (p, q, v) => {
        const a = rotationX(p)
        const b = rotationY(q)
        const lhs = apply(multiply(a, b), v)
        const rhs = apply(a, apply(b, v))
        expect(norm(sub(lhs, rhs)) <= 1e-9 * (1 + norm(v))).toBe(true)
      }),
    )
  })
})
