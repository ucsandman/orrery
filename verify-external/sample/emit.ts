/**
 * Engine JSON emitter for the external differential-validation layer.
 *
 * Given a category and the fixed seed for that category, generate a seeded random
 * sample of input cases, compute the engine output for each by calling the public
 * core functions, and write one JSON document to generated/. The Python oracle
 * suite reads that document and checks each engineOutput against an independent
 * reference for the same input.
 *
 * Run: tsx sample/emit.ts <category|all> [profile]
 *   category: elements_fwd | elements_inv | kepler | lambert | maneuvers | lagrange | standish
 *   profile:  nominal (default) | adversarial
 *
 * The core is imported, never modified. The seeded generator createRng is a pure
 * dev utility here; it adds no runtime dependency to the core.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  createRng, type Rng,
  type Vec3, vec3,
  TWO_PI, MU_EARTH, MU_SUN,
  coeToRv, rvToElements,
  propagateUniversal,
  lambertIzzo,
  hohmann, biElliptic, planeChange, combinedPlaneChange,
  lagrangePoints,
  planetStateAtJD, standishEphemeris, STANDISH_EARTH, STANDISH_MARS,
  type PlanetElements, type BodyState,
  AU_KM_CURTIS,
} from '../../src/index'
import { SEEDS, SAMPLE_SIZE_NOMINAL, SAMPLE_SIZE_ADVERSARIAL, type Category } from './seeds'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GENERATED = join(ROOT, 'generated')
const DATA = join(ROOT, 'data')
const FIXTURES = join(ROOT, 'fixtures')

const MU_SUN_KM = MU_SUN / 1e9 // m^3/s^2 to km^3/s^2 for the Standish (Curtis) unit system

type Profile = 'nominal' | 'adversarial'

function rand(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng.next()
}
function logRand(rng: Rng, lo: number, hi: number): number {
  return Math.exp(rand(rng, Math.log(lo), Math.log(hi)))
}
function arr(v: Vec3): [number, number, number] {
  return [v.x, v.y, v.z]
}
function period(a: number, mu: number): number {
  return TWO_PI * Math.sqrt((a * a * a) / mu)
}

interface Case {
  input: Record<string, unknown>
  engineOutput: Record<string, unknown>
}

/** Sample a well-conditioned classical orbit (clear of the degenerate tolerances). */
function sampleOrbit(rng: Rng, adversarial: boolean): {
  a: number; e: number; i: number; raan: number; argp: number; nu: number; mu: number
} {
  const mu = MU_EARTH
  const a = logRand(rng, 8e6, 5e8)
  let e: number
  if (adversarial) {
    // Straddle near-circular and near-parabolic and into the hyperbolic regime.
    const pick = rng.next()
    if (pick < 0.5) e = rand(rng, 0.9, 1 - 1e-6)
    else e = rand(rng, 1 + 1e-6, 3)
  } else {
    e = rand(rng, 0.01, 0.9)
  }
  const i = rand(rng, 0.02, Math.PI - 0.02)
  const raan = rand(rng, 0, TWO_PI)
  const argp = rand(rng, 0, TWO_PI)
  const nu = rand(rng, 0, TWO_PI)
  return { a, e, i, raan, argp, nu, mu }
}

function genElementsFwd(rng: Rng, n: number, adversarial: boolean): Case[] {
  const cases: Case[] = []
  for (let k = 0; k < n; k++) {
    const o = sampleOrbit(rng, adversarial)
    if (o.e >= 1) continue // forward extraction of a from a hyperbola is fine, but keep nominal classical
    const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, o.mu)
    const el = rvToElements(r, v, o.mu)
    cases.push({ input: { r: arr(r), v: arr(v), mu: o.mu }, engineOutput: el as unknown as Record<string, unknown> })
  }
  return cases
}

function genElementsInv(rng: Rng, n: number, adversarial: boolean): Case[] {
  const cases: Case[] = []
  for (let k = 0; k < n; k++) {
    const o = sampleOrbit(rng, adversarial)
    const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, o.mu)
    cases.push({
      input: { a: o.a, e: o.e, i: o.i, raan: o.raan, argp: o.argp, nu: o.nu, mu: o.mu },
      engineOutput: { r: arr(r), v: arr(v) },
    })
  }
  return cases
}

function genKepler(rng: Rng, n: number, adversarial: boolean): Case[] {
  const cases: Case[] = []
  for (let k = 0; k < n; k++) {
    const o = sampleOrbit(rng, adversarial)
    const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, o.mu)
    // dt: a fraction of the period for ellipses; a bounded span for hyperbolas.
    const dt = o.e < 1 ? rand(rng, 0.05, 0.95) * period(o.a, o.mu) : rand(rng, 100, 5000)
    const out = propagateUniversal(r, v, dt, o.mu)
    cases.push({ input: { r0: arr(r), v0: arr(v), dt, mu: o.mu }, engineOutput: { r: arr(out.r), v: arr(out.v) } })
  }
  return cases
}

function genLambert(rng: Rng, n: number, adversarial: boolean): Case[] {
  const cases: Case[] = []
  for (let k = 0; k < n; k++) {
    const o = sampleOrbit(rng, false) // bound orbit so the transfer is feasible
    const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, o.mu)
    const P = period(o.a, o.mu)
    const dt = (adversarial ? rand(rng, 0.6, 0.95) : rand(rng, 0.05, 0.6)) * P
    const s2 = propagateUniversal(r, v, dt, o.mu)
    const retrograde = adversarial ? rng.next() < 0.5 : false
    const maxRevs = adversarial ? 2 : 0
    const branches = lambertIzzo(r, s2.r, dt, o.mu, { retrograde, maxRevs })
    cases.push({
      input: { r1: arr(r), r2: arr(s2.r), tof: dt, mu: o.mu, retrograde, maxRevs },
      engineOutput: {
        branches: branches.map((b) => ({ v1: arr(b.v1), v2: arr(b.v2), revs: b.revs, rightBranch: b.rightBranch })),
      },
    })
  }
  return cases
}

function genManeuvers(rng: Rng, n: number, adversarial: boolean): Case[] {
  const cases: Case[] = []
  const mu = MU_EARTH
  for (let k = 0; k < n; k++) {
    const kind = ['hohmann', 'biElliptic', 'planeChange', 'combinedPlaneChange'][k % 4]
    const r1 = logRand(rng, 6.6e6, 1.2e7)
    const R = adversarial ? logRand(rng, 1 + 1e-6, 1e4) : rand(rng, 1.1, 6)
    const r2 = r1 * R
    if (kind === 'hohmann') {
      cases.push({ input: { kind, r1, r2, mu }, engineOutput: serializeManeuver(hohmann(r1, r2, mu)) })
    } else if (kind === 'biElliptic') {
      const rb = Math.max(r1, r2) * rand(rng, 1.1, 3)
      cases.push({ input: { kind, r1, r2, rb, mu }, engineOutput: serializeManeuver(biElliptic(r1, r2, rb, mu)) })
    } else if (kind === 'planeChange') {
      const v = rand(rng, 3000, 10000)
      const inc = adversarial ? logRand(rng, 1e-9, 1e-3) : rand(rng, 0.01, Math.PI / 2)
      cases.push({ input: { kind, v, inc }, engineOutput: serializeManeuver(planeChange(v, inc)) })
    } else {
      const v1 = rand(rng, 3000, 10000)
      const v2 = rand(rng, 1000, 10000)
      const inc = adversarial ? logRand(rng, 1e-9, 1e-3) : rand(rng, 0.01, Math.PI / 2)
      cases.push({ input: { kind, v1, v2, inc }, engineOutput: serializeManeuver(combinedPlaneChange(v1, v2, inc)) })
    }
  }
  return cases
}

function serializeManeuver(m: { burns: readonly { name: string; dv: number }[]; totalDv: number }): Record<string, unknown> {
  return { burns: m.burns.map((b) => ({ name: b.name, dv: b.dv })), totalDv: m.totalDv }
}

function genLagrange(rng: Rng, n: number, adversarial: boolean): Case[] {
  const cases: Case[] = []
  for (let k = 0; k < n; k++) {
    let mu: number
    if (adversarial) mu = rng.next() < 0.5 ? rand(rng, 0.5 - 1e-6, 0.5) : logRand(rng, 1e-9, 1e-6)
    else mu = logRand(rng, 1e-7, 0.49)
    const lp = lagrangePoints(mu)
    cases.push({
      input: { mu },
      engineOutput: { L1: arr(lp.L1), L2: arr(lp.L2), L3: arr(lp.L3), L4: arr(lp.L4), L5: arr(lp.L5) },
    })
  }
  return cases
}

interface PlanetTable { [body: string]: PlanetElements }
interface HorizonsRecord { body: string; jd_tdb: number }

function loadPlanetTables(): PlanetTable {
  const file = join(DATA, 'standish_all_planets.json')
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { planets: PlanetTable }
  // Anchor the data file to the verified core constants: Earth and Mars must match.
  assertSameElements('earth', raw.planets.earth, STANDISH_EARTH)
  assertSameElements('mars', raw.planets.mars, STANDISH_MARS)
  return raw.planets
}

function assertSameElements(name: string, a: PlanetElements, b: PlanetElements): void {
  for (const key of Object.keys(b) as (keyof PlanetElements)[]) {
    if (a[key] !== b[key]) {
      throw new Error(`standish_all_planets.json ${name}.${String(key)} = ${a[key]} does not match core ${b[key]}`)
    }
  }
}

function genStandish(): Case[] {
  const fixtureFile = join(FIXTURES, 'horizons_planets.json')
  if (!existsSync(fixtureFile)) {
    return [] // fixtures not fetched yet; emit:all stays runnable before the one-time fetch
  }
  const tables = loadPlanetTables()
  const records = JSON.parse(readFileSync(fixtureFile, 'utf8')) as { records: HorizonsRecord[] }
  const cases: Case[] = []
  for (const rec of records.records) {
    const el = tables[rec.body]
    if (!el) continue
    const state: BodyState = planetStateAtJD(el, rec.jd_tdb, MU_SUN_KM, AU_KM_CURTIS)
    cases.push({
      input: { planet: rec.body, jd: rec.jd_tdb, muSun: MU_SUN_KM, auKm: AU_KM_CURTIS },
      engineOutput: { r_km: arr(state.r), v_kms: arr(state.v) },
    })
  }
  // Silence unused-import warning for standishEphemeris; it documents the same model path.
  void standishEphemeris
  void vec3
  return cases
}

const GENERATORS: Record<Category, (rng: Rng, n: number, adv: boolean) => Case[]> = {
  elements_fwd: genElementsFwd,
  elements_inv: genElementsInv,
  kepler: genKepler,
  lambert: genLambert,
  maneuvers: genManeuvers,
  lagrange: genLagrange,
  standish: () => genStandish(),
}

function emitCategory(category: Category, profile: Profile): void {
  const seed = SEEDS[category]
  const adversarial = profile === 'adversarial'
  const n = adversarial ? SAMPLE_SIZE_ADVERSARIAL : SAMPLE_SIZE_NOMINAL
  const rng = createRng(seed)
  const cases = GENERATORS[category](rng, n, adversarial)
  const doc = { category, seed, profile, count: cases.length, cases }
  const out = join(GENERATED, `${category}.${seed}.${profile}.json`)
  writeFileSync(out, JSON.stringify(doc, null, 1))
  console.log(`emit ${category} ${profile}: ${cases.length} cases -> ${out}`)
}

function main(): void {
  const target = process.argv[2] ?? 'all'
  const profile = (process.argv[3] as Profile) ?? 'nominal'
  const categories = Object.keys(SEEDS) as Category[]
  if (target === 'all') {
    for (const c of categories) emitCategory(c, profile)
  } else if (categories.includes(target as Category)) {
    emitCategory(target as Category, profile)
  } else {
    console.error(`unknown category ${target}; expected one of ${categories.join(', ')} or all`)
    process.exit(2)
  }
}

main()
