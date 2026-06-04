/**
 * Time handling for the core.
 *
 * The base time coordinate is seconds from the J2000.0 epoch in Terrestrial
 * Time (TT), a uniform timescale with no leap seconds. Leap seconds and civil
 * time zones are a boundary concern handled outside the core.
 *
 * Julian Date (JD) is the standard astronomical day count. Near the present a
 * JD is about 2.45e6, so a single float64 JD has only about 30 microseconds of
 * resolution: subtracting two nearby JDs loses precision (catastrophic
 * cancellation). To avoid that, a JD is carried as two parts, an integer day
 * count and a fraction in the half-open interval [0, 1). The integer part is an
 * exact whole number well below 2^53, and the fraction keeps full double
 * precision, so converting back to seconds is accurate to well under a
 * microsecond across centuries.
 *
 * Simulation time is never accumulated as a running `t += dt` sum (which would
 * drift). It is always `stepIndex * dt` computed by a single multiply, so the
 * same scene after the same number of steps yields the same time exactly.
 */
import { DAY_S, J2000_JD } from './constants'

/** A Julian Date split into an exact integer part and a fraction in [0, 1). */
export interface SplitJulianDate {
  /** Whole-number Julian Date part. Exact for any epoch within +/- millennia. */
  readonly jdInteger: number
  /** Fractional day, in [0, 1). Carries the sub-day precision. */
  readonly jdFraction: number
}

/**
 * Convert seconds from J2000 (TT) to a split Julian Date.
 *
 * The whole and fractional days are separated before adding the large J2000
 * offset, so the offset is only ever added to an integer. This keeps the
 * fraction at full precision instead of letting it be swamped by the ~2.45e6
 * magnitude of the integer JD.
 */
export function secondsToSplitJD(secondsFromJ2000: number): SplitJulianDate {
  const totalDays = secondsFromJ2000 / DAY_S
  let wholeDays = Math.floor(totalDays)
  let fracDays = totalDays - wholeDays
  // For a tiny negative input, totalDays - floor(totalDays) can round up to
  // exactly 1.0; carry that into the integer day so the fraction stays in [0, 1).
  if (fracDays >= 1) {
    fracDays = 0
    wholeDays += 1
  }
  return { jdInteger: J2000_JD + wholeDays, jdFraction: fracDays }
}

/**
 * Convert a split Julian Date back to seconds from J2000 (TT).
 *
 * The J2000 offset is subtracted from the integer part first (an exact
 * integer subtraction), so no precision is lost before scaling to seconds.
 */
export function splitJDToSeconds(jd: SplitJulianDate): number {
  const wholeDays = jd.jdInteger - J2000_JD
  return (wholeDays + jd.jdFraction) * DAY_S
}

/**
 * The Julian Date as a single number, for display or coarse use. This loses the
 * sub-day precision the split form preserves, so do not feed it back into a
 * difference of nearby dates.
 */
export function julianDate(secondsFromJ2000: number): number {
  const jd = secondsToSplitJD(secondsFromJ2000)
  return jd.jdInteger + jd.jdFraction
}

/**
 * Simulation time after `stepIndex` steps of size `dt` seconds. Computed as a
 * single multiply so that equal step counts give bit-identical times.
 */
export function simulationTime(stepIndex: number, dt: number): number {
  return stepIndex * dt
}
