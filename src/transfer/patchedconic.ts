/**
 * Patched-conic interplanetary transfer.
 *
 * An interplanetary trajectory is approximated by patching two-body arcs: a
 * heliocentric Lambert arc between the two planets, joined to departure and
 * arrival hyperbolas inside each planet's sphere of influence (the region where
 * that planet's gravity dominates the Sun's).
 *
 * - Sphere of influence: r_SOI = a_planet (m_planet / m_sun)^(2/5), with the mass
 *   ratio taken as the ratio of gravitational parameters.
 * - Hyperbolic excess speed (v-infinity): the speed of the spacecraft relative to
 *   a planet once it is far outside the planet's gravity, equal to the magnitude
 *   of the heliocentric transfer velocity minus the planet's velocity.
 * - Departure delta-v: the burn from a circular parking orbit onto the departure
 *   hyperbola, sqrt(v_inf^2 + 2 mu/rp) - sqrt(mu/rp).
 */
import { type Vec3, sub, norm } from '../core/vec3'
import { lambertBMW, type LambertOptions } from '../lambert/bmw'

/**
 * Sphere-of-influence radius of a planet on a heliocentric orbit of semi-major
 * axis `aPlanet`, given the planet and Sun gravitational parameters.
 */
export function sphereOfInfluence(aPlanet: number, muPlanet: number, muSun: number): number {
  return aPlanet * (muPlanet / muSun) ** (2 / 5)
}

/** A heliocentric transfer arc and the resulting hyperbolic excess speeds. */
export interface TransferArc {
  /** Heliocentric departure velocity of the spacecraft. */
  readonly vDepart: Vec3
  /** Heliocentric arrival velocity of the spacecraft. */
  readonly vArrive: Vec3
  /** Hyperbolic excess speed at departure (relative to the departure planet). */
  readonly vInfDepart: number
  /** Hyperbolic excess speed at arrival (relative to the arrival planet). */
  readonly vInfArrive: number
}

/**
 * Solve the heliocentric Lambert arc between two planet states and return the
 * spacecraft velocities and the departure and arrival hyperbolic excess speeds.
 * `vDepartPlanet` and `vArrivePlanet` are the planets' heliocentric velocities.
 */
export function transferArc(
  rDepart: Vec3,
  vDepartPlanet: Vec3,
  rArrive: Vec3,
  vArrivePlanet: Vec3,
  tof: number,
  muSun: number,
  options: LambertOptions = {},
): TransferArc {
  const { v1, v2 } = lambertBMW(rDepart, rArrive, tof, muSun, options)
  return {
    vDepart: v1,
    vArrive: v2,
    vInfDepart: norm(sub(v1, vDepartPlanet)),
    vInfArrive: norm(sub(v2, vArrivePlanet)),
  }
}

/**
 * Delta-v to depart onto a hyperbola with the given excess speed from a circular
 * parking orbit of radius `rPark` about a planet of gravitational parameter
 * `muPlanet`. The hyperbolic speed at periapsis is sqrt(v_inf^2 + 2 mu/rp); the
 * burn is its difference from the circular speed.
 */
export function departureDeltaV(vInf: number, rPark: number, muPlanet: number): number {
  const vHyperbola = Math.sqrt(vInf * vInf + (2 * muPlanet) / rPark)
  const vCircular = Math.sqrt(muPlanet / rPark)
  return vHyperbola - vCircular
}
