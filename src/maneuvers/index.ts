/**
 * Impulsive maneuver planning.
 *
 * A maneuver is a set of instantaneous velocity changes (burns). Each planner
 * returns an auditable list of named burns; the total delta-v is the exact sum
 * of the burn magnitudes, so a mission budget is always traceable to its parts.
 *
 * Speeds here are orbital speeds (scalars) computed from the vis-viva relation
 * v = sqrt(mu (2/r - 1/a)); radii and mu are in consistent units.
 */

/** A single impulsive burn: a name and the magnitude of its velocity change. */
export interface Burn {
  readonly name: string
  /** Magnitude of the velocity change (same units as the speeds). */
  readonly dv: number
}

/** A planned maneuver: its burns and the exact sum of their magnitudes. */
export interface Maneuver {
  readonly burns: readonly Burn[]
  readonly totalDv: number
}

/** Assemble a maneuver, computing totalDv as the exact ordered sum of magnitudes. */
function assemble(burns: Burn[]): Maneuver {
  let total = 0
  for (const b of burns) total += b.dv
  return { burns, totalDv: total }
}

/** Circular orbital speed at radius r. */
export function circularSpeed(r: number, mu: number): number {
  return Math.sqrt(mu / r)
}

/**
 * Hohmann transfer between two coplanar circular orbits of radii r1 and r2: one
 * burn onto the transfer ellipse at r1, one to circularize at r2.
 */
export function hohmann(r1: number, r2: number, mu: number): Maneuver {
  const vc1 = Math.sqrt(mu / r1)
  const vc2 = Math.sqrt(mu / r2)
  const aT = (r1 + r2) / 2
  const vPeri = Math.sqrt(mu * (2 / r1 - 1 / aT))
  const vApo = Math.sqrt(mu * (2 / r2 - 1 / aT))
  return assemble([
    { name: 'departure', dv: Math.abs(vPeri - vc1) },
    { name: 'arrival', dv: Math.abs(vc2 - vApo) },
  ])
}

/**
 * Bi-elliptic transfer between coplanar circular orbits via an intermediate
 * apoapsis radius rb (which must exceed both r1 and r2): raise onto the first
 * ellipse at r1, change ellipses at rb, circularize at r2.
 */
export function biElliptic(r1: number, r2: number, rb: number, mu: number): Maneuver {
  const vc1 = Math.sqrt(mu / r1)
  const vc2 = Math.sqrt(mu / r2)
  const a1 = (r1 + rb) / 2
  const a2 = (r2 + rb) / 2
  const dv1 = Math.abs(Math.sqrt(mu * (2 / r1 - 1 / a1)) - vc1)
  const dv2 = Math.abs(Math.sqrt(mu * (2 / rb - 1 / a2)) - Math.sqrt(mu * (2 / rb - 1 / a1)))
  const dv3 = Math.abs(Math.sqrt(mu * (2 / r2 - 1 / a2)) - vc2)
  return assemble([
    { name: 'departure', dv: dv1 },
    { name: 'raise', dv: dv2 },
    { name: 'circularize', dv: dv3 },
  ])
}

/**
 * Pure plane change of inclination angle `inc` (rad) at orbital speed v, with no
 * change of speed: delta-v = 2 v sin(inc/2). A zero plane change costs zero and
 * never touches a square root.
 */
export function planeChange(v: number, inc: number): Maneuver {
  return assemble([{ name: 'plane change', dv: 2 * v * Math.abs(Math.sin(inc / 2)) }])
}

/**
 * Combined burn that changes speed from v1 to v2 and rotates the velocity by
 * inclination `inc` in a single impulse. Uses the cancellation-free identity
 * v1^2 + v2^2 - 2 v1 v2 cos(inc) = (v1 - v2)^2 + 4 v1 v2 sin^2(inc/2), whose
 * argument is a sum of non-negative terms, so the square root is never fed a
 * negative value even when cos(inc) is near 1.
 */
export function combinedPlaneChange(v1: number, v2: number, inc: number): Maneuver {
  const half = Math.sin(inc / 2)
  const dv = Math.sqrt((v1 - v2) ** 2 + 4 * v1 * v2 * half * half)
  return assemble([{ name: 'combined', dv }])
}

// --- Bi-elliptic vs Hohmann recommendation -------------------------------------
// Non-dimensional delta-v (units of the inner circular speed), with R = r2/r1
// and the intermediate apoapsis rb in units of r1.

function hohmannNondim(R: number): number {
  return Math.sqrt((2 * R) / (1 + R)) - 1 + (1 / Math.sqrt(R)) * (1 - Math.sqrt(2 / (1 + R)))
}

function biEllipticNondim(R: number, rb: number): number {
  const a1 = (1 + rb) / 2
  const a2 = (R + rb) / 2
  const dv1 = Math.sqrt(2 - 1 / a1) - 1
  const dv2 = Math.sqrt(2 / rb - 1 / a2) - Math.sqrt(2 / rb - 1 / a1)
  const dv3 = Math.sqrt(2 / R - 1 / a2) - Math.sqrt(1 / R)
  return dv1 + dv2 + dv3
}

/** Bi-elliptic delta-v in the limit rb -> infinity (units of the inner circular speed). */
function biEllipticLimitNondim(R: number): number {
  return (Math.SQRT2 - 1) * (1 + 1 / Math.sqrt(R))
}

/** Bisection for a sign-changing function on [lo, hi]. */
function bisect(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo
  let b = hi
  const fa = f(a)
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2
    const fm = f(m)
    if (fa * fm <= 0) b = m
    else a = m
    if (b - a < 1e-12) break
  }
  return (a + b) / 2
}

/**
 * Lower ratio R = r2/r1 at which the recommendation first admits the bi-elliptic
 * transfer: the radius ratio where the rb -> infinity bi-elliptic delta-v equals
 * the Hohmann delta-v. Below it the Hohmann transfer is always cheaper. Computed,
 * not transcribed; it evaluates to about 11.94.
 */
export function biEllipticLowerRatio(): number {
  return bisect((R) => biEllipticLimitNondim(R) - hohmannNondim(R), 5, 25)
}

/**
 * Upper ratio R = r2/r1 above which the bi-elliptic transfer is cheaper for any
 * intermediate apoapsis: the radius ratio where the bi-elliptic delta-v gradient
 * with respect to rb, evaluated at rb = r2, turns negative. Computed, not
 * transcribed; it evaluates to about 15.58.
 */
export function biEllipticUpperRatio(): number {
  const gradientAtR2 = (R: number): number => {
    const h = 1e-4 * R
    return (biEllipticNondim(R, R + h) - biEllipticNondim(R, R - h)) / (2 * h)
  }
  return bisect((R) => -gradientAtR2(R), 12, 20)
}

/** Which transfer is recommended for a radius ratio R = r2/r1. */
export type TransferRecommendation = 'hohmann' | 'conditional' | 'bielliptic'

/**
 * Recommend a transfer for the radius ratio R = r2/r1: Hohmann below the lower
 * ratio, bi-elliptic above the upper ratio, and conditional (depends on the
 * intermediate apoapsis) between them.
 */
export function recommendTransfer(R: number): TransferRecommendation {
  if (R < biEllipticLowerRatio()) return 'hohmann'
  if (R > biEllipticUpperRatio()) return 'bielliptic'
  return 'conditional'
}
