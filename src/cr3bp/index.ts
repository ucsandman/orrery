/**
 * Circular restricted three-body problem (CR3BP).
 *
 * A massless body moves under two primaries on circular orbits about their
 * barycenter. Working in the co-rotating, nondimensional frame: total mass 1,
 * separation 1, angular velocity 1. The mass parameter mu is the smaller body's
 * mass fraction, in (0, 1); by convention mu <= 1/2. The larger primary (mass
 * 1 - mu) sits at x = -mu, the smaller (mass mu) at x = 1 - mu.
 *
 * The motion has one conserved quantity, the Jacobi constant C = 2 Omega - v^2,
 * and five equilibria (Lagrange points). The effective potential is
 *   Omega = (1/2)(x^2 + y^2) + (1 - mu)/r1 + mu/r2
 * with r1, r2 the distances to the two primaries.
 *
 * Integration uses the canonical Hamiltonian split: the rotation-plus-kinetic
 * part has an exact linear flow, and the gravity part is a momentum kick. The
 * resulting second-order symplectic (leapfrog) keeps the canonical Hamiltonian,
 * and hence C = -2H, bounded with no secular drift.
 */
import { type Vec3, vec3 } from '../core/vec3'
import { MU_SUN, MU_EARTH, MU_MOON, EARTH_MOON_MASS_RATIO } from '../core/constants'

/** Distance below which the test point is treated as coincident with a primary. */
const PRIMARY_EPS = 1e-12

/** The Earth-Moon mass parameter, computed as 1 / (1 + EMRAT). */
export function earthMoonMassParameter(): number {
  return 1 / (1 + EARTH_MOON_MASS_RATIO)
}

/**
 * The Sun-Earth mass parameter. Documented choice: the second primary is the
 * Earth-Moon barycenter, so mu = (GM_earth + GM_moon) / (GM_sun + GM_earth +
 * GM_moon), recomputed here from the gravitational parameters (never
 * transcribed). This evaluates to about 3.0404e-6 (the barycenter value), as
 * opposed to about 3.0035e-6 for Earth alone.
 */
export function sunEarthMassParameter(): number {
  return (MU_EARTH + MU_MOON) / (MU_SUN + MU_EARTH + MU_MOON)
}

function assertValidMu(mu: number): void {
  if (!(mu > 0 && mu < 1)) {
    throw new RangeError(`CR3BP mass parameter must be in (0, 1), got ${mu}`)
  }
}

/** Distances and signed x-offsets to the two primaries. */
function geometry(x: number, y: number, z: number, mu: number) {
  const dx1 = x + mu // offset from larger primary at -mu
  const dx2 = x - (1 - mu) // offset from smaller primary at 1 - mu
  const r1 = Math.sqrt(dx1 * dx1 + y * y + z * z)
  const r2 = Math.sqrt(dx2 * dx2 + y * y + z * z)
  return { dx1, dx2, r1, r2 }
}

/**
 * Effective (pseudo) potential Omega at a point. Throws if the point lies on a
 * primary (where the potential is singular), so a singular evaluation fails loud
 * instead of returning a silent NaN or Infinity.
 */
export function effectivePotential(pos: Vec3, mu: number): number {
  assertValidMu(mu)
  const { r1, r2 } = geometry(pos.x, pos.y, pos.z, mu)
  if (r1 < PRIMARY_EPS || r2 < PRIMARY_EPS) {
    throw new RangeError('CR3BP effective potential is singular on a primary')
  }
  return 0.5 * (pos.x * pos.x + pos.y * pos.y) + (1 - mu) / r1 + mu / r2
}

/** Gradient of the effective potential, grad Omega. Throws on a primary. */
export function effectivePotentialGradient(pos: Vec3, mu: number): Vec3 {
  assertValidMu(mu)
  const { dx1, dx2, r1, r2 } = geometry(pos.x, pos.y, pos.z, mu)
  if (r1 < PRIMARY_EPS || r2 < PRIMARY_EPS) {
    throw new RangeError('CR3BP effective potential gradient is singular on a primary')
  }
  const r1c = r1 * r1 * r1
  const r2c = r2 * r2 * r2
  const gx = pos.x - ((1 - mu) * dx1) / r1c - (mu * dx2) / r2c
  const gy = pos.y - ((1 - mu) * pos.y) / r1c - (mu * pos.y) / r2c
  const gz = -((1 - mu) * pos.z) / r1c - (mu * pos.z) / r2c
  return vec3(gx, gy, gz)
}

/**
 * Jacobi constant C = 2 Omega - v^2, with v the speed in the rotating frame.
 * Throws on a primary (via the effective potential).
 */
export function jacobiConstant(pos: Vec3, vel: Vec3, mu: number): number {
  const omega = effectivePotential(pos, mu)
  return 2 * omega - (vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
}

/** The five Lagrange point positions (z = 0). */
export interface LagrangePoints {
  readonly L1: Vec3
  readonly L2: Vec3
  readonly L3: Vec3
  readonly L4: Vec3
  readonly L5: Vec3
}

/** Solve dOmega/dx = 0 along y = z = 0 in one collinear region by Newton. */
function solveCollinear(
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  name: string,
): number {
  let x = x0
  for (let i = 0; i < 100; i++) {
    const fx = f(x)
    if (Math.abs(fx) <= 1e-13) return x
    const step = fx / df(x)
    x -= step
    if (!Number.isFinite(x)) break
  }
  if (Math.abs(f(x)) <= 1e-13) return x
  throw new RangeError(`CR3BP collinear point ${name} did not converge`)
}

/**
 * The five Lagrange points for mass parameter mu. L4 and L5 are the exact
 * equilateral points (1/2 - mu, +/- sqrt(3)/2). The collinear points L1, L2, L3
 * are solved from dOmega/dx = 0 in their respective regions, each driven to an
 * equilibrium residual at or below 1e-13.
 */
export function lagrangePoints(mu: number): LagrangePoints {
  assertValidMu(mu)
  const gamma = (mu / 3) ** (1 / 3) // Hill-radius scale for the guesses

  // L1: between the primaries, -mu < x < 1 - mu.
  const x1 = solveCollinear(
    (x) => x - (1 - mu) / (x + mu) ** 2 + mu / (1 - mu - x) ** 2,
    (x) => 1 + (2 * (1 - mu)) / (x + mu) ** 3 + (2 * mu) / (1 - mu - x) ** 3,
    1 - mu - gamma,
    'L1',
  )
  // L2: beyond the smaller primary, x > 1 - mu.
  const x2 = solveCollinear(
    (x) => x - (1 - mu) / (x + mu) ** 2 - mu / (x - (1 - mu)) ** 2,
    (x) => 1 + (2 * (1 - mu)) / (x + mu) ** 3 + (2 * mu) / (x - (1 - mu)) ** 3,
    1 - mu + gamma,
    'L2',
  )
  // L3: beyond the larger primary, x < -mu.
  const x3 = solveCollinear(
    (x) => x + (1 - mu) / (x + mu) ** 2 + mu / (x - (1 - mu)) ** 2,
    (x) => 1 - (2 * (1 - mu)) / (x + mu) ** 3 - (2 * mu) / (x - (1 - mu)) ** 3,
    -(1 + (5 / 12) * mu),
    'L3',
  )

  const sqrt3over2 = Math.sqrt(3) / 2
  return {
    L1: vec3(x1, 0, 0),
    L2: vec3(x2, 0, 0),
    L3: vec3(x3, 0, 0),
    L4: vec3(0.5 - mu, sqrt3over2, 0),
    L5: vec3(0.5 - mu, -sqrt3over2, 0),
  }
}

// --- Rotating-frame propagation (canonical symplectic leapfrog) ----------------

/** A rotating-frame state: position and velocity (both in the rotating frame). */
export interface RotatingState {
  readonly pos: Vec3
  readonly vel: Vec3
}

/** Gradient of the gravitational potential U = (1-mu)/r1 + mu/r2 only. */
function gravityGradient(x: number, y: number, z: number, mu: number): Vec3 {
  const { dx1, dx2, r1, r2 } = geometry(x, y, z, mu)
  if (r1 < PRIMARY_EPS || r2 < PRIMARY_EPS) {
    throw new RangeError('CR3BP gravity is singular on a primary')
  }
  const r1c = r1 * r1 * r1
  const r2c = r2 * r2 * r2
  return vec3(
    -((1 - mu) * dx1) / r1c - (mu * dx2) / r2c,
    -((1 - mu) * y) / r1c - (mu * y) / r2c,
    -((1 - mu) * z) / r1c - (mu * z) / r2c,
  )
}

/**
 * Propagate a rotating-frame state with the canonical symplectic leapfrog. The
 * gravity kick (half step), the exact rotation-plus-kinetic drift (full step),
 * and a second gravity kick (half step) compose one step. Returns the sampled
 * trajectory including the initial state.
 */
export function propagateRotating(
  initial: RotatingState,
  mu: number,
  dt: number,
  steps: number,
  sampleEvery: number,
): RotatingState[] {
  assertValidMu(mu)
  let x = initial.pos.x
  let y = initial.pos.y
  let z = initial.pos.z
  // Canonical momenta: px = vx - y, py = vy + x, pz = vz.
  let px = initial.vel.x - y
  let py = initial.vel.y + x
  let pz = initial.vel.z

  const out: RotatingState[] = []
  const record = (): void => {
    out.push({ pos: vec3(x, y, z), vel: vec3(px + y, py - x, pz) })
  }
  record()

  const c = Math.cos(dt)
  const s = Math.sin(dt)
  const half = dt / 2
  for (let n = 1; n <= steps; n++) {
    // Gravity kick, half step.
    let g = gravityGradient(x, y, z, mu)
    px += half * g.x
    py += half * g.y
    pz += half * g.z
    // Exact drift of the rotation-plus-kinetic part, full step.
    const a = x + px * dt
    const b = y + py * dt
    const nx = a * c + b * s
    const ny = b * c - a * s
    const npx = px * c + py * s
    const npy = py * c - px * s
    x = nx
    y = ny
    z = z + pz * dt
    px = npx
    py = npy
    // Gravity kick, half step.
    g = gravityGradient(x, y, z, mu)
    px += half * g.x
    py += half * g.y
    pz += half * g.z
    if (n % sampleEvery === 0) record()
  }
  return out
}
