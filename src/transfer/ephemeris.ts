/**
 * Ephemeris interface and a deterministic Keplerian model.
 *
 * An ephemeris gives a body's heliocentric state (position and velocity) as a
 * function of time. The patched-conic transfer and the porkchop scan need planet
 * states at many dates. The core model here is purely deterministic: a body on a
 * fixed two-body orbit about the Sun, propagated from a single epoch state with
 * the universal-variable propagator. No clock, no file, no randomness.
 */
import { type Vec3 } from '../core/vec3'
import { propagateUniversal } from '../twobody/kepler'
import { coeToRv } from '../twobody/elements'
import { danby } from '../numeric/rootfind'
import { J2000_JD } from '../core/constants'

/** A heliocentric state: position (m) and velocity (m/s). */
export interface BodyState {
  readonly r: Vec3
  readonly v: Vec3
}

/** A source of body states over time. Time is seconds from a fixed epoch. */
export interface Ephemeris {
  stateAt(timeSeconds: number): BodyState
}

/**
 * A deterministic Keplerian ephemeris: the body moves on the fixed two-body
 * orbit defined by `epochState` at `epochTime`, propagated forward or backward
 * with the universal-variable propagator. `mu` is the central body's
 * gravitational parameter.
 */
export function keplerEphemeris(epochState: BodyState, mu: number, epochTime = 0): Ephemeris {
  return {
    stateAt(timeSeconds: number): BodyState {
      const s = propagateUniversal(epochState.r, epochState.v, timeSeconds - epochTime, mu)
      return { r: s.r, v: s.v }
    },
  }
}

// --- Standish planetary ephemeris (Curtis Algorithm 8.1) -----------------------
//
// A planet's heliocentric state from a J2000 Keplerian element set and its
// centennial rates (Standish et al. 1992, Curtis Table 8.1), valid 1800 to 2050.
// Angles in the element set are in degrees; the rate of each angle is in arcsec
// per Julian century. This model works in km and km/s with mu_sun in km^3/s^2,
// the convention of Curtis Chapter 8.

/** Astronomical unit in km, the value Curtis Chapter 8 uses. */
export const AU_KM_CURTIS = 1.49597871e8

/** A planet's J2000 orbital elements and their per-century rates (Curtis Table 8.1). */
export interface PlanetElements {
  /** Semi-major axis (AU) and rate (AU/century). */
  readonly a: number
  readonly aRate: number
  /** Eccentricity and rate (1/century). */
  readonly e: number
  readonly eRate: number
  /** Inclination (deg) and rate (arcsec/century). */
  readonly inc: number
  readonly incRate: number
  /** Longitude of the ascending node (deg) and rate (arcsec/century). */
  readonly raan: number
  readonly raanRate: number
  /** Longitude of perihelion (deg) and rate (arcsec/century). */
  readonly lonPeri: number
  readonly lonPeriRate: number
  /** Mean longitude (deg) and rate (arcsec/century). */
  readonly meanLon: number
  readonly meanLonRate: number
}

/** Earth (Earth-Moon barycenter), Curtis Table 8.1. */
export const STANDISH_EARTH: PlanetElements = {
  a: 1.00000011, aRate: -0.00000005,
  e: 0.01671022, eRate: -0.00003804,
  inc: 0.00005, incRate: -46.94,
  raan: -11.26064, raanRate: -18228.25,
  lonPeri: 102.94719, lonPeriRate: 1198.28,
  meanLon: 100.46435, meanLonRate: 129597740.63,
}

/** Mars, Curtis Table 8.1. */
export const STANDISH_MARS: PlanetElements = {
  a: 1.52366231, aRate: -0.00007221,
  e: 0.09341233, eRate: 0.00011902,
  inc: 1.85061, incRate: -25.47,
  raan: 49.57854, raanRate: -1020.19,
  lonPeri: 336.04084, lonPeriRate: 1560.78,
  meanLon: 355.45332, meanLonRate: 68905103.78,
}

const DEG = Math.PI / 180

/** Reduce an angle in degrees to [0, 360). */
function reduce360(deg: number): number {
  const r = deg % 360
  return r < 0 ? r + 360 : r
}

/**
 * Heliocentric state of a planet at a Julian date, by Curtis Algorithm 8.1.
 * `auKm` is the astronomical unit in km and `muSun` the solar gravitational
 * parameter in km^3/s^2; the returned state is in km and km/s.
 */
export function planetStateAtJD(
  el: PlanetElements,
  jd: number,
  muSun: number,
  auKm: number = AU_KM_CURTIS,
): BodyState {
  const t = (jd - J2000_JD) / 36525 // Julian centuries past J2000
  const aKm = (el.a + el.aRate * t) * auKm
  const e = el.e + el.eRate * t
  const incDeg = reduce360(el.inc + (el.incRate / 3600) * t)
  const raanDeg = reduce360(el.raan + (el.raanRate / 3600) * t)
  const lonPeriDeg = reduce360(el.lonPeri + (el.lonPeriRate / 3600) * t)
  const meanLonDeg = reduce360(el.meanLon + (el.meanLonRate / 3600) * t)
  const argpDeg = reduce360(lonPeriDeg - raanDeg) // omega = lon.peri - RAAN
  const meanAnom = reduce360(meanLonDeg - lonPeriDeg) * DEG // M = L - lon.peri

  const eAnom = danby(
    (x) => x - e * Math.sin(x) - meanAnom,
    (x) => 1 - e * Math.cos(x),
    (x) => e * Math.sin(x),
    meanAnom,
  )
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eAnom / 2), Math.sqrt(1 - e) * Math.cos(eAnom / 2))
  return coeToRv(aKm, e, incDeg * DEG, raanDeg * DEG, argpDeg * DEG, nu, muSun)
}

/**
 * A deterministic Standish ephemeris for a planet. `stateAt` takes seconds from
 * the J2000 epoch and returns the heliocentric state in km and km/s.
 */
export function standishEphemeris(
  el: PlanetElements,
  muSun: number,
  auKm: number = AU_KM_CURTIS,
): Ephemeris {
  return {
    stateAt(timeSeconds: number): BodyState {
      return planetStateAtJD(el, J2000_JD + timeSeconds / 86400, muSun, auKm)
    },
  }
}
