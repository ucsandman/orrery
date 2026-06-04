import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  G, AU_M, DAY_S, JULIAN_YEAR_S, J2000_JD,
  MU_SUN, MU_EARTH, MU_MOON, MU_MARS_SYSTEM, EARTH_MOON_MASS_RATIO, TWO_PI,
} from './constants'

const ALL = {
  G, AU_M, DAY_S, JULIAN_YEAR_S, J2000_JD,
  MU_SUN, MU_EARTH, MU_MOON, MU_MARS_SYSTEM, EARTH_MOON_MASS_RATIO, TWO_PI,
}

describe('physical constants', () => {
  it('are all finite', () => {
    for (const [name, value] of Object.entries(ALL)) {
      expect(Number.isFinite(value), name).toBe(true)
    }
  })

  it('hold their published anchor values', () => {
    expect(G).toBe(6.6743e-11)
    expect(AU_M).toBe(149597870700)
    expect(DAY_S).toBe(86400)
    expect(J2000_JD).toBe(2451545.0)
    expect(MU_EARTH).toBe(3.98600435507e14)
  })

  it('keep the expected sign and ordering for gravitational parameters', () => {
    expect(MU_SUN).toBeGreaterThan(MU_EARTH)
    expect(MU_EARTH).toBeGreaterThan(MU_MOON)
    expect(MU_MARS_SYSTEM).toBeGreaterThan(MU_MOON)
    expect(MU_MARS_SYSTEM).toBeLessThan(MU_EARTH)
  })
})

describe('constants module structure', () => {
  const source = readFileSync(new URL('./constants.ts', import.meta.url), 'utf8')

  it('imports nothing', () => {
    const hasImport = /^\s*import\s/m.test(source)
    expect(hasImport).toBe(false)
  })

  it('never reconstructs a gravitational parameter as G times a mass', () => {
    // mu values are stored directly; a `G *` product in code would be the
    // forbidden reconstruction. Strip comments first so prose that mentions the
    // anti-pattern does not trip the check.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
    expect(/\bG\s*\*/.test(code)).toBe(false)
  })
})
