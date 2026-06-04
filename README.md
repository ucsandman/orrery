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

Milestone 1 of 8 is complete: vector and matrix primitives, unit conversions,
time handling (seconds from the J2000 epoch and a precision-preserving split
Julian Date), documented SI physical constants, a seeded deterministic random
generator, and compensated summation. The remaining milestones (two-body Kepler
propagation, orbit classification, N-body integration, the Lambert solver,
maneuver planning, patched-conic interplanetary transfer, and the circular
restricted three-body problem) are specified in `SPEC.md` and tracked in
`bar.json`.

## Quick start

```
npm install
npm test          # run the test suite
npm run typecheck # typecheck with no emit
npm run check     # typecheck then test
```

The core needs nothing beyond Node 20 or newer and the dev dependencies installed
by `npm install`.

## Documents

- `SPEC.md`: the architecture decision, the verification strategy, and the eight
  milestones with binary acceptance criteria.
- `bar.json`: the numeric ratchet of current values against targets.
- `CLAUDE.md`: the stack, the standards, and the build and break working loop.

## Layout

```
src/core      vectors, matrices, units, time, constants, seeded rng
src/numeric   compensated summation (more numeric helpers land with later milestones)
test/harness  shared tolerance and invariant helpers for tests
test          the milestone roadmap as pending tests
```

The full module map and the dependency rule (lower milestones never import higher
ones) are in `SPEC.md`.

## License

MIT.
