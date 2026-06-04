import { type Vec3, vec3 } from './vec3'

/**
 * Immutable 3x3 matrix stored row-major as a frozen 9-tuple:
 *   [ m00, m01, m02,
 *     m10, m11, m12,
 *     m20, m21, m22 ]
 *
 * Used for the rotation matrices that take orbital elements to state vectors
 * (the perifocal to inertial frame transform is built from `rotationZ` and
 * `rotationX`). A fixed-length tuple indexes without an `undefined` union under
 * strict settings, so the arithmetic below stays clean.
 */
export type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
]

/** The identity matrix. */
export const IDENTITY: Mat3 = Object.freeze([
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
]) as Mat3

/**
 * Active rotation about the x axis by `angle` radians. Applied to a vector it
 * rotates the vector (not the frame) counter-clockwise when looking down the
 * positive x axis toward the origin.
 */
export function rotationX(angle: number): Mat3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return Object.freeze([
    1, 0, 0,
    0, c, -s,
    0, s, c,
  ]) as Mat3
}

/** Active rotation about the y axis by `angle` radians. */
export function rotationY(angle: number): Mat3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return Object.freeze([
    c, 0, s,
    0, 1, 0,
    -s, 0, c,
  ]) as Mat3
}

/** Active rotation about the z axis by `angle` radians. */
export function rotationZ(angle: number): Mat3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return Object.freeze([
    c, -s, 0,
    s, c, 0,
    0, 0, 1,
  ]) as Mat3
}

/** Matrix times vector: m v. */
export function apply(m: Mat3, v: Vec3): Vec3 {
  return vec3(
    m[0] * v.x + m[1] * v.y + m[2] * v.z,
    m[3] * v.x + m[4] * v.y + m[5] * v.z,
    m[6] * v.x + m[7] * v.y + m[8] * v.z,
  )
}

/** Matrix product a b. */
export function multiply(a: Mat3, b: Mat3): Mat3 {
  return Object.freeze([
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ]) as Mat3
}

/** Transpose (which is also the inverse for a rotation matrix). */
export function transpose(m: Mat3): Mat3 {
  return Object.freeze([
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ]) as Mat3
}
