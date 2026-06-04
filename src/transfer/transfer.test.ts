import { describe, it, expect } from 'vitest'
import {
  planetStateAtJD, standishEphemeris, keplerEphemeris,
  STANDISH_EARTH, STANDISH_MARS, AU_KM_CURTIS,
} from './ephemeris'
import { sphereOfInfluence, transferArc, departureDeltaV } from './patchedconic'
import { porkchopScan } from './porkchop'
import { MU_EARTH, MU_SUN, J2000_JD } from '../core/constants'
import { buffersEqual } from '../integrators/state'
import { closeTo } from '../../test/harness/closeTo'

// Curtis Chapter 8 gravitational parameters (km^3/s^2).
const MU_SUN_CURTIS = 1.327e11
const MU_EARTH_KM = 398600

describe('sphere of influence', () => {
  it('equals a_planet (mu_planet/mu_sun)^(2/5) to 1e-10 relative for Earth', () => {
    const aEarth = AU_KM_CURTIS // 1 AU
    const computed = sphereOfInfluence(aEarth, MU_EARTH_KM, MU_SUN_CURTIS)
    const formula = aEarth * (MU_EARTH_KM / MU_SUN_CURTIS) ** (2 / 5)
    expect(closeTo(computed, formula, { rtol: 1e-10 })).toBe(true)
    // Earth's SOI is about 925,000 km.
    expect(computed).toBeGreaterThan(9.0e5)
    expect(computed).toBeLessThan(9.4e5)
  })

  it('uses SI consistently when given SI inputs', () => {
    const aEarthM = 1.495978707e11
    const soi = sphereOfInfluence(aEarthM, MU_EARTH, MU_SUN)
    expect(soi).toBeGreaterThan(9.0e8) // ~9.2e8 m
    expect(soi).toBeLessThan(9.4e8)
  })
})

describe('Curtis Example 8.8 / 8.9 patched-conic transfer', () => {
  // The planet state vectors come from the Algorithm 8.1 ephemeris (Curtis Table
  // 8.1 elements) at the Example 8.8 departure and arrival Julian dates.
  const earth = planetStateAtJD(STANDISH_EARTH, 2450394.5, MU_SUN_CURTIS)
  const mars = planetStateAtJD(STANDISH_MARS, 2450703.5, MU_SUN_CURTIS)
  const tof = 309 * 86400
  const arc = transferArc(earth.r, earth.v, mars.r, mars.v, tof, MU_SUN_CURTIS)

  it('heliocentric Lambert yields departure and arrival excess speeds 3.1651 and 2.8851 km/s to 1e-3', () => {
    expect(closeTo(arc.vInfDepart, 3.1651, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(arc.vInfArrive, 2.8851, { rtol: 1e-3 })).toBe(true)
  })

  it('departure delta-v from a 180 km LEO parking orbit matches 3.674 km/s to 1e-3', () => {
    const rPark = 6378 + 180
    const dv = departureDeltaV(arc.vInfDepart, rPark, MU_EARTH_KM)
    expect(closeTo(dv, 3.674, { rtol: 1e-3 })).toBe(true)
  })

  it('the Algorithm 8.1 ephemeris reproduces Example 8.7 state vectors', () => {
    // 27 August 2003, JD 2452879.0.
    const e = planetStateAtJD(STANDISH_EARTH, 2452879.0, MU_SUN_CURTIS)
    const m = planetStateAtJD(STANDISH_MARS, 2452879.0, MU_SUN_CURTIS)
    expect(closeTo(e.r.x, 135.59e6, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(e.r.y, -66.803e6, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(m.r.x, 185.95e6, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(m.r.y, -89.916e6, { rtol: 1e-3 })).toBe(true)
    expect(closeTo(m.r.z, -6.4566e6, { rtol: 1e-3 })).toBe(true)
  })
})

describe('porkchop scan determinism and masking', () => {
  const depEph = standishEphemeris(STANDISH_EARTH, MU_SUN_CURTIS)
  const arrEph = standishEphemeris(STANDISH_MARS, MU_SUN_CURTIS)
  const day = 86400
  // A window around the 1996 Mars launch opportunity (seconds from J2000).
  const base = (2450394.5 - J2000_JD) * day
  const grid = {
    departureTimes: [base, base + 20 * day, base + 40 * day, base + 60 * day],
    arrivalTimes: [base + 280 * day, base + 300 * day, base + 320 * day, base + 340 * day],
  }

  it('returns bit-identical C3 and arrival excess-speed arrays across repeated runs', () => {
    const a = porkchopScan(depEph, arrEph, grid, MU_SUN_CURTIS)
    const b = porkchopScan(depEph, arrEph, grid, MU_SUN_CURTIS)
    expect(buffersEqual(a.c3, b.c3)).toBe(true)
    expect(buffersEqual(a.vInfArrive, b.vInfArrive)).toBe(true)
    expect(Array.from(a.feasible)).toEqual(Array.from(b.feasible))
    // Every cell here has a positive flight time, so all are feasible and finite.
    expect(Array.from(a.feasible).every((f) => f === 1)).toBe(true)
    for (const v of a.c3) expect(Number.isFinite(v) && v > 0).toBe(true)
  })

  it('masks cells where arrival precedes departure and never solves them', () => {
    const invertedGrid = {
      departureTimes: [base, base + 100 * day],
      // One arrival before the first departure: an inverted (negative flight time) pair.
      arrivalTimes: [base - 50 * day, base + 300 * day],
    }
    const result = porkchopScan(depEph, arrEph, invertedGrid, MU_SUN_CURTIS)
    // Cell (departure index 0, arrival index 0): tof = -50 days -> masked.
    const maskedIdx = 0 * invertedGrid.arrivalTimes.length + 0
    expect(result.feasible[maskedIdx]).toBe(0)
    expect(result.c3[maskedIdx]).toBe(0)
    expect(result.vInfArrive[maskedIdx]).toBe(0)
    // Cell (0, 1): tof = +300 days -> feasible.
    const feasibleIdx = 0 * invertedGrid.arrivalTimes.length + 1
    expect(result.feasible[feasibleIdx]).toBe(1)
    expect(result.c3[feasibleIdx]).toBeGreaterThan(0)
    // Cell (1, 0): arrival (base-50d) before departure (base+100d) -> masked.
    const maskedIdx2 = 1 * invertedGrid.arrivalTimes.length + 0
    expect(result.feasible[maskedIdx2]).toBe(0)
  })
})

describe('deterministic Kepler ephemeris', () => {
  it('propagates a body on its own orbit, agreeing with itself at the epoch', () => {
    const earth = planetStateAtJD(STANDISH_EARTH, 2450394.5, MU_SUN_CURTIS)
    const eph = keplerEphemeris(earth, MU_SUN_CURTIS)
    const atEpoch = eph.stateAt(0)
    expect(closeTo(atEpoch.r.x, earth.r.x, { rtol: 1e-12 })).toBe(true)
    expect(closeTo(atEpoch.r.y, earth.r.y, { rtol: 1e-12 })).toBe(true)
  })
})
