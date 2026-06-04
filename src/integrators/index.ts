/**
 * The four fixed-step integrators.
 *
 * The equations of motion are separable (acceleration depends only on position),
 * so three of the four are symplectic splitting methods built from alternating
 * drift (advance position by velocity) and kick (advance velocity by
 * acceleration) substeps. A symplectic method preserves the geometric structure
 * of the flow, which keeps the energy error bounded and oscillatory instead of
 * drifting. The fourth, classical RK4, is more accurate over a few orbits but
 * its energy error grows secularly over many.
 *
 * - leapfrog: velocity Verlet, second-order symplectic, kick-drift-kick.
 * - pefrl: Position Extended Forest-Ruth Like, fourth-order symplectic
 *   (Omelyan, Mryglod, Folk 2002), four force evaluations per step.
 * - forestRuth: the original fourth-order symplectic composition (Forest, Ruth
 *   1990), three force evaluations per step.
 * - rk4: classical fourth-order Runge-Kutta, four force evaluations per step.
 *
 * Each integrator validates its coefficient set at construction (the startup sum
 * assertion) and pre-allocates its scratch so the step loop never allocates.
 */
import { type StateBuffer } from './state'
import { accelerations } from './force'

/**
 * Coefficients of Omelyan-Mryglod-Folk 2002 PEFRL (dimensionless).
 *
 * Note on chi: the published value is -0.6626458266981849e-1, that is
 * -0.06626458266981849 (leading -0.066, not -0.66). Dropping the e-1 exponent
 * collapses PEFRL to below second-order accuracy, so the full-precision value
 * from the cited source is used here; the PEFRL energy-boundedness invariant
 * (below 1e-6) confirms it. (An earlier SPEC reference-table transcription
 * omitted the exponent; SPEC.md now carries the correct value.)
 */
const PEFRL_XI = 0.1786178958448091
const PEFRL_LAMBDA = -0.2123418310626054
const PEFRL_CHI = -0.06626458266981849

/** Forest-Ruth 1990 coefficients (dimensionless). */
const FR_W1 = 1.3512071919596578
const FR_W0 = -1.7024143839193153

/** A named coefficient set whose sum is asserted at integrator startup. */
export interface CoefficientSet {
  readonly label: string
  readonly values: readonly number[]
  readonly expectedSum: number
  /** Allowed |sum - expectedSum|, in ULPs of expectedSum. Zero means exact. */
  readonly ulpBudget: number
}

/**
 * The startup sum assertion. Throws if a coefficient set does not sum to its
 * expected value within the stated ULP budget, so a corrupted method can never
 * silently integrate.
 */
export function assertCoefficientSet(set: CoefficientSet, integrator: string): void {
  let sum = 0
  for (const v of set.values) sum += v
  const tol = set.ulpBudget * Number.EPSILON * Math.max(1, Math.abs(set.expectedSum))
  if (Math.abs(sum - set.expectedSum) > tol) {
    throw new RangeError(
      `${integrator}: ${set.label} coefficients sum to ${sum}, expected ${set.expectedSum} within ${set.ulpBudget} ULP`,
    )
  }
}

/** A constructed integrator bound to a fixed body count. */
export interface Integrator {
  readonly name: string
  /** The coefficient sets validated at startup, exposed for inspection. */
  readonly coefficientSets: readonly CoefficientSet[]
  /** Advance the packed state by one step of size dt, in place. */
  step(state: StateBuffer, dt: number, G: number, softening: number): void
}

/** The four integrator names. */
export type IntegratorName = 'leapfrog' | 'pefrl' | 'forestRuth' | 'rk4'

/**
 * Build a symplectic splitting integrator from its drift and kick coefficients.
 * The substeps strictly alternate; `startsWithDrift` picks the first one.
 */
function makeSymplectic(
  name: string,
  drift: readonly number[],
  kick: readonly number[],
  startsWithDrift: boolean,
  ulpBudget: number,
  n: number,
): Integrator {
  const coefficientSets: CoefficientSet[] = [
    { label: 'drift', values: drift, expectedSum: 1, ulpBudget },
    { label: 'kick', values: kick, expectedSum: 1, ulpBudget },
  ]
  for (const set of coefficientSets) assertCoefficientSet(set, name)
  const acc = new Float64Array(3 * n)
  const total = drift.length + kick.length

  function step(state: StateBuffer, dt: number, G: number, softening: number): void {
    const { data, masses } = state
    let di = 0
    let ki = 0
    let isDrift = startsWithDrift
    for (let op = 0; op < total; op++) {
      if (isDrift) {
        const c = drift[di++]! * dt
        for (let i = 0; i < n; i++) {
          const o = 6 * i
          data[o] = data[o]! + c * data[o + 3]!
          data[o + 1] = data[o + 1]! + c * data[o + 4]!
          data[o + 2] = data[o + 2]! + c * data[o + 5]!
        }
      } else {
        accelerations(data, masses, n, G, softening, acc)
        const c = kick[ki++]! * dt
        for (let i = 0; i < n; i++) {
          const o = 6 * i
          const a = 3 * i
          data[o + 3] = data[o + 3]! + c * acc[a]!
          data[o + 4] = data[o + 4]! + c * acc[a + 1]!
          data[o + 5] = data[o + 5]! + c * acc[a + 2]!
        }
      }
      isDrift = !isDrift
    }
  }

  return { name, coefficientSets, step }
}

/** Leapfrog (velocity Verlet), kick-drift-kick. */
export function leapfrog(n: number): Integrator {
  return makeSymplectic('leapfrog', [1], [0.5, 0.5], false, 0, n)
}

/** PEFRL, fourth-order symplectic, drift-first nine-substep sequence. */
export function pefrl(n: number): Integrator {
  const driftMid = 1 - 2 * (PEFRL_CHI + PEFRL_XI)
  const kickEnd = (1 - 2 * PEFRL_LAMBDA) / 2
  const drift = [PEFRL_XI, PEFRL_CHI, driftMid, PEFRL_CHI, PEFRL_XI]
  const kick = [kickEnd, PEFRL_LAMBDA, PEFRL_LAMBDA, kickEnd]
  return makeSymplectic('pefrl', drift, kick, true, 0, n)
}

/** Forest-Ruth, fourth-order symplectic, drift-first seven-substep sequence. */
export function forestRuth(n: number): Integrator {
  const c1 = FR_W1 / 2
  const c2 = (FR_W0 + FR_W1) / 2
  const drift = [c1, c2, c2, c1]
  const kick = [FR_W1, FR_W0, FR_W1]
  return makeSymplectic('forestRuth', drift, kick, true, 1, n)
}

/** Evaluate the first-order derivative (v, a(q)) of the packed state into kOut. */
function rk4Deriv(
  src: Float64Array,
  masses: Float64Array,
  n: number,
  G: number,
  softening: number,
  acc: Float64Array,
  kOut: Float64Array,
): void {
  accelerations(src, masses, n, G, softening, acc)
  for (let i = 0; i < n; i++) {
    const o = 6 * i
    const a = 3 * i
    kOut[o] = src[o + 3]!
    kOut[o + 1] = src[o + 4]!
    kOut[o + 2] = src[o + 5]!
    kOut[o + 3] = acc[a]!
    kOut[o + 4] = acc[a + 1]!
    kOut[o + 5] = acc[a + 2]!
  }
}

/** Classical fourth-order Runge-Kutta. */
export function rk4(n: number): Integrator {
  const coefficientSets: CoefficientSet[] = [
    { label: 'weights', values: [1 / 6, 1 / 3, 1 / 3, 1 / 6], expectedSum: 1, ulpBudget: 1 },
  ]
  for (const set of coefficientSets) assertCoefficientSet(set, 'rk4')
  const m = 6 * n
  const acc = new Float64Array(3 * n)
  const k1 = new Float64Array(m)
  const k2 = new Float64Array(m)
  const k3 = new Float64Array(m)
  const k4 = new Float64Array(m)
  const ytmp = new Float64Array(m)

  function step(state: StateBuffer, dt: number, G: number, softening: number): void {
    const { data, masses } = state
    rk4Deriv(data, masses, n, G, softening, acc, k1)
    for (let i = 0; i < m; i++) ytmp[i] = data[i]! + (dt / 2) * k1[i]!
    rk4Deriv(ytmp, masses, n, G, softening, acc, k2)
    for (let i = 0; i < m; i++) ytmp[i] = data[i]! + (dt / 2) * k2[i]!
    rk4Deriv(ytmp, masses, n, G, softening, acc, k3)
    for (let i = 0; i < m; i++) ytmp[i] = data[i]! + dt * k3[i]!
    rk4Deriv(ytmp, masses, n, G, softening, acc, k4)
    const h6 = dt / 6
    for (let i = 0; i < m; i++) {
      data[i] = data[i]! + h6 * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!)
    }
  }

  return { name: 'rk4', coefficientSets, step }
}

/** Construct an integrator by name, bound to a body count. */
export function integratorByName(name: IntegratorName, n: number): Integrator {
  switch (name) {
    case 'leapfrog': return leapfrog(n)
    case 'pefrl': return pefrl(n)
    case 'forestRuth': return forestRuth(n)
    case 'rk4': return rk4(n)
  }
}
