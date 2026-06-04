/**
 * Physical constants for the Orrery core.
 *
 * Rules for this module:
 * - Single source of truth for every physical number.
 * - SI base units only: metres (m), seconds (s), kilograms (kg), radians (rad),
 *   and the gravitational parameter mu in m^3 s^-2.
 * - This module imports nothing. Constants never depend on other code.
 * - A gravitational parameter (mu, the product of G and a mass) is stored as a
 *   primitive value, never recomputed by multiplying G by a mass, because the
 *   product of two measured numbers is far less accurate than a directly
 *   measured mu.
 * - Each export carries its value, unit, source, and a verified flag in JSDoc.
 *   `verified: true` means the number is a real published value the author has
 *   checked against the cited source. `verified: false` means it still needs
 *   confirmation before any test asserts against it.
 */

/**
 * Newtonian gravitational constant G.
 * unit: m^3 kg^-1 s^-2
 * source: CODATA 2018, 6.67430(15)e-11 (relative uncertainty 2.2e-5)
 * verified: true
 */
export const G = 6.6743e-11

/**
 * Astronomical unit: the defined mean Earth-Sun distance.
 * unit: m (exact by definition)
 * source: IAU 2012 Resolution B2
 * verified: true
 */
export const AU_M = 149597870700

/**
 * One day.
 * unit: s (exact)
 * source: SI definition, used by the Julian date conventions below
 * verified: true
 */
export const DAY_S = 86400

/**
 * One Julian year.
 * unit: s (exact: 365.25 days)
 * source: IAU Julian year definition
 * verified: true
 */
export const JULIAN_YEAR_S = 365.25 * DAY_S

/**
 * J2000.0 standard epoch, expressed as a Julian Date in Terrestrial Time.
 * This is 2000-01-01 12:00:00 TT (noon), the zero point for `secondsFromJ2000`.
 * unit: Julian Date (TT)
 * source: IAU standard epoch
 * verified: true
 */
export const J2000_JD = 2451545.0

/**
 * Standard gravitational parameter of the Sun (mu = G times solar mass).
 * unit: m^3 s^-2
 * source: JPL DE440 (Park et al. 2021, AJ 161:105), 132712440041.279419 km^3 s^-2
 * verified: true
 * note: The IAU 2009 value is 1.32712440018e20. The core standardises on DE440.
 */
export const MU_SUN = 1.32712440041279419e20

/**
 * Standard gravitational parameter of the Earth.
 * unit: m^3 s^-2
 * source: JPL DE440 (Park et al. 2021), body 399, 398600.435507 km^3 s^-2
 * verified: true
 */
export const MU_EARTH = 3.98600435507e14

/**
 * Standard gravitational parameter of the Moon.
 * unit: m^3 s^-2
 * source: JPL DE440 (Park et al. 2021), body 301, 4902.800118 km^3 s^-2
 * verified: true
 */
export const MU_MOON = 4.902800118e12

/**
 * Standard gravitational parameter of the Mars system (planet plus moons).
 * unit: m^3 s^-2
 * source: JPL DE440 (Park et al. 2021), body 4 (Mars barycenter), 42828.375816 km^3 s^-2
 * verified: false
 * note: This is the system value. The planet-only value (body 499) differs.
 *   Confirm which is intended before any test asserts against it.
 */
export const MU_MARS_SYSTEM = 4.2828375816e13

/**
 * Earth to Moon mass ratio (EMRAT).
 * unit: dimensionless
 * source: JPL DE440 (Park et al. 2021), constant EMRAT
 * verified: true
 * note: The circular restricted three-body mass parameter for the Earth-Moon
 *   system is computed in code as 1 / (1 + EMRAT), never transcribed.
 */
export const EARTH_MOON_MASS_RATIO = 81.300568221497215

/** Two pi, provided so call sites do not re-multiply and risk a stray rounding. */
export const TWO_PI = 2 * Math.PI
