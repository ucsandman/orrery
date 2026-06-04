# CLAUDE.md

Working agreement for Orrery. `SPEC.md` is the contract (what to build and how it
is verified); this file is how to work on it. Read both before changing code.

## What Orrery is

A deterministic astrodynamics engine and mission planner. A pure TypeScript core
of orbital mechanics, validated against closed-form solutions and physical
conservation laws, with a thin Hono API and a Next.js plus PixiJS sandbox layered
on top later.

## Stack

- TypeScript throughout, ES modules, Node 20 or newer.
- Vitest for tests, with fast-check for property-based fuzzing where it fits.
- Hono for the API, kept thin, added only after the core milestones are green.
- Next.js with PixiJS for two-dimensional orbit and trajectory views, Tailwind
  for styling, Zustand for state. The frontend is a later layer and is never a
  prerequisite for core verification.
- Persistence, if any, with Neon and Drizzle behind the API only, never required
  to run or test the core.

Do not introduce an alternative to any of the above without writing the reason in
`SPEC.md` first.

## The dependency-free core rule

The core (`src/`) is pure. At runtime it does no network, no database, no file
input or output, and reads no environment variables. It runs and is fully tested
offline. `Math.random`, `Date.now`, and `performance.now` are forbidden in the
core; randomness comes only from the seeded generator in `src/core/rng.ts`, and
time is an explicit input. Dev and test dependencies (TypeScript, Vitest,
fast-check) are fine; runtime core dependencies are not. Environment variables and
`.env` files arrive only with the API layer, never in the core, and every new one
goes in `.env.example` with a placeholder.

## Repository layout

See the module layout in `SPEC.md`. The rule: lower-numbered milestones never
import higher-numbered ones. The analytic layer uses the immutable `Vec3` value
type; the N-body simulation layer uses a packed `Float64Array` buffer; the two
meet only at the `fromBodies` and `toBodies` seam.

## Standards

These apply everywhere: code, comments, generated docs, UI copy, commit messages.

- Zero slop. No filler, no placeholder prose, no restating the obvious.
- No em dashes, and no en dashes used as punctuation, anywhere. Use commas,
  colons, parentheses, or rewrite the sentence. Normal hyphens in compound words
  are fine.
- No fabricated metrics. Never invent benchmark numbers, accuracy figures, or
  performance claims. Report only values produced by a real run, and show the
  command and its output. A tolerance that is still a target, not a measurement,
  is marked as such.
- Plain language. Explain each astrodynamics term the first time it appears.
- Direct and honest. No flattery, no hedging filler. State tradeoffs plainly.

## Determinism contract

The force kernel's pair iteration order and operand order are public. Changing
them is a breaking change. Simulation time is `stepIndex * dt`, never an
accumulated sum. The hot loop uses only correctly-rounded arithmetic (add,
subtract, multiply, divide, square root); transcendental functions stay in the
analytic layer, whose cross-engine bit-identity is pinned to a Node and V8 major
version. Full detail is in the determinism section of `SPEC.md`.

## Verification rules

- Two-body analytic solutions are ground truth.
- No physics assertion uses bare equality or a fixed number of decimal places.
  Use the mixed tolerance helper, `|a - b| <= atol + rtol max(|a|, |b|)`. Every
  tolerance is a named, commented constant that traces to a source or a measured
  run.
- Conservation invariants (energy, linear momentum, angular momentum) stay within
  stated drift limits, and no NaN or Infinity ever appears.
- Run the tests and the typecheck and read the output before claiming anything
  passes. Evidence, not assertions.

## Build and break loop

Work proceeds as alternating pushes.

- A build push extends the engine toward the next milestone in `SPEC.md`.
- A break push tries to falsify the engine: random multi-body scenes checked
  against the conservation invariants, random two-body cases checked against the
  analytic solution, random Lambert problems checked by re-propagation, and
  adversarial edge cases (near-parabolic orbits, extreme eccentricity, exact
  collisions, degenerate coplanar geometry). A break push that finds a failure
  files it as a failing test before any fix is attempted.

`bar.json` is the ratchet. Each entry has a current value and a target. Current
values move toward target only through verified runs.

## Commands

```
npm test          run the vitest suite once
npm run test:watch  run vitest in watch mode
npm run typecheck   typecheck with tsc, no emit
npm run check       typecheck then test
```

## Turn close protocol

End every turn with a fenced STATUS block containing:

- the literal output tail of the test run with its exit code, pasted from a real
  run, never summarized into a claim;
- the current `bar.json` values next to their targets;
- a one-line note on what advanced and what remains;
- any invariant that is currently red.

Never call a result passing without the output that shows it.
