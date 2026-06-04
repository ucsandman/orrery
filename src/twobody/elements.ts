/**
 * Classical orbital elements and the conversions to and from a state vector.
 *
 * A state vector is a position `r` and velocity `v` in an inertial frame plus
 * the gravitational parameter `mu` of the central body. Classical (Keplerian)
 * elements describe the same orbit as six geometric numbers:
 *
 * - a    semi-major axis: half the long axis of the ellipse (m). Infinity for a
 *        parabola, negative for a hyperbola.
 * - e    eccentricity: 0 a circle, between 0 and 1 an ellipse, 1 a parabola,
 *        above 1 a hyperbola (dimensionless).
 * - i    inclination: tilt of the orbit plane from the reference (x-y) plane,
 *        in [0, pi] (rad).
 * - raan right ascension of the ascending node: where the orbit crosses the
 *        reference plane going up, measured in that plane (rad).
 * - argp argument of periapsis: angle in the orbit plane from the ascending node
 *        to the closest point (rad).
 * - nu   true anomaly: angle in the orbit plane from periapsis to the body (rad).
 *
 * Two geometries make some of these angles undefined, and naively computing them
 * yields NaN from a zero-magnitude denominator. They are reported instead with a
 * discriminated tag and a substitute angle, so a degenerate orbit is explicit,
 * never a silent NaN:
 *
 * - circular (e ~ 0, inclined): periapsis is undefined; use the argument of
 *   latitude, the angle from the ascending node to the body.
 * - equatorial (i ~ 0 or pi, eccentric): the node is undefined; use the true
 *   longitude of periapsis, the angle from the x-axis to periapsis.
 * - circular-equatorial: both undefined; use the true longitude, the angle from
 *   the x-axis to the body.
 */
import { TWO_PI } from '../core/constants'
import {
  type Vec3, vec3, sub, scale, dot, cross, norm,
} from '../core/vec3'
import { rotationX, rotationZ, multiply, apply } from '../core/mat3'

/**
 * Below this eccentricity the orbit is treated as circular: the eccentricity
 * vector is numerically indistinguishable from zero, so periapsis has no
 * meaningful direction. A well-conditioned orbit (e >= 0.01) is far clear of it.
 */
export const ECC_CIRCULAR_TOL = 1e-8

/**
 * Below this value of sin(i) the orbit is treated as equatorial: the node
 * vector (k cross h, whose magnitude is h sin i) is numerically zero, so the
 * ascending node has no meaningful direction.
 */
export const SIN_INC_EQUATORIAL_TOL = 1e-8

/** Shared scalar fields every reported element set carries. */
interface CommonElements {
  /** Semi-major axis (m); Infinity for a parabola, negative for a hyperbola. */
  readonly a: number
  /** Eccentricity (dimensionless). */
  readonly e: number
  /** Inclination in [0, pi] (rad). */
  readonly i: number
  /** Semi-latus rectum p = h^2 / mu (m); finite and positive for every conic. */
  readonly p: number
  /** Specific angular momentum magnitude h = |r x v| (m^2 / s). */
  readonly h: number
}

/** Fully determined orbit: node and periapsis both defined. */
export interface ClassicalElements extends CommonElements {
  readonly kind: 'classical'
  readonly raan: number
  readonly argp: number
  readonly nu: number
}

/** Circular and inclined: periapsis undefined, reported by argument of latitude. */
export interface CircularElements extends CommonElements {
  readonly kind: 'circular'
  readonly raan: number
  /** Argument of latitude: angle from the ascending node to the body (rad). */
  readonly argLat: number
}

/** Eccentric and equatorial: node undefined, reported by true longitude of periapsis. */
export interface EquatorialElements extends CommonElements {
  readonly kind: 'equatorial'
  /** True longitude of periapsis: angle from the x-axis to periapsis (rad). */
  readonly lonPeri: number
  readonly nu: number
}

/** Circular and equatorial: node and periapsis undefined, reported by true longitude. */
export interface CircularEquatorialElements extends CommonElements {
  readonly kind: 'circular-equatorial'
  /** True longitude: angle from the x-axis to the body (rad). */
  readonly trueLon: number
}

/** The discriminated union of every element case. The `kind` tag is exhaustive. */
export type OrbitElements =
  | ClassicalElements
  | CircularElements
  | EquatorialElements
  | CircularEquatorialElements

/** Wrap an angle into [0, 2pi). */
function wrapTwoPi(angle: number): number {
  const a = angle % TWO_PI
  return a < 0 ? a + TWO_PI : a
}

/**
 * Angle from `u` to `w` measured in the orbit plane about the angular-momentum
 * direction `axis` (magnitude `axisMag`), returned in [0, 2pi). Built from atan2
 * of the sine and cosine parts, so it is well-conditioned at every angle,
 * including 0 and pi where an acos of a near-unit cosine would lose half its
 * digits. The 1 / (|u| |w|) scale common to both parts cancels inside atan2.
 */
function angleAbout(u: Vec3, w: Vec3, axis: Vec3, axisMag: number): number {
  const sinPart = dot(cross(u, w), axis) / axisMag
  const cosPart = dot(u, w)
  return wrapTwoPi(Math.atan2(sinPart, cosPart))
}

/**
 * State vector to classical elements. Detects degenerate geometry and reports it
 * with a discriminated tag and the appropriate substitute angle. Never returns
 * NaN: inclination and every in-plane angle come from atan2, and every undefined
 * angle is replaced by its substitute rather than divided by zero.
 */
export function rvToElements(r: Vec3, v: Vec3, mu: number): OrbitElements {
  const rMag = norm(r)
  const vMag = norm(v)
  const rv = dot(r, v) // = r * radial speed
  const hVec = cross(r, v)
  const h = norm(hVec)
  // Node vector n = k x h, with k = (0, 0, 1). Its magnitude is h sin(i).
  const nVec = vec3(-hVec.y, hVec.x, 0)
  const n = norm(nVec)
  // Eccentricity vector: points at periapsis, magnitude e.
  const eVec = scale(
    sub(scale(r, vMag * vMag - mu / rMag), scale(v, rv)),
    1 / mu,
  )
  const e = norm(eVec)
  const energy = (vMag * vMag) / 2 - mu / rMag
  const a = energy === 0 ? Infinity : -mu / (2 * energy)
  const p = (h * h) / mu
  // i = atan2(|h_xy|, h_z) keeps full precision at i near 0 and pi; n = |h_xy|.
  const i = Math.atan2(n, hVec.z)

  const common: CommonElements = { a, e, i, p, h }
  const circular = e < ECC_CIRCULAR_TOL
  const equatorial = n / h < SIN_INC_EQUATORIAL_TOL

  if (circular && equatorial) {
    return { ...common, kind: 'circular-equatorial', trueLon: wrapTwoPi(Math.atan2(r.y, r.x)) }
  }
  if (circular) {
    const raan = wrapTwoPi(Math.atan2(nVec.y, nVec.x))
    const argLat = angleAbout(nVec, r, hVec, h)
    return { ...common, kind: 'circular', raan, argLat }
  }
  if (equatorial) {
    const lonPeri = wrapTwoPi(Math.atan2(eVec.y, eVec.x))
    const nu = angleAbout(eVec, r, hVec, h)
    return { ...common, kind: 'equatorial', lonPeri, nu }
  }
  const raan = wrapTwoPi(Math.atan2(nVec.y, nVec.x))
  const argp = angleAbout(nVec, eVec, hVec, h)
  const nu = angleAbout(eVec, r, hVec, h)
  return { ...common, kind: 'classical', raan, argp, nu }
}

/**
 * Classical elements to a state vector. Builds the position and velocity in the
 * perifocal frame (x toward periapsis, z along angular momentum) from the conic
 * equation, then rotates into the inertial frame by R = Rz(raan) Rx(i) Rz(argp).
 *
 * Valid for ellipses and hyperbolas (a finite and nonzero). The semi-latus
 * rectum p = a (1 - e^2) is positive in both cases.
 */
export function coeToRv(
  a: number,
  e: number,
  i: number,
  raan: number,
  argp: number,
  nu: number,
  mu: number,
): { r: Vec3; v: Vec3 } {
  const p = a * (1 - e * e)
  const cosNu = Math.cos(nu)
  const sinNu = Math.sin(nu)
  const rPf = scale(vec3(cosNu, sinNu, 0), p / (1 + e * cosNu))
  const vPf = scale(vec3(-sinNu, e + cosNu, 0), Math.sqrt(mu / p))
  const rotation = multiply(rotationZ(raan), multiply(rotationX(i), rotationZ(argp)))
  return { r: apply(rotation, rPf), v: apply(rotation, vPf) }
}
