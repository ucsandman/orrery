/**
 * Orbit classification and derived properties.
 *
 * Once a state vector is known, a planner reasons about the orbit's shape and
 * extreme points: what kind of conic it is, how long one revolution takes, and
 * how close and how far the body travels. These are cheap closed-form quantities
 * that must agree with what a numerical propagation of the same orbit actually
 * reaches.
 *
 * - periapsis: the closest point to the central body, radius a(1 - e).
 * - apoapsis: the farthest point, radius a(1 + e); Infinity for an unbound orbit.
 * - period: the time for one revolution, 2 pi sqrt(a^3 / mu); Infinity for a
 *   parabola or hyperbola, which never return.
 * - specific orbital energy: the conserved energy per unit mass, v^2/2 - mu/r,
 *   equal to -mu/(2a) everywhere on the orbit.
 */
import { type Vec3, dot, norm } from '../core/vec3'
import { TWO_PI } from '../core/constants'
import { rvToElements, ECC_CIRCULAR_TOL } from '../twobody/elements'

/**
 * Within this of e = 1 the orbit is treated as parabolic. The eccentricity from
 * a state vector carries the propagation/extraction rounding (a few 1e-13 for a
 * clean state), so this band is far wider than that noise yet far below any
 * eccentric ellipse or hyperbola of interest.
 */
export const PARABOLIC_ECC_TOL = 1e-6

/** The four conic types an orbit can take. */
export type ConicType = 'circular' | 'elliptic' | 'parabolic' | 'hyperbolic'

/** Derived geometric and energetic properties of an orbit. */
export interface OrbitProperties {
  readonly conic: ConicType
  /** Semi-major axis (m); Infinity for a parabola, negative for a hyperbola. */
  readonly a: number
  readonly e: number
  /** Semi-latus rectum p = h^2 / mu (m). */
  readonly p: number
  /** Specific angular momentum magnitude (m^2 / s). */
  readonly h: number
  /** Specific orbital energy v^2/2 - mu/r (m^2 / s^2); zero for a parabola. */
  readonly energy: number
  /** Orbital period (s); Infinity for a parabola or hyperbola. */
  readonly period: number
  /** Periapsis radius (m). */
  readonly periapsis: number
  /** Apoapsis radius (m); Infinity for a parabola or hyperbola. */
  readonly apoapsis: number
}

/** Orbital period from the analytic identity 2 pi sqrt(a^3 / mu); a must be > 0. */
export function orbitalPeriod(a: number, mu: number): number {
  return TWO_PI * Math.sqrt(a ** 3 / mu)
}

/** Classify a state vector and compute its derived properties. */
export function classify(r: Vec3, v: Vec3, mu: number): OrbitProperties {
  const el = rvToElements(r, v, mu)
  const { e, p, h } = el
  const energy = dot(v, v) / 2 - mu / norm(r)

  let conic: ConicType
  if (Math.abs(e - 1) < PARABOLIC_ECC_TOL) conic = 'parabolic'
  else if (e < ECC_CIRCULAR_TOL) conic = 'circular'
  else if (e < 1) conic = 'elliptic'
  else conic = 'hyperbolic'

  const bound = conic === 'circular' || conic === 'elliptic'
  const a = conic === 'parabolic' ? Infinity : -mu / (2 * energy)
  const period = bound ? orbitalPeriod(a, mu) : Infinity
  // periapsis = p/(1+e) is robust for every conic; apoapsis is finite only when bound.
  const periapsis = p / (1 + e)
  const apoapsis = bound ? p / (1 - e) : Infinity

  return { conic, a, e, p, h, energy, period, periapsis, apoapsis }
}
