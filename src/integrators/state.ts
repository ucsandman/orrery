/**
 * The seam between the immutable-Vec3 analytic layer and the packed-buffer
 * simulation layer.
 *
 * The N-body integrator does not use Vec3: it works on a single packed
 * Float64Array of length 6N, laid out per body as [x, y, z, vx, vy, vz] in body
 * index order, with masses in a parallel Float64Array of length N. This layout
 * is contiguous (cache-friendly), allocation-free in the step loop, and exactly
 * byte-comparable for replay.
 *
 * `fromBodies` packs and `toBodies` unpacks; the seam is crossed exactly twice
 * per run cycle (at build and at each recorded snapshot), never inside the step
 * loop. The body order is public and fixed: it is part of the determinism
 * contract, because it fixes the force kernel's summation order.
 */
import { type Vec3, vec3 } from '../core/vec3'

/** One body: mass and an immutable position and velocity. */
export interface Body {
  readonly mass: number
  readonly position: Vec3
  readonly velocity: Vec3
}

/** Packed simulation state: masses (length N) and the 6N position/velocity buffer. */
export interface StateBuffer {
  readonly n: number
  readonly masses: Float64Array
  readonly data: Float64Array
}

/** Pack bodies into a state buffer, preserving order. */
export function fromBodies(bodies: readonly Body[]): StateBuffer {
  const n = bodies.length
  const masses = new Float64Array(n)
  const data = new Float64Array(6 * n)
  for (let i = 0; i < n; i++) {
    const b = bodies[i]!
    masses[i] = b.mass
    const o = 6 * i
    data[o] = b.position.x
    data[o + 1] = b.position.y
    data[o + 2] = b.position.z
    data[o + 3] = b.velocity.x
    data[o + 4] = b.velocity.y
    data[o + 5] = b.velocity.z
  }
  return { n, masses, data }
}

/** Unpack a state buffer back into bodies with frozen Vec3 position and velocity. */
export function toBodies(state: StateBuffer): Body[] {
  const { n, masses, data } = state
  const out: Body[] = []
  for (let i = 0; i < n; i++) {
    const o = 6 * i
    out.push({
      mass: masses[i]!,
      position: vec3(data[o]!, data[o + 1]!, data[o + 2]!),
      velocity: vec3(data[o + 3]!, data[o + 4]!, data[o + 5]!),
    })
  }
  return out
}

/** True when two buffers are byte-for-byte identical (the replay equality test). */
export function buffersEqual(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false
  const ua = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
  const ub = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
  for (let i = 0; i < ua.length; i++) {
    if (ua[i] !== ub[i]) return false
  }
  return true
}

/** True when every value in the buffer is finite (no NaN, no Infinity). */
export function allFinite(data: Float64Array): boolean {
  for (let i = 0; i < data.length; i++) {
    if (!Number.isFinite(data[i]!)) return false
  }
  return true
}
