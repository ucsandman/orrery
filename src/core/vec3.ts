/**
 * Immutable 3D vector for the analytic layer.
 *
 * A `Vec3` is a frozen plain object with `x`, `y`, `z`. Every operation returns
 * a fresh frozen vector and never mutates an input, so two results can never
 * share a mutable cell (the whole class of aliasing bugs is removed by
 * construction). Objects are structurally comparable, so golden fixtures diff
 * cleanly. This type is used everywhere precision and clarity matter: orbital
 * elements, Kepler propagation, Lambert, maneuvers, and the three-body problem.
 *
 * The N-body simulation hot loop does not use `Vec3`. It uses a packed
 * Float64Array buffer (see the integrators layer) for zero per-step allocation.
 */
export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Construct a frozen vector. */
export function vec3(x: number, y: number, z: number): Vec3 {
  return Object.freeze({ x, y, z })
}

/** The zero vector. */
export const ZERO: Vec3 = vec3(0, 0, 0)

/** Component-wise sum a + b. */
export function add(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z)
}

/** Component-wise difference a - b. */
export function sub(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** Scalar multiple s * a. */
export function scale(a: Vec3, s: number): Vec3 {
  return vec3(a.x * s, a.y * s, a.z * s)
}

/** Negation -a. */
export function neg(a: Vec3): Vec3 {
  return vec3(-a.x, -a.y, -a.z)
}

/** Dot (scalar) product a . b. */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/** Cross (vector) product a x b, perpendicular to both a and b. */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  )
}

/** Squared length a . a. Cheaper than `norm` when only comparisons are needed. */
export function norm2(a: Vec3): number {
  return a.x * a.x + a.y * a.y + a.z * a.z
}

/** Length (magnitude) of a. */
export function norm(a: Vec3): number {
  return Math.sqrt(norm2(a))
}

/** Euclidean distance between a and b. */
export function distance(a: Vec3, b: Vec3): number {
  return norm(sub(a, b))
}

/**
 * Unit vector in the direction of a.
 * Throws on a zero-length or non-finite vector rather than returning NaN, so a
 * degenerate input fails loud instead of poisoning downstream physics.
 */
export function normalize(a: Vec3): Vec3 {
  const n = norm(a)
  if (n === 0 || !Number.isFinite(n)) {
    throw new RangeError('cannot normalize a zero-length or non-finite vector')
  }
  return scale(a, 1 / n)
}

/** Linear interpolation a + t (b - a). t = 0 gives a, t = 1 gives b. */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return vec3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  )
}

/** True when every component is a finite number (no NaN, no Infinity). */
export function isFinite3(a: Vec3): boolean {
  return Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z)
}

/**
 * Component-wise approximate equality with a mixed absolute and relative
 * tolerance: each component must satisfy |a - b| <= atol + rtol max(|a|, |b|).
 */
export function equals(a: Vec3, b: Vec3, rtol = 0, atol = 0): boolean {
  return (
    Math.abs(a.x - b.x) <= atol + rtol * Math.max(Math.abs(a.x), Math.abs(b.x)) &&
    Math.abs(a.y - b.y) <= atol + rtol * Math.max(Math.abs(a.y), Math.abs(b.y)) &&
    Math.abs(a.z - b.z) <= atol + rtol * Math.max(Math.abs(a.z), Math.abs(b.z))
  )
}
