/**
 * The single canonical pairwise gravity kernel.
 *
 * This is the one source of summation-order truth for the simulation layer.
 * Determinism contract (public; changing it is a breaking change):
 *
 * - Pairs are visited in fixed ascending index order: i from 0, j from i+1.
 * - The separation is always taken j minus i (fixed operand order).
 * - Each pair writes an equal-and-opposite contribution (Newton's third law):
 *   body i gains G m_j / r^3 * d and body j loses G m_i / r^3 * d, built from the
 *   same d and the same 1/r^3. For equal masses the two acceleration writes are
 *   bit-for-bit opposite, so an equal-mass system conserves momentum to exactly
 *   zero; for unequal masses the residual is machine-noise.
 * - Only correctly-rounded operations are used (+, -, *, /, sqrt). No
 *   transcendental function touches this path, so it is bit-identical across V8
 *   versions on the pinned engine.
 *
 * A softening length >= 0 is added in quadrature to the squared separation. With
 * softening 0 (the default) two coincident bodies produce a division by zero and
 * a non-finite acceleration, which the run loop's finiteness gate rejects.
 */

/**
 * Write the gravitational acceleration of every body into `acc` (length 3N, laid
 * out [ax, ay, az] per body). Reads positions from the packed 6N `data` buffer.
 */
export function accelerations(
  data: Float64Array,
  masses: Float64Array,
  n: number,
  G: number,
  softening: number,
  acc: Float64Array,
): void {
  const soft2 = softening * softening
  for (let k = 0; k < 3 * n; k++) acc[k] = 0
  for (let i = 0; i < n; i++) {
    const oi = 6 * i
    const xi = data[oi]!
    const yi = data[oi + 1]!
    const zi = data[oi + 2]!
    const mi = masses[i]!
    const ai = 3 * i
    for (let j = i + 1; j < n; j++) {
      const oj = 6 * j
      const dx = data[oj]! - xi
      const dy = data[oj + 1]! - yi
      const dz = data[oj + 2]! - zi
      const r2 = dx * dx + dy * dy + dz * dz + soft2
      const invr = 1 / Math.sqrt(r2)
      const invr3 = invr * invr * invr
      const gi = G * masses[j]! * invr3 // magnitude of i's acceleration toward j
      const gj = G * mi * invr3 // magnitude of j's acceleration toward i
      const aj = 3 * j
      acc[ai] = acc[ai]! + gi * dx
      acc[ai + 1] = acc[ai + 1]! + gi * dy
      acc[ai + 2] = acc[ai + 2]! + gi * dz
      acc[aj] = acc[aj]! - gj * dx
      acc[aj + 1] = acc[aj + 1]! - gj * dy
      acc[aj + 2] = acc[aj + 2]! - gj * dz
    }
  }
}
