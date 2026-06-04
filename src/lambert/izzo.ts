/**
 * Izzo 2014 Lambert solver (the production solver), with multi-revolution.
 *
 * Dario Izzo's "Revisiting Lambert's problem" reformulates the problem in a
 * single variable x in (-1, 1) for the elliptic case (x > 1 hyperbolic), with a
 * time-of-flight function whose first three derivatives are known in closed
 * form. A third-order Householder iteration then converges quadratically-plus
 * from a good initial guess, and multi-revolution transfers fall out as extra
 * roots (a left and a right branch per revolution count).
 *
 * This implementation uses the exact Lagrange form of the time of flight (valid
 * for every conic; it loses digits only in a thin band around the parabola
 * x = 1, which transfers rarely hit exactly). It is checked against the
 * independent Bate-Mueller-White oracle and by re-propagating every solution
 * back to its endpoints.
 *
 * Direction convention matches the oracle: prograde by default, the transfer
 * angle chosen by the sign of the z component of r1 x r2, overridable by the
 * `retrograde` flag.
 */
import { TWO_PI } from '../core/constants'
import { type Vec3, add, sub, scale, cross, norm, normalize, neg } from '../core/vec3'
import { COLLINEAR_SIN_TOL } from './bmw'

/** One Lambert solution: the velocities, its revolution count, and which branch. */
export interface LambertBranch {
  readonly v1: Vec3
  readonly v2: Vec3
  readonly revs: number
  readonly rightBranch: boolean
}

/** Options for an Izzo solve. */
export interface IzzoOptions {
  readonly retrograde?: boolean
  /** Maximum revolution count to search. Default 0 (single-revolution only). */
  readonly maxRevs?: number
}

const HOUSEHOLDER_TOL = 1e-13
const HOUSEHOLDER_MAX_ITER = 60

/** Non-dimensional time of flight (Lagrange form) for variable x and M revolutions. */
function timeOfFlight(x: number, lambda: number, revs: number): number {
  const a = 1 / (1 - x * x)
  if (a > 0) {
    // Ellipse.
    const alpha = 2 * Math.acos(x)
    let beta = 2 * Math.asin(Math.sqrt((lambda * lambda) / a))
    if (lambda < 0) beta = -beta
    return (a * Math.sqrt(a) * ((alpha - Math.sin(alpha)) - (beta - Math.sin(beta)) + TWO_PI * revs)) / 2
  }
  // Hyperbola (revs is zero here).
  const alpha = 2 * Math.acosh(x)
  let beta = 2 * Math.asinh(Math.sqrt(-(lambda * lambda) / a))
  if (lambda < 0) beta = -beta
  return (-a * Math.sqrt(-a) * ((beta - Math.sinh(beta)) - (alpha - Math.sinh(alpha)))) / 2
}

/** Time of flight and its first three derivatives in x (Izzo's closed forms). */
function tofDerivatives(x: number, lambda: number, revs: number): [number, number, number, number] {
  const T = timeOfFlight(x, lambda, revs)
  const l2 = lambda * lambda
  const l3 = l2 * lambda
  const l5 = l3 * l2
  const omx2 = 1 - x * x
  const y = Math.sqrt(1 - l2 * omx2)
  const y3 = y * y * y
  const y5 = y3 * y * y
  const dT = (1 / omx2) * (3 * T * x - 2 + (2 * l3 * x) / y)
  const ddT = (1 / omx2) * (3 * T + 5 * x * dT + (2 * (1 - l2) * l3) / y3)
  const dddT = (1 / omx2) * (7 * x * ddT + 8 * dT - (6 * (1 - l2) * l5 * x) / y5)
  return [T, dT, ddT, dddT]
}

/** Householder root step toward timeOfFlight(x) = target; returns the converged x. */
function householder(target: number, x0: number, lambda: number, revs: number): number {
  let x = x0
  for (let i = 0; i < HOUSEHOLDER_MAX_ITER; i++) {
    const [T, dT, ddT, dddT] = tofDerivatives(x, lambda, revs)
    const f = T - target
    const denom = dT * (dT * dT - f * ddT) + (dddT * f * f) / 6
    const delta = (f * (dT * dT - (f * ddT) / 2)) / denom
    x -= delta
    if (!Number.isFinite(x)) break
    if (Math.abs(delta) < HOUSEHOLDER_TOL) return x
  }
  return x
}

/**
 * Solve the single-revolution time-of-flight equation timeOfFlight(x) = target
 * with a regime-aware, bracketed safeguarded Newton (rtsafe). timeOfFlight is
 * strictly decreasing in x, so the root is unique: for target > T1 it lies in the
 * elliptic interval (-1, 1); for target < T1 in the hyperbolic interval (1, inf).
 * Bracketing keeps the iteration in the correct regime, so it cannot stall at the
 * parabola x = 1 the way a bare Householder can when it overshoots.
 */
function solveSingleRev(target: number, lambda: number): number {
  const T1 = (2 / 3) * (1 - lambda * lambda * lambda) // parabolic time of flight
  let xl: number
  let xh: number
  if (target > T1) {
    xl = -1 + 1e-12
    xh = 1 - 1e-12
  } else {
    xl = 1 + 1e-12
    xh = 2
    let guard = 0
    while (timeOfFlight(xh, lambda, 0) > target) {
      xh = 1 + (xh - 1) * 2
      if (++guard > 100) break
    }
  }
  // f(x) = timeOfFlight(x) - target is decreasing: f(xl) > 0, f(xh) < 0.
  let x = (xl + xh) / 2
  let dxOld = Math.abs(xh - xl)
  let dx = dxOld
  let [tof, dT] = tofDerivatives(x, lambda, 0)
  let f = tof - target
  for (let i = 0; i < HOUSEHOLDER_MAX_ITER; i++) {
    const newtonOutOfRange = ((x - xh) * dT - f) * ((x - xl) * dT - f) > 0
    const newtonTooSlow = Math.abs(2 * f) > Math.abs(dxOld * dT)
    if (newtonOutOfRange || newtonTooSlow) {
      dxOld = dx
      dx = (xh - xl) / 2
      x = xl + dx
    } else {
      dxOld = dx
      dx = f / dT
      x -= dx
    }
    if (Math.abs(dx) <= HOUSEHOLDER_TOL * (1 + Math.abs(x))) break
    ;[tof, dT] = tofDerivatives(x, lambda, 0)
    f = tof - target
    if (f > 0) xl = x
    else xh = x
  }
  return x
}

/** Halley iteration for the minimum-time x (root of dT/dx) for `revs` revolutions. */
function minimumTimeX(lambda: number, revs: number): number {
  let x = 0
  for (let i = 0; i < 24; i++) {
    const [, dT, ddT, dddT] = tofDerivatives(x, lambda, revs)
    const denom = 2 * ddT * ddT - dT * dddT
    if (denom === 0) break
    const delta = (2 * dT * ddT) / denom
    x -= delta
    if (!Number.isFinite(x)) break
    if (Math.abs(delta) < 1e-13) break
  }
  return x
}

/** Geometry of the transfer: lambda, the chord/semiperimeter, and unit vectors. */
function geometry(r1: Vec3, r2: Vec3, retrograde: boolean) {
  const r1n = norm(r1)
  const r2n = norm(r2)
  const c = norm(cross(r1, r2)) / (r1n * r2n) // |sin(transfer angle)| for the collinear guard
  if (c < COLLINEAR_SIN_TOL) {
    throw new RangeError('Lambert: collinear positions, transfer plane is undefined')
  }
  const chord = norm(sub(r2, r1))
  const s = (r1n + r2n + chord) / 2
  const ir1 = normalize(r1)
  const ir2 = normalize(r2)
  const ih = normalize(cross(ir1, ir2))
  let lambda = Math.sqrt(1 - chord / s)
  let it1: Vec3
  let it2: Vec3
  if (ih.z < 0) {
    lambda = -lambda
    it1 = normalize(cross(ir1, ih))
    it2 = normalize(cross(ir2, ih))
  } else {
    it1 = normalize(cross(ih, ir1))
    it2 = normalize(cross(ih, ir2))
  }
  if (retrograde) {
    lambda = -lambda
    it1 = neg(it1)
    it2 = neg(it2)
  }
  return { r1n, r2n, chord, s, ir1, ir2, it1, it2, lambda }
}

/** Reconstruct v1, v2 from a converged x and the transfer geometry. */
function velocities(
  x: number,
  geo: ReturnType<typeof geometry>,
  mu: number,
): { v1: Vec3; v2: Vec3 } {
  const { r1n, r2n, chord, s, ir1, ir2, it1, it2, lambda } = geo
  const gamma = Math.sqrt((mu * s) / 2)
  const rho = (r1n - r2n) / chord
  const sigma = Math.sqrt(1 - rho * rho)
  const y = Math.sqrt(1 - lambda * lambda * (1 - x * x))
  const vr1 = (gamma * ((lambda * y - x) - rho * (lambda * y + x))) / r1n
  const vr2 = (-gamma * ((lambda * y - x) + rho * (lambda * y + x))) / r2n
  const vt1 = (gamma * sigma * (y + lambda * x)) / r1n
  const vt2 = (gamma * sigma * (y + lambda * x)) / r2n
  return {
    v1: add(scale(ir1, vr1), scale(it1, vt1)),
    v2: add(scale(ir2, vr2), scale(it2, vt2)),
  }
}

/**
 * Solve Lambert's problem by Izzo's method. Returns every solution found: the
 * single-revolution transfer first, then for each feasible revolution count up
 * to `maxRevs` a left and a right branch. A revolution count beyond what the
 * flight time allows contributes no branches.
 */
export function lambertIzzo(
  r1: Vec3,
  r2: Vec3,
  tof: number,
  mu: number,
  options: IzzoOptions = {},
): LambertBranch[] {
  const geo = geometry(r1, r2, options.retrograde ?? false)
  const { s, lambda } = geo
  const maxRevs = options.maxRevs ?? 0

  // Non-dimensional time of flight.
  const T = Math.sqrt((2 * mu) / (s * s * s)) * tof
  const results: LambertBranch[] = []

  // Single-revolution solution (regime-aware bracketed solve).
  const xSingle = solveSingleRev(T, lambda)
  results.push({ ...velocities(xSingle, geo, mu), revs: 0, rightBranch: false })

  // Multi-revolution solutions.
  const nMaxByTime = Math.floor(T / Math.PI)
  for (let m = 1; m <= Math.min(maxRevs, nMaxByTime); m++) {
    // Feasibility: the minimum time for m revolutions must not exceed T.
    const xMin = minimumTimeX(lambda, m)
    const tMin = timeOfFlight(xMin, lambda, m)
    if (T < tMin) continue

    const leftGuess = (((m * Math.PI + Math.PI) / (8 * T)) ** (2 / 3) - 1) /
      (((m * Math.PI + Math.PI) / (8 * T)) ** (2 / 3) + 1)
    const rightGuess = (((8 * T) / (m * Math.PI)) ** (2 / 3) - 1) /
      (((8 * T) / (m * Math.PI)) ** (2 / 3) + 1)
    const xLeft = householder(T, leftGuess, lambda, m)
    const xRight = householder(T, rightGuess, lambda, m)
    for (const [x, right] of [[xLeft, false], [xRight, true]] as [number, boolean][]) {
      if (Math.abs(x) >= 1) continue // multi-rev solutions are elliptic
      if (Math.abs(timeOfFlight(x, lambda, m) - T) > 1e-7) continue
      results.push({ ...velocities(x, geo, mu), revs: m, rightBranch: right })
    }
  }
  return results
}

/** The single-revolution Izzo solution (convenience for the common case). */
export function lambertIzzoSingle(r1: Vec3, r2: Vec3, tof: number, mu: number, retrograde = false): {
  v1: Vec3
  v2: Vec3
} {
  const [solution] = lambertIzzo(r1, r2, tof, mu, { retrograde, maxRevs: 0 })
  return { v1: solution!.v1, v2: solution!.v2 }
}
