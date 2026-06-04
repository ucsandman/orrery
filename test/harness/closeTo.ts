/**
 * Numeric comparison helpers for tests.
 *
 * Physics assertions never use a bare equality or a single fixed number of
 * decimal places. They use a mixed absolute and relative tolerance,
 *   |a - b| <= atol + rtol * max(|a|, |b|),
 * the same shape as numpy.isclose. The relative term scales with magnitude so a
 * large heliocentric distance and a small velocity can share one rule; the
 * absolute term covers values that are zero by construction (a momentum
 * component that cancels to exactly zero).
 *
 * Every tolerance passed in by a test should be a named, commented constant
 * that traces to a source or to a measured run, never an unexplained literal.
 */

export interface Tolerance {
  /** Relative tolerance, scaled by the larger magnitude of the two values. */
  rtol?: number
  /** Absolute tolerance, the floor near zero. */
  atol?: number
}

/** True when a and b agree within the given mixed tolerance. */
export function closeTo(a: number, b: number, tol: Tolerance = {}): boolean {
  const rtol = tol.rtol ?? 0
  const atol = tol.atol ?? 0
  return Math.abs(a - b) <= atol + rtol * Math.max(Math.abs(a), Math.abs(b))
}

/** Angular comparison that treats values an exact multiple of 2 pi apart as equal. */
export function angleCloseTo(a: number, b: number, tol: Tolerance = {}): boolean {
  const twoPi = 2 * Math.PI
  let diff = (a - b) % twoPi
  if (diff > Math.PI) diff -= twoPi
  if (diff < -Math.PI) diff += twoPi
  const atol = tol.atol ?? 0
  const rtol = tol.rtol ?? 0
  return Math.abs(diff) <= atol + rtol * Math.max(Math.abs(a), Math.abs(b))
}
