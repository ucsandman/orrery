/**
 * Unit conversion helpers.
 *
 * The core works entirely in SI base units (metres, seconds, radians). These
 * functions exist only to convert at a boundary: when a caller supplies a value
 * in kilometres, degrees, days, or astronomical units, convert it to SI on the
 * way in, and convert back on the way out. Nothing inside the core stores a
 * non-SI number.
 *
 * Each pair is an exact inverse up to floating-point rounding, so a round trip
 * (for example `kmToM(mToKm(x))`) returns `x` to within a small relative
 * tolerance, which the tests check.
 */
import { AU_M, DAY_S } from './constants'

const DEG_PER_RAD = 180 / Math.PI
const RAD_PER_DEG = Math.PI / 180

/** Kilometres to metres. */
export function kmToM(km: number): number {
  return km * 1000
}

/** Metres to kilometres. */
export function mToKm(m: number): number {
  return m / 1000
}

/** Degrees to radians. */
export function degToRad(deg: number): number {
  return deg * RAD_PER_DEG
}

/** Radians to degrees. */
export function radToDeg(rad: number): number {
  return rad * DEG_PER_RAD
}

/** Days to seconds. */
export function dayToS(days: number): number {
  return days * DAY_S
}

/** Seconds to days. */
export function sToDay(seconds: number): number {
  return seconds / DAY_S
}

/** Astronomical units to metres. */
export function auToM(au: number): number {
  return au * AU_M
}

/** Metres to astronomical units. */
export function mToAu(m: number): number {
  return m / AU_M
}

/** Kilometres per second to metres per second. */
export function kmsToMs(kms: number): number {
  return kms * 1000
}

/** Metres per second to kilometres per second. */
export function msToKms(ms: number): number {
  return ms / 1000
}
