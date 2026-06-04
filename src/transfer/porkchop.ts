/**
 * Deterministic porkchop scan.
 *
 * A porkchop plot scans a grid of departure and arrival dates and, for each
 * feasible pair, solves the heliocentric Lambert arc to find the launch energy
 * (characteristic energy C3 = v_infinity_departure squared) and the arrival
 * hyperbolic excess speed. The cheap launch windows show up as the closed
 * contours that give the plot its name.
 *
 * The scan is deterministic: the same ephemerides and grids produce
 * byte-identical result arrays on every run. Grid cells whose arrival does not
 * follow departure (non-positive flight time) are masked and never handed to the
 * Lambert solver.
 */
import { type Ephemeris } from './ephemeris'
import { transferArc } from './patchedconic'
import { type LambertOptions } from '../lambert/bmw'

/** Departure and arrival sample times, in seconds from the ephemeris epoch. */
export interface PorkchopGrid {
  readonly departureTimes: readonly number[]
  readonly arrivalTimes: readonly number[]
}

/** Result of a porkchop scan, row-major over [departure index, arrival index]. */
export interface PorkchopResult {
  readonly nDeparture: number
  readonly nArrival: number
  /** Characteristic energy C3 = v_infinity_departure^2 per cell; 0 where masked. */
  readonly c3: Float64Array
  /** Arrival hyperbolic excess speed per cell; 0 where masked. */
  readonly vInfArrive: Float64Array
  /** 1 where a transfer was solved, 0 where the cell was masked or rejected. */
  readonly feasible: Uint8Array
}

/**
 * Scan a departure/arrival grid between two ephemerides. A cell whose flight
 * time is non-positive is masked (feasible 0) and the Lambert solver is never
 * called for it. A geometry the solver rejects (for example collinear positions)
 * is also marked infeasible rather than aborting the whole scan.
 */
export function porkchopScan(
  departure: Ephemeris,
  arrival: Ephemeris,
  grid: PorkchopGrid,
  muSun: number,
  options: LambertOptions = {},
): PorkchopResult {
  const nDeparture = grid.departureTimes.length
  const nArrival = grid.arrivalTimes.length
  const c3 = new Float64Array(nDeparture * nArrival)
  const vInfArrive = new Float64Array(nDeparture * nArrival)
  const feasible = new Uint8Array(nDeparture * nArrival)

  for (let d = 0; d < nDeparture; d++) {
    const tDep = grid.departureTimes[d]!
    for (let a = 0; a < nArrival; a++) {
      const tArr = grid.arrivalTimes[a]!
      const idx = d * nArrival + a
      const tof = tArr - tDep
      if (tof <= 0) continue // masked: feasible stays 0, no Lambert call
      const dep = departure.stateAt(tDep)
      const arr = arrival.stateAt(tArr)
      try {
        const arc = transferArc(dep.r, dep.v, arr.r, arr.v, tof, muSun, options)
        c3[idx] = arc.vInfDepart * arc.vInfDepart
        vInfArrive[idx] = arc.vInfArrive
        feasible[idx] = 1
      } catch {
        // Degenerate geometry: leave the cell masked.
      }
    }
  }

  return { nDeparture, nArrival, c3, vInfArrive, feasible }
}
