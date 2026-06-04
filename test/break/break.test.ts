/**
 * Break-push suite.
 *
 * This is the adversarial half of the build/break loop. It tries to falsify the
 * engine with random and edge-case inputs, checking the ground-truth invariants:
 * the two-body analytic solution, the conservation laws, Lambert re-propagation,
 * determinism, and the no-NaN rule. fast-check draws a fresh random seed each
 * run, so every execution is a new break push. A failure here is filed as a
 * failing test before any fix is attempted.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { type Body, fromBodies, allFinite } from '../../src/integrators/state'
import { recordTrajectory, replayTrajectory, type Scene } from '../../src/integrators/run'
import { type IntegratorName } from '../../src/integrators/index'
import { totalEnergy, totalLinearMomentum, totalAngularMomentum } from '../harness/conserve'
import { coeToRv, rvToElements } from '../../src/twobody/elements'
import { propagateUniversal, propagateRegime } from '../../src/twobody/kepler'
import { classify } from '../../src/orbit/classify'
import { lambertBMW } from '../../src/lambert/bmw'
import { lambertIzzoSingle } from '../../src/lambert/izzo'
import { MU_EARTH, TWO_PI } from '../../src/core/constants'
import { type Vec3, vec3, sub, scale, dot, norm } from '../../src/core/vec3'
import { degToRad } from '../../src/core/units'

const mu = MU_EARTH
const relErr = (a: Vec3, b: Vec3): number => norm(sub(a, b)) / norm(b)
const finite = (n: number) => fc.double({ min: -n, max: n, noNaN: true, noDefaultInfinity: true })

describe('break: conservation invariants on random N-body scenes', () => {
  const arbBody = fc.record({
    mass: fc.double({ min: 0.5, max: 2, noNaN: true }),
    px: finite(3), py: finite(3), pz: finite(3),
    vx: finite(0.5), vy: finite(0.5), vz: finite(0.5),
  })
  const arbScene = fc.array(arbBody, { minLength: 2, maxLength: 5 })

  it('no NaN, momentum at machine-noise, energy and angular momentum bounded', () => {
    fc.assert(
      fc.property(arbScene, fc.constantFrom<IntegratorName>('leapfrog', 'pefrl', 'forestRuth'), (bs, integrator) => {
        const bodies: Body[] = bs.map((b) => ({
          mass: b.mass, position: vec3(b.px, b.py, b.pz), velocity: vec3(b.vx, b.vy, b.vz),
        }))
        const scene: Scene = { bodies, G: 1, softening: 0.25 } // softening regularizes close encounters
        const masses = new Float64Array(bodies.map((b) => b.mass))
        const n = bodies.length
        const traj = recordTrajectory({ scene, integrator, dt: 0.002, steps: 1500, snapshotEvery: 150 })

        const e0 = totalEnergy(traj.snapshots[0]!.data, masses, n, 1, 0.25)
        const p0 = totalLinearMomentum(traj.snapshots[0]!.data, masses, n)
        const l0 = norm(totalAngularMomentum(traj.snapshots[0]!.data, masses, n))
        // Scale the momentum drift by the peak momentum flux over the run: a close
        // encounter spikes velocities, amplifying the machine-noise residual in
        // absolute terms but not relative to the (also spiked) momentum scale.
        let pScale = 1e-12
        for (const s of traj.snapshots) {
          let flux = 0
          for (let k = 0; k < n; k++) {
            const o = 6 * k
            flux += masses[k]! * Math.hypot(s.data[o + 3]!, s.data[o + 4]!, s.data[o + 5]!)
          }
          pScale = Math.max(pScale, flux)
        }

        for (const s of traj.snapshots) {
          expect(allFinite(s.data)).toBe(true) // hard no-NaN/Inf invariant
          const p = totalLinearMomentum(s.data, masses, n)
          expect(norm(sub(p, p0)) / pScale).toBeLessThanOrEqual(1e-9) // momentum machine-noise
          const e = totalEnergy(s.data, masses, n, 1, 0.25)
          expect(Math.abs(e - e0) / Math.abs(e0)).toBeLessThanOrEqual(1e-2) // symplectic, bounded
          const l = norm(totalAngularMomentum(s.data, masses, n))
          expect(Math.abs(l - l0) / (l0 + 1e-9)).toBeLessThanOrEqual(1e-2)
        }
      }),
      { numRuns: 120 },
    )
  })

  it('equal-mass binary keeps total momentum exactly zero for every integrator', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 3, noNaN: true }),
        fc.double({ min: 0.2, max: 1.5, noNaN: true }),
        fc.constantFrom<IntegratorName>('leapfrog', 'pefrl', 'forestRuth', 'rk4'),
        (r, v, integrator) => {
          const bodies: Body[] = [
            { mass: 1, position: vec3(-r, 0, 0), velocity: vec3(0, -v, 0) },
            { mass: 1, position: vec3(r, 0, 0), velocity: vec3(0, v, 0) },
          ]
          const masses = new Float64Array([1, 1])
          const traj = recordTrajectory({ scene: { bodies, G: 1 }, integrator, dt: 0.01, steps: 800, snapshotEvery: 100 })
          for (const s of traj.snapshots) {
            const p = totalLinearMomentum(s.data, masses, 2)
            expect(p.x === 0 && p.y === 0 && p.z === 0).toBe(true)
          }
        },
      ),
      { numRuns: 120 },
    )
  })
})

describe('break: two-body propagation vs the analytic solution', () => {
  const orbit = fc.record({
    a: fc.double({ min: 7e6, max: 6e8, noNaN: true }),
    // e >= 0.01, i in [1, 179] deg: the per-regime solver's domain (non-degenerate
    // classical orbits). Circular and equatorial cases are covered in M2/M3 tests.
    e: fc.double({ min: 0.01, max: 0.95, noNaN: true }),
    i: fc.double({ min: degToRad(1), max: degToRad(179), noNaN: true }),
    raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    nu: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    frac: fc.double({ min: 0.01, max: 0.99, noNaN: true }),
  })

  it('universal and per-regime agree, and one period closes, with no NaN', () => {
    fc.assert(
      fc.property(orbit, (o) => {
        const { r, v } = coeToRv(o.a, o.e, o.i, o.raan, o.argp, o.nu, mu)
        const period = TWO_PI * Math.sqrt(o.a ** 3 / mu)
        const dt = o.frac * period
        const u = propagateUniversal(r, v, dt, mu)
        const g = propagateRegime(r, v, dt, mu)
        expect(Number.isFinite(norm(u.r)) && Number.isFinite(norm(u.v))).toBe(true)
        expect(relErr(u.r, g.r)).toBeLessThanOrEqual(1e-9)
        expect(relErr(u.v, g.v)).toBeLessThanOrEqual(1e-9)
        const back = propagateUniversal(r, v, period, mu)
        expect(relErr(back.r, r)).toBeLessThanOrEqual(1e-8)
        // Specific energy is conserved at -mu/(2a).
        const energy = dot(u.v, u.v) / 2 - mu / norm(u.r)
        expect(Math.abs(energy - -mu / (2 * o.a)) / (mu / o.a)).toBeLessThanOrEqual(1e-9)
      }),
      { numRuns: 1500 },
    )
  })

  it('extreme eccentricity and hyperbolic orbits re-propagate forward then back', () => {
    const extreme = fc.record({
      a: fc.double({ min: 7e6, max: 4e8, noNaN: true }),
      e: fc.double({ min: 0.9, max: 0.999, noNaN: true }),
      nu: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
      frac: fc.double({ min: 0.05, max: 0.95, noNaN: true }),
    })
    fc.assert(
      fc.property(extreme, (o) => {
        const { r, v } = coeToRv(o.a, o.e, degToRad(30), 0.5, 1.0, o.nu, mu)
        const period = TWO_PI * Math.sqrt(o.a ** 3 / mu)
        const dt = o.frac * period
        const fwd = propagateUniversal(r, v, dt, mu)
        const back = propagateUniversal(fwd.r, fwd.v, -dt, mu)
        expect(relErr(back.r, r)).toBeLessThanOrEqual(1e-7)
        expect(relErr(back.v, v)).toBeLessThanOrEqual(1e-7)
      }),
      { numRuns: 800 },
    )

    // Hyperbolic: forward/backward closure.
    const hyp = fc.record({
      a: fc.double({ min: -4e8, max: -7e6, noNaN: true }),
      e: fc.double({ min: 1.1, max: 8, noNaN: true }),
      nu: fc.double({ min: -1.2, max: 1.2, noNaN: true }),
      g: fc.double({ min: -1, max: 1, noNaN: true }),
    })
    fc.assert(
      fc.property(hyp, (o) => {
        const { r, v } = coeToRv(o.a, o.e, degToRad(40), 1.0, 2.0, o.nu, mu)
        const tChar = Math.sqrt((-o.a) ** 3 / mu)
        const dt = o.g * tChar
        const fwd = propagateUniversal(r, v, dt, mu)
        const back = propagateUniversal(fwd.r, fwd.v, -dt, mu)
        expect(relErr(back.r, r)).toBeLessThanOrEqual(1e-7)
      }),
      { numRuns: 800 },
    )
  })

  it('near-parabolic propagation stays finite with near-zero energy', () => {
    const nearPar = fc.record({
      rp: fc.double({ min: 7e6, max: 5e7, noNaN: true }),
      speedFactor: fc.double({ min: 0.999, max: 1.001, noNaN: true }), // around escape speed
      dt: fc.double({ min: 100, max: 5e5, noNaN: true }),
    })
    fc.assert(
      fc.property(nearPar, (o) => {
        const r0 = vec3(o.rp, 0, 0)
        const v0 = vec3(0, o.speedFactor * Math.sqrt((2 * mu) / o.rp), 0)
        const s = propagateUniversal(r0, v0, o.dt, mu)
        expect(Number.isFinite(norm(s.r)) && Number.isFinite(norm(s.v))).toBe(true)
        const back = propagateUniversal(s.r, s.v, -o.dt, mu)
        expect(relErr(back.r, r0)).toBeLessThanOrEqual(1e-7)
      }),
      { numRuns: 800 },
    )
  })
})

describe('break: Lambert vs re-propagation and the two solvers vs each other', () => {
  function trueToMean(nu: number, e: number): number {
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2))
    return E - e * Math.sin(E)
  }
  const transfer = fc.record({
    a: fc.double({ min: 1e7, max: 5e8, noNaN: true }),
    e: fc.double({ min: 0, max: 0.7, noNaN: true }),
    i: fc.double({ min: degToRad(5), max: degToRad(85), noNaN: true }),
    raan: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    argp: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    nu1: fc.double({ min: 0, max: TWO_PI, noNaN: true }),
    dnu: fc.double({ min: degToRad(25), max: degToRad(155), noNaN: true }),
    factor: fc.double({ min: 0.4, max: 1.0, noNaN: true }),
  })

  it('solved velocity re-propagates to the target, and BMW and Izzo agree, no NaN', () => {
    fc.assert(
      fc.property(transfer, (t) => {
        const nu2 = t.nu1 + t.dnu
        const r1 = coeToRv(t.a, t.e, t.i, t.raan, t.argp, t.nu1, mu).r
        const r2 = coeToRv(t.a, t.e, t.i, t.raan, t.argp, nu2, mu).r
        let dM = trueToMean(nu2, t.e) - trueToMean(t.nu1, t.e)
        dM = ((dM % TWO_PI) + TWO_PI) % TWO_PI
        const tof = (dM / Math.sqrt(mu / t.a ** 3)) * t.factor
        const bmw = lambertBMW(r1, r2, tof, mu)
        const izzo = lambertIzzoSingle(r1, r2, tof, mu)
        for (const sol of [bmw, izzo]) {
          expect(Number.isFinite(norm(sol.v1)) && Number.isFinite(norm(sol.v2))).toBe(true)
          expect(relErr(propagateUniversal(r1, sol.v1, tof, mu).r, r2)).toBeLessThanOrEqual(1e-9)
        }
        expect(relErr(bmw.v1, izzo.v1)).toBeLessThanOrEqual(1e-9)
        expect(relErr(bmw.v2, izzo.v2)).toBeLessThanOrEqual(1e-9)
      }),
      { numRuns: 1200 },
    )
  })
})

describe('break: adversarial edge cases', () => {
  it('exact collision (coincident bodies, no softening) is rejected by the finiteness gate', () => {
    // Same velocity so the bodies stay coincident: the 1/r^3 force is singular for
    // every integrator (a different velocity would let drift-first methods separate
    // them before the first force evaluation).
    const scene: Scene = {
      bodies: [
        { mass: 1, position: vec3(0, 0, 0), velocity: vec3(0, 0.1, 0) },
        { mass: 1, position: vec3(0, 0, 0), velocity: vec3(0, 0.1, 0) },
      ],
      G: 1,
    }
    for (const integrator of ['leapfrog', 'pefrl', 'forestRuth', 'rk4'] as IntegratorName[]) {
      expect(() => recordTrajectory({ scene, integrator, dt: 0.01, steps: 1, snapshotEvery: 1 })).toThrow(RangeError)
    }
  })

  it('degenerate coplanar Lambert geometry (collinear positions) is rejected', () => {
    fc.assert(
      fc.property(fc.double({ min: 7e6, max: 5e7, noNaN: true }), fc.double({ min: 1.1, max: 3, noNaN: true }), (r, k) => {
        const r1 = vec3(r, 0, 0)
        expect(() => lambertBMW(r1, vec3(k * r, 0, 0), 3000, mu)).toThrow(RangeError) // parallel
        expect(() => lambertBMW(r1, vec3(-k * r, 0, 0), 3000, mu)).toThrow(RangeError) // anti-parallel
      }),
      { numRuns: 200 },
    )
  })

  it('classification stays consistent and NaN-free across the conic range', () => {
    const arb = fc.record({
      rp: fc.double({ min: 7e6, max: 1e8, noNaN: true }),
      speedFactor: fc.double({ min: 0.3, max: 1.6, noNaN: true }), // 0.3..1 elliptic, ~1 parabolic, >1 hyperbolic
      i: fc.double({ min: degToRad(5), max: degToRad(170), noNaN: true }),
    })
    fc.assert(
      fc.property(arb, (o) => {
        // Build a state at periapsis with a chosen speed fraction of escape speed.
        const vEsc = Math.sqrt((2 * mu) / o.rp)
        const r = scale(vec3(Math.cos(o.i), 0, Math.sin(o.i)), o.rp)
        const v = scale(vec3(0, 1, 0), o.speedFactor * vEsc)
        const props = classify(r, v, mu)
        expect(Number.isFinite(props.energy)).toBe(true)
        expect(Number.isFinite(props.periapsis)).toBe(true)
        expect(['circular', 'elliptic', 'parabolic', 'hyperbolic']).toContain(props.conic)
        // Bound orbits have finite period/apoapsis; unbound have Infinity.
        if (props.conic === 'elliptic' || props.conic === 'circular') {
          expect(Number.isFinite(props.period) && Number.isFinite(props.apoapsis)).toBe(true)
        } else {
          expect(props.period).toBe(Infinity)
          expect(props.apoapsis).toBe(Infinity)
        }
        // rvToElements never returns NaN in a defined field.
        const el = rvToElements(r, v, mu)
        for (const value of Object.values(el)) {
          if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
        }
      }),
      { numRuns: 1500 },
    )
  })
})

describe('break: determinism on random scenes', () => {
  it('record then replay is byte-identical for random scenes and integrators', () => {
    const arbBody = fc.record({
      mass: fc.double({ min: 0.5, max: 2, noNaN: true }),
      px: finite(2), py: finite(2), pz: finite(2),
      vx: finite(0.4), vy: finite(0.4), vz: finite(0.4),
    })
    fc.assert(
      fc.property(
        fc.array(arbBody, { minLength: 2, maxLength: 4 }),
        fc.constantFrom<IntegratorName>('leapfrog', 'pefrl', 'forestRuth', 'rk4'),
        (bs, integrator) => {
          const bodies: Body[] = bs.map((b) => ({
            mass: b.mass, position: vec3(b.px, b.py, b.pz), velocity: vec3(b.vx, b.vy, b.vz),
          }))
          const scene: Scene = { bodies, G: 1, softening: 0.3 }
          const traj = recordTrajectory({ scene, integrator, dt: 0.003, steps: 600, snapshotEvery: 100 })
          expect(replayTrajectory(traj)).toBe(true)
          // Sanity: the seam round-trips.
          expect(fromBodies(bodies).data.length).toBe(6 * bodies.length)
        },
      ),
      { numRuns: 150 },
    )
  })
})
