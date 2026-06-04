/**
 * Scalar root finders for the analytic layer.
 *
 * Kepler's equation and the universal-variable equation have no closed-form
 * inverse, so they are solved iteratively. These three iterators differ in how
 * many derivatives they use and how fast they converge:
 *
 * - Newton's method (order 2) uses f and f'.
 * - Danby's method (order 3) adds f'' to take a curvature-corrected step, which
 *   converges in fewer iterations on Kepler's equation.
 * - Householder's method of order 2, equivalently Halley's method (order 3),
 *   also uses f and f'' but in the rational form that is the standard robust
 *   default for the universal Kepler equation.
 *
 * Every iterator fails loud: it throws rather than returning a half-converged or
 * non-finite root, so a propagation that did not actually solve its equation can
 * never silently feed a wrong state downstream.
 */

/** Convergence and iteration controls shared by the iterators. */
export interface RootFindOptions {
  /** Stop when the step size satisfies |delta| <= tol * (1 + |x|). */
  readonly tol?: number
  /** Throw once this many iterations pass without convergence. */
  readonly maxIter?: number
}

const DEFAULT_TOL = 1e-14
const DEFAULT_MAX_ITER = 100

function converged(delta: number, x: number, tol: number): boolean {
  return Math.abs(delta) <= tol * (1 + Math.abs(x))
}

function fail(name: string, x: number, iter: number): never {
  throw new RangeError(`${name} failed to converge after ${iter} iterations (x = ${x})`)
}

/** Newton's method: x <- x - f / f'. Throws if it does not converge. */
export function newton(
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  opts: RootFindOptions = {},
): number {
  const tol = opts.tol ?? DEFAULT_TOL
  const maxIter = opts.maxIter ?? DEFAULT_MAX_ITER
  let x = x0
  for (let i = 0; i < maxIter; i++) {
    const fp = df(x)
    if (fp === 0 || !Number.isFinite(fp)) fail('newton', x, i)
    const delta = -f(x) / fp
    x += delta
    if (!Number.isFinite(x)) fail('newton', x, i)
    if (converged(delta, x, tol)) return x
  }
  return fail('newton', x, maxIter)
}

/**
 * Danby's method (order 3): a Newton step refined by a second step that folds
 * in the second derivative. Converges on Kepler's equation in two to three
 * iterations from a decent guess.
 */
export function danby(
  f: (x: number) => number,
  df: (x: number) => number,
  d2f: (x: number) => number,
  x0: number,
  opts: RootFindOptions = {},
): number {
  const tol = opts.tol ?? DEFAULT_TOL
  const maxIter = opts.maxIter ?? DEFAULT_MAX_ITER
  let x = x0
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x)
    const fp = df(x)
    if (fp === 0 || !Number.isFinite(fp)) fail('danby', x, i)
    const d1 = -fx / fp
    const d2 = -fx / (fp + 0.5 * d1 * d2f(x))
    x += d2
    if (!Number.isFinite(x)) fail('danby', x, i)
    if (converged(d2, x, tol)) return x
  }
  return fail('danby', x, maxIter)
}

/**
 * Householder's method of order 2 (Halley's method): x <- x - 2 f f' /
 * (2 f'^2 - f f''). Order-3 convergence in a rational form that is stable for
 * the universal Kepler equation.
 */
export function householder(
  f: (x: number) => number,
  df: (x: number) => number,
  d2f: (x: number) => number,
  x0: number,
  opts: RootFindOptions = {},
): number {
  const tol = opts.tol ?? DEFAULT_TOL
  const maxIter = opts.maxIter ?? DEFAULT_MAX_ITER
  let x = x0
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x)
    const fp = df(x)
    const denom = 2 * fp * fp - fx * d2f(x)
    if (denom === 0 || !Number.isFinite(denom)) fail('householder', x, i)
    const delta = (-2 * fx * fp) / denom
    x += delta
    if (!Number.isFinite(x)) fail('householder', x, i)
    if (converged(delta, x, tol)) return x
  }
  return fail('householder', x, maxIter)
}
