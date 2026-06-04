/**
 * Conservation invariants for the simulation layer.
 *
 * Total energy, total linear momentum, and total angular momentum are computed
 * directly from a packed state buffer. The summation order is fixed and matches
 * the force kernel's pair order, because IEEE-754 addition is not associative
 * and the conservation harness must not introduce an ordering of its own.
 */
import { compensatedSum } from '../../src/numeric/sum'
import { type Vec3, vec3 } from '../../src/core/vec3'

/** Total linear momentum p = sum_i m_i v_i, summed in body index order. */
export function totalLinearMomentum(data: Float64Array, masses: Float64Array, n: number): Vec3 {
  let px = 0
  let py = 0
  let pz = 0
  for (let i = 0; i < n; i++) {
    const o = 6 * i
    const m = masses[i]!
    px += m * data[o + 3]!
    py += m * data[o + 4]!
    pz += m * data[o + 5]!
  }
  return vec3(px, py, pz)
}

/** Total angular momentum L = sum_i m_i (r_i x v_i), summed in body index order. */
export function totalAngularMomentum(data: Float64Array, masses: Float64Array, n: number): Vec3 {
  let lx = 0
  let ly = 0
  let lz = 0
  for (let i = 0; i < n; i++) {
    const o = 6 * i
    const m = masses[i]!
    const x = data[o]!
    const y = data[o + 1]!
    const z = data[o + 2]!
    const vx = data[o + 3]!
    const vy = data[o + 4]!
    const vz = data[o + 5]!
    lx += m * (y * vz - z * vy)
    ly += m * (z * vx - x * vz)
    lz += m * (x * vy - y * vx)
  }
  return vec3(lx, ly, lz)
}

/**
 * Total energy: kinetic (index order) plus potential (the force kernel's pair
 * order). Each part is summed with compensated summation for accuracy; the term
 * order is fixed for determinism.
 */
export function totalEnergy(
  data: Float64Array,
  masses: Float64Array,
  n: number,
  G: number,
  softening: number,
): number {
  const kinetic: number[] = []
  for (let i = 0; i < n; i++) {
    const o = 6 * i
    const m = masses[i]!
    const vx = data[o + 3]!
    const vy = data[o + 4]!
    const vz = data[o + 5]!
    kinetic.push(0.5 * m * (vx * vx + vy * vy + vz * vz))
  }
  const soft2 = softening * softening
  const potential: number[] = []
  for (let i = 0; i < n; i++) {
    const oi = 6 * i
    const mi = masses[i]!
    for (let j = i + 1; j < n; j++) {
      const oj = 6 * j
      const dx = data[oj]! - data[oi]!
      const dy = data[oj + 1]! - data[oi + 1]!
      const dz = data[oj + 2]! - data[oi + 2]!
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz + soft2)
      potential.push((-G * mi * masses[j]!) / r)
    }
  }
  return compensatedSum(kinetic) + compensatedSum(potential)
}
