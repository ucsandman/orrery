/**
 * Stumpff functions C(z) and S(z).
 *
 * These two functions are the heart of the universal-variable formulation of
 * Kepler's problem: a single set of equations that works for an ellipse, a
 * parabola, and a hyperbola without branching on the conic type. They are
 * defined by the power series
 *
 *   C(z) = sum_{k=0}^inf (-z)^k / (2k + 2)!  = 1/2! - z/4! + z^2/6! - ...
 *   S(z) = sum_{k=0}^inf (-z)^k / (2k + 3)!  = 1/3! - z/5! + z^2/7! - ...
 *
 * and have the closed forms
 *
 *   z > 0:  C = (1 - cos sqrt z) / z,         S = (sqrt z - sin sqrt z) / z^(3/2)
 *   z < 0:  C = (cosh sqrt(-z) - 1) / (-z),   S = (sinh sqrt(-z) - sqrt(-z)) / (-z)^(3/2)
 *   z = 0:  C = 1/2,                          S = 1/6
 *
 * The closed forms suffer catastrophic cancellation near z = 0 (for C, the
 * numerator 1 - cos sqrt z is the difference of two numbers that both approach
 * 1; for S, sqrt z - sin sqrt z is the difference of two numbers that both
 * approach sqrt z). The series does not cancel, so the production `stumpff`
 * switches to the series for small |z|. The two forms are exposed separately so
 * a test can confirm they agree across the cutover.
 */

/** The pair of Stumpff values at a single argument. */
export interface Stumpff {
  /** C(z). */
  readonly C: number
  /** S(z). */
  readonly S: number
}

/**
 * Below this magnitude of z the production path uses the series, because the
 * closed form loses too many digits to cancellation. This cutover is the
 * smallest magnitude at which the closed form and the series still agree to
 * 1e-12: a fine sweep measures their worst disagreement over |z| in
 * [1.5e-4, 1] at 6.8e-13 (the limiter is S, whose closed form cancels
 * sqrt(z) - sin sqrt(z)). For smaller |z| only the series is trustworthy.
 */
export const STUMPFF_SERIES_CUTOFF = 1.5e-4

/** Guard against a non-converging series (it always converges for finite z). */
const SERIES_MAX_TERMS = 60

/**
 * Stumpff functions by their Taylor series. Cancellation-free, so this is the
 * accurate branch for small |z|. Sums until the running term no longer changes
 * either partial sum, then stops.
 */
export function stumpffSeries(z: number): Stumpff {
  let termC = 0.5 // k = 0 term of C: 1 / 2!
  let termS = 1 / 6 // k = 0 term of S: 1 / 3!
  let C = termC
  let S = termS
  for (let k = 0; k < SERIES_MAX_TERMS; k++) {
    // term_{k+1} / term_k = -z / product of the next two factorial factors.
    termC *= -z / ((2 * k + 3) * (2 * k + 4))
    termS *= -z / ((2 * k + 4) * (2 * k + 5))
    const nextC = C + termC
    const nextS = S + termS
    if (nextC === C && nextS === S) return { C: nextC, S: nextS }
    C = nextC
    S = nextS
  }
  return { C, S }
}

/**
 * Stumpff functions by their closed form. This is the accurate branch for
 * |z| away from zero and serves as the independent oracle the series is checked
 * against near the cutover.
 */
export function stumpffClosed(z: number): Stumpff {
  if (z > 0) {
    const sz = Math.sqrt(z)
    return { C: (1 - Math.cos(sz)) / z, S: (sz - Math.sin(sz)) / (z * sz) }
  }
  if (z < 0) {
    const sz = Math.sqrt(-z)
    return { C: (Math.cosh(sz) - 1) / -z, S: (Math.sinh(sz) - sz) / (-z * sz) }
  }
  return { C: 0.5, S: 1 / 6 }
}

/**
 * Production Stumpff evaluation: series near zero (cancellation-free), closed
 * form elsewhere. Accurate across the whole real line for the z encountered in
 * universal-variable propagation.
 */
export function stumpff(z: number): Stumpff {
  return Math.abs(z) < STUMPFF_SERIES_CUTOFF ? stumpffSeries(z) : stumpffClosed(z)
}
