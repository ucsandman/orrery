/**
 * Bate-Mueller-White universal-variable Lambert solver (the oracle).
 *
 * Lambert's problem: given two position vectors r1 and r2, a time of flight, and
 * the central gravitational parameter mu, find the velocities v1 and v2 of the
 * connecting conic. This is the textbook universal-variable method (Bate,
 * Mueller, White; presented as Curtis Algorithm 5.2): a single Newton iteration
 * on the universal variable z, valid for elliptic, parabolic, and hyperbolic
 * transfers, using the Stumpff functions C(z) and S(z).
 *
 * It is the independent oracle that the production Izzo solver is checked
 * against. Two independent solvers that must agree is a stronger correctness
 * signal than one solver checked against transcribed numbers.
 *
 * Direction: by default the transfer is prograde and the transfer angle is
 * chosen by the sign of the z component of r1 x r2 (short way when positive,
 * long way when negative); the `retrograde` flag flips that choice. Collinear
 * positions (transfer angle 0 or pi, where the orbital plane is undefined) are
 * rejected, never silently solved.
 */
import { TWO_PI } from '../core/constants'
import { type Vec3, sub, scale, dot, cross, norm } from '../core/vec3'
import { stumpff } from '../numeric/stumpff'

/** The two velocity vectors of a Lambert transfer. */
export interface LambertSolution {
  readonly v1: Vec3
  readonly v2: Vec3
}

/** Direction control for a Lambert solve. */
export interface LambertOptions {
  /** Force a retrograde transfer. Default false (prograde). */
  readonly retrograde?: boolean
}

/** Below this |sin(transfer angle)| the positions are collinear and rejected. */
export const COLLINEAR_SIN_TOL = 1e-8

const BMW_TOL = 1e-10
const BMW_MAX_ITER = 300

/**
 * Upper bound of the single-revolution branch of z. At z = (2 pi)^2 the Stumpff
 * function C(z) reaches zero and y blows up; beyond it lies the one-revolution
 * branch. Newton steps are damped to stay below this so the iteration cannot
 * jump branches and return a looping (effectively multi-revolution) solution.
 */
const Z_SINGLE_REV_UPPER = (2 * Math.PI) ** 2

function clampUnit(x: number): number {
  return x < -1 ? -1 : x > 1 ? 1 : x
}

/** Solve Lambert's problem by the Bate-Mueller-White universal-variable method. */
export function lambertBMW(
  r1: Vec3,
  r2: Vec3,
  tof: number,
  mu: number,
  options: LambertOptions = {},
): LambertSolution {
  const r1n = norm(r1)
  const r2n = norm(r2)
  const c12 = cross(r1, r2)
  const sinDth = norm(c12) / (r1n * r2n) // |sin(transfer angle)|
  if (sinDth < COLLINEAR_SIN_TOL) {
    throw new RangeError('Lambert: collinear positions, transfer plane is undefined')
  }

  const cosDth = clampUnit(dot(r1, r2) / (r1n * r2n))
  const prograde = !(options.retrograde ?? false)
  const principal = Math.acos(cosDth)
  let dth: number
  if (prograde) {
    dth = c12.z >= 0 ? principal : TWO_PI - principal
  } else {
    dth = c12.z < 0 ? principal : TWO_PI - principal
  }

  // Geometry constant A. Nonzero because the collinear case is already rejected.
  const A = Math.sin(dth) * Math.sqrt((r1n * r2n) / (1 - Math.cos(dth)))

  const sqrtMu = Math.sqrt(mu)
  const yOf = (z: number): number => {
    const { C, S } = stumpff(z)
    return r1n + r2n + (A * (z * S - 1)) / Math.sqrt(C)
  }

  // Newton iteration on F(z) = (y/C)^1.5 S + A sqrt(y) - sqrt(mu) tof.
  let z = 0
  // Nudge z up until y > 0 (a lower bound exists for very long transfers).
  while (yOf(z) < 0) z += 0.1

  let converged = false
  for (let iter = 0; iter < BMW_MAX_ITER; iter++) {
    const { C, S } = stumpff(z)
    const y = r1n + r2n + (A * (z * S - 1)) / Math.sqrt(C)
    if (y < 0) {
      z += 0.1
      continue
    }
    const sqrtY = Math.sqrt(y)
    const F = (y / C) ** 1.5 * S + A * sqrtY - sqrtMu * tof
    let dFdz: number
    if (z === 0) {
      const y0 = y
      dFdz = (Math.SQRT2 / 40) * y0 ** 1.5 + (A / 8) * (Math.sqrt(y0) + A * Math.sqrt(1 / (2 * y0)))
    } else {
      dFdz =
        (y / C) ** 1.5 * ((1 / (2 * z)) * (C - (3 * S) / (2 * C)) + (3 * S * S) / (4 * C)) +
        (A / 8) * (3 * (S / C) * sqrtY + A * Math.sqrt(C / y))
    }
    const ratio = F / dFdz
    let zNext = z - ratio
    // Damp toward the boundary instead of overshooting into the next branch.
    if (zNext >= Z_SINGLE_REV_UPPER) zNext = (z + Z_SINGLE_REV_UPPER) / 2
    const step = z - zNext
    z = zNext
    if (!Number.isFinite(z)) throw new RangeError('Lambert BMW: non-finite z')
    if (Math.abs(step) <= BMW_TOL) {
      converged = true
      break
    }
  }
  if (!converged) throw new RangeError(`Lambert BMW did not converge in ${BMW_MAX_ITER} iterations`)

  const { C, S } = stumpff(z)
  const y = r1n + r2n + (A * (z * S - 1)) / Math.sqrt(C)
  const f = 1 - y / r1n
  const g = A * Math.sqrt(y / mu)
  const gdot = 1 - y / r2n
  const v1 = scale(sub(r2, scale(r1, f)), 1 / g)
  const v2 = scale(sub(scale(r2, gdot), r1), 1 / g)
  return { v1, v2 }
}
