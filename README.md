# Orrery

A deterministic astrodynamics engine and mission planner. Astrodynamics is the
study of how spacecraft and natural bodies move under gravity.

The core is a pure TypeScript orbital-mechanics library with no runtime
dependencies: no network, no database, no file input or output, no environment
variables. It runs and is fully tested offline, and it is validated against
closed-form solutions and physical conservation laws (total energy, momentum, and
angular momentum). A thin Hono API and a Next.js plus PixiJS interactive sandbox,
where you build a system of bodies, run time forward and back, watch orbits, and
plan spacecraft transfers, sit on top as later layers and never gate verification
of the core.

## Status

All eight core milestones are complete and green: 148 passing tests, no pending
criteria, and every numeric threshold in `bar.json` at or under its target.

| # | Milestone | What it provides |
| --- | --- | --- |
| 1 | Primitives | Immutable `Vec3`, rotation matrices, unit conversions, J2000 time with a split Julian Date, sourced SI constants, a seeded `xoshiro256**` generator, compensated summation. |
| 2 | Two-body Kepler | Stumpff functions, Newton/Danby/Householder root finders, state vectors to and from classical elements, and two independent propagators (a universal-variable solver and a per-regime solver) that must agree. |
| 3 | Orbit classification | Conic type, period, apoapsis, periapsis, and specific orbital energy, checked against a propagated orbit. |
| 4 | N-body integration | A packed `Float64Array` state buffer, one canonical pairwise force kernel, four integrators (leapfrog, PEFRL, Forest-Ruth, RK4), and byte-identical record and replay. |
| 5 | Lambert solver | Two independent solvers, Bate-Mueller-White (oracle) and Izzo (production, multi-revolution), that must agree and re-propagate to their endpoints. |
| 6 | Maneuver planning | Hohmann and bi-elliptic transfers, plane changes, and the computed bi-elliptic crossover ratios (about 11.94 and 15.58). |
| 7 | Patched-conic transfer | Sphere of influence, hyperbolic excess speeds, departure delta-v, a deterministic Standish planetary ephemeris, and a porkchop scan. |
| 8 | CR3BP | The effective potential, the Jacobi constant, and all five Lagrange points in the circular restricted three-body problem. |

## Verification

The verification posture is the heart of the project, not a layer on top of it.

- The two-body analytic solution and the conservation invariants are ground
  truth and override any heuristic.
- Where possible, two independent implementations must agree, which is a stronger
  signal than one implementation checked against transcribed numbers: a
  universal-variable and a per-regime Kepler propagator, and the Izzo and
  Bate-Mueller-White Lambert solvers.
- No physics assertion uses bare equality. Every comparison uses a mixed
  tolerance `|a - b| <= atol + rtol max(|a|, |b|)`, and every tolerance is a
  named constant that traces to a source or to a measured run.
- Work proceeds as an alternating build and break loop. A break push tries to
  falsify the engine with random scenes, random two-body and Lambert cases, and
  adversarial edge cases (extreme eccentricity, near-parabolic orbits, exact
  collisions, degenerate coplanar geometry); see `test/break`.

A few headline numbers, measured by `npm test`, are tracked with their targets in
`bar.json`: the two Kepler propagators agree to about 7e-14 (target 1e-9), Lambert
solutions re-propagate to about 4e-12 (target 1e-9), an equal-mass binary
conserves momentum to exactly zero, and record then replay is byte-identical.

## Quick start

```
git clone git@github.com:ucsandman/orrery.git
cd orrery
npm install
npm test          # run the test suite
npm run typecheck # typecheck with no emit
npm run check     # typecheck then test
```

The core needs nothing beyond Node 20 or newer and the dev dependencies installed
by `npm install`.

Repository: https://github.com/ucsandman/orrery

## Documents

- `SPEC.md`: the architecture decision, the verification strategy, and the eight
  milestones with binary acceptance criteria.
- `bar.json`: the numeric ratchet of current values against targets.
- `CLAUDE.md`: the stack, the standards, and the build and break working loop.

## Layout

```
src/core         vectors, matrices, units, time, constants, seeded rng
src/numeric      compensated summation, Stumpff functions, root finders
src/twobody      state vectors to and from elements, Kepler propagators
src/orbit        orbit classification and derived properties
src/integrators  packed state buffer, force kernel, integrators, record/replay
src/lambert      Bate-Mueller-White and Izzo Lambert solvers
src/maneuvers    Hohmann, bi-elliptic, plane-change planning
src/transfer     ephemeris, patched-conic transfer, porkchop scan
src/cr3bp        circular restricted three-body problem, Lagrange points
src/index.ts     the public barrel
test/harness     shared tolerance and conservation helpers for tests
test/break       the adversarial break-push suite
test             the milestone roadmap (now a public-surface completeness check)
```

The dependency rule is one-way: lower-numbered milestones never import
higher-numbered ones. The analytic layer uses the immutable `Vec3`; the N-body
simulation layer uses the packed `Float64Array` buffer; the two meet only at the
`fromBodies` and `toBodies` seam. The full module map is in `SPEC.md`.

## License

MIT.
