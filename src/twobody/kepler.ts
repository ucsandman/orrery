/**
 * Kepler propagation: advance a two-body state by a time interval.
 *
 * Two independent implementations are provided so they can cross-check each
 * other, which is a stronger correctness signal than one implementation checked
 * against transcribed numbers:
 *
 * - `propagateUniversal` uses the universal-variable formulation (Stumpff
 *   functions and Lagrange coefficients). One branchless set of equations covers
 *   the ellipse, the parabola, and the hyperbola, so it is the production
 *   propagator and the only one valid at the parabolic boundary.
 * - `propagateRegime` converts to classical elements, solves the appropriate
 *   form of Kepler's equation for the regime (elliptic or hyperbolic), advances
 *   the anomaly, and converts back. It is the independent oracle, valid away from
 *   e = 1.
 *
 * Both take and return position and velocity in an inertial frame with the
 * central body at the origin, in SI units, with `mu` the central gravitational
 * parameter (m^3 / s^2).
 */
import { TWO_PI } from '../core/constants'
import { type Vec3, add, scale, dot, norm } from '../core/vec3'
import { stumpff } from '../numeric/stumpff'
import { danby } from '../numeric/rootfind'
import { rvToElements, coeToRv } from './elements'

/** A position and velocity pair. */
export interface State {
  readonly r: Vec3
  readonly v: Vec3
}

/** Convergence tolerance on the universal anomaly (relative, dimensionless). */
const UNIVERSAL_TOL = 1e-12
const UNIVERSAL_MAX_ITER = 200

/** Within this of e = 1 the per-regime solver refuses: the parabola is universal-only. */
const PARABOLIC_BAND = 1e-6

/**
 * Universal-variable propagation (Curtis Algorithm 3.4). Solves the universal
 * Kepler equation for the universal anomaly chi, then forms the Lagrange
 * coefficients f, g, fdot, gdot to build the new state.
 *
 * The universal Kepler function F(chi) = sqrt(mu)(t(chi) - dt) is strictly
 * monotonic in chi (its derivative is the radius, always positive), so it has a
 * unique root with the sign of dt. A safeguarded Newton-bisection finds it
 * robustly across every conic, including the extreme hyperbolic transfers a
 * Lambert solve can produce, where bare Newton diverges.
 */
export function propagateUniversal(r0: Vec3, v0: Vec3, dt: number, mu: number): State {
  const sqrtMu = Math.sqrt(mu)
  const r0Mag = norm(r0)
  const vr0 = dot(r0, v0) / r0Mag // radial component of velocity
  const alpha = 2 / r0Mag - dot(v0, v0) / mu // reciprocal semi-major axis 1/a
  const term = (r0Mag * vr0) / sqrtMu

  // F(chi) and its derivative dF/dchi (which equals the radius at chi).
  const evalF = (chi: number): { F: number; dF: number } => {
    const z = alpha * chi * chi
    const { C, S } = stumpff(z)
    const chi2 = chi * chi
    const F = term * chi2 * C + (1 - alpha * r0Mag) * chi2 * chi * S + r0Mag * chi - sqrtMu * dt
    const dF = term * chi * (1 - z * S) + (1 - alpha * r0Mag) * chi2 * C + r0Mag
    return { F, dF }
  }

  let chi = 0
  if (dt !== 0) {
    // Bracket the root: F(0) = -sqrt(mu) dt has the opposite sign of dt, and F
    // grows without bound away from 0, so doubling reaches the other sign.
    const guess = sqrtMu * Math.abs(alpha) * dt
    let xl: number
    let xh: number
    if (dt > 0) {
      xl = 0
      xh = guess > 0 ? guess : 1
      let guard = 0
      while (evalF(xh).F < 0) {
        xh *= 2
        if (++guard > 200) throw new RangeError('universal Kepler: failed to bracket the root')
      }
    } else {
      xh = 0
      xl = guess < 0 ? guess : -1
      let guard = 0
      while (evalF(xl).F > 0) {
        xl *= 2
        if (++guard > 200) throw new RangeError('universal Kepler: failed to bracket the root')
      }
    }
    // Safeguarded Newton (Numerical Recipes rtsafe): Newton when it stays in the
    // bracket and converges, bisection otherwise. xl holds F < 0, xh holds F > 0.
    chi = (xl + xh) / 2
    let dxOld = Math.abs(xh - xl)
    let dx = dxOld
    let { F, dF } = evalF(chi)
    let converged = false
    for (let iter = 0; iter < UNIVERSAL_MAX_ITER; iter++) {
      const newtonOutOfRange = ((chi - xh) * dF - F) * ((chi - xl) * dF - F) > 0
      const newtonTooSlow = Math.abs(2 * F) > Math.abs(dxOld * dF)
      if (newtonOutOfRange || newtonTooSlow) {
        dxOld = dx
        dx = (xh - xl) / 2
        chi = xl + dx
      } else {
        dxOld = dx
        dx = F / dF
        chi -= dx
      }
      if (Math.abs(dx) <= UNIVERSAL_TOL * (1 + Math.abs(chi))) {
        converged = true
        break
      }
      ;({ F, dF } = evalF(chi))
      if (F < 0) xl = chi
      else xh = chi
    }
    if (!converged) {
      throw new RangeError(`universal Kepler did not converge in ${UNIVERSAL_MAX_ITER} iterations`)
    }
  }

  const z = alpha * chi * chi
  const { C, S } = stumpff(z)
  const chi2 = chi * chi
  const f = 1 - (chi2 / r0Mag) * C
  const g = dt - (chi2 * chi) / sqrtMu * S
  const rVec = add(scale(r0, f), scale(v0, g))
  const rMag = norm(rVec)
  const fDot = (sqrtMu / (rMag * r0Mag)) * (alpha * chi2 * chi * S - chi)
  const gDot = 1 - (chi2 / rMag) * C
  const vVec = add(scale(r0, fDot), scale(v0, gDot))
  return { r: rVec, v: vVec }
}

/** Reduce an elliptic mean anomaly to [-pi, pi] so the solver starts near the root. */
function wrapToPi(angle: number): number {
  const wrapped = angle % TWO_PI
  if (wrapped > Math.PI) return wrapped - TWO_PI
  if (wrapped < -Math.PI) return wrapped + TWO_PI
  return wrapped
}

/**
 * Per-regime propagation. Converts the state to classical elements, advances the
 * orbit by solving Kepler's equation for the regime, and converts back. Valid
 * for non-degenerate elliptic and hyperbolic orbits away from e = 1; throws
 * otherwise so a caller never gets a silently wrong parabolic result.
 */
export function propagateRegime(r0: Vec3, v0: Vec3, dt: number, mu: number): State {
  const el = rvToElements(r0, v0, mu)
  if (el.kind !== 'classical') {
    throw new RangeError(`per-regime solver needs a non-degenerate orbit, got ${el.kind}`)
  }
  const { a, e, i, raan, argp, nu: nu0 } = el
  if (Math.abs(e - 1) < PARABOLIC_BAND) {
    throw new RangeError(`per-regime solver excludes the parabolic band, got e = ${e}`)
  }

  let nu: number
  if (e < 1) {
    // Elliptic: true -> eccentric anomaly, advance mean anomaly, solve, back.
    const meanMotion = Math.sqrt(mu / (a * a * a))
    const e0 = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu0 / 2), Math.sqrt(1 + e) * Math.cos(nu0 / 2))
    const m0 = e0 - e * Math.sin(e0)
    const m = wrapToPi(m0 + meanMotion * dt)
    const eAnom = danby(
      (x) => x - e * Math.sin(x) - m,
      (x) => 1 - e * Math.cos(x),
      (x) => e * Math.sin(x),
      m, // guess: E ~ M for the reduced anomaly
    )
    nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eAnom / 2), Math.sqrt(1 - e) * Math.cos(eAnom / 2))
  } else {
    // Hyperbolic: true -> hyperbolic anomaly, advance mean anomaly, solve, back.
    const meanMotion = Math.sqrt(mu / (-a * -a * -a))
    const h0 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu0 / 2))
    const m0 = e * Math.sinh(h0) - h0
    const m = m0 + meanMotion * dt
    const hAnom = danby(
      (x) => e * Math.sinh(x) - x - m,
      (x) => e * Math.cosh(x) - 1,
      (x) => e * Math.sinh(x),
      Math.asinh(m / e), // guess from e sinh H ~ M at large H
    )
    nu = 2 * Math.atan2(Math.sqrt(e + 1) * Math.sinh(hAnom / 2), Math.sqrt(e - 1) * Math.cosh(hAnom / 2))
  }

  return coeToRv(a, e, i, raan, argp, nu, mu)
}
