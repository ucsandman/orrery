# Decision log


---

# Recovered decisions (claude-mem archive)

15 decisions recovered 2026-08-11 from the claude-mem store before it was pruned. Source window 2026-04-06 to 2026-06-11. Full archive with observations and session summaries: `C:\Projectsrchives\claude-mem-2026-08-11\`.

## 2026-06-04 — Multi-agent design workflow for Orrery astrodynamics core architecture

Created four-phase workflow to explore scope, draft architectures, judge candidates, and synthesize final design dossier

- Workflow explores five independent design angles: numerical integration and determinism, two-body analytic Kepler propagation, Lambert solver and maneuvers, circular restricted three-body problem with Lagrange points, and TypeScript architecture with testing strategy
- Three candidate architectures drafted: functional-immutable (pure functions, immutable values), data-oriented typed-array (Float64Array buffers, in-place mutation), and hybrid-layered (immutable analytic layer plus mutable N-body simulation layer)
- Judge panel evaluates each candidate across four criteria: correctness (precision loss, singular cases), testability (property-based testing, invariants), determinism (bit-identical replay), and performance (long N-body integrations)
- Final dossier includes tolerance tables, verified reference values with sources, adversarial edge cases, conservation invariants with drift limits, and binary measurable acceptance criteria per milestone
- Workflow enforces strict standards: no em or en dashes as punctuation, no fabricated metrics or benchmark numbers, plain language explanations, direct tradeoff statements
- Structured JSON schemas force concrete outputs: EXPLORE_SCHEMA captures findings and reference values, ARCH_SCHEMA captures module layout and type decisions, VERDICT_SCHEMA captures numeric scores, DOSSIER_SCHEMA captures complete design specification

Files: `.orrery-design-workflow.mjs`

## 2026-06-04 — Orrery project initialized with dependency-free deterministic astrodynamics architecture

TypeScript project configured with strict mode, vitest testing, and data-oriented SoA buffer design for N-body simulation

- Project Orrery initialized with TypeScript 6.0.3, vitest 4.1.8, and fast-check 4.8.0 for property testing
- TypeScript configured with ES2022 target, strict mode, noUncheckedIndexedAccess, and verbatimModuleSyntax enabled
- Vitest configured to run tests from src/**/*.test.ts and test/**/*.test.ts in node environment
- Architecture decision: Structure-of-Arrays (SoA) with Float64Array buffers for N-body integrators, immutable value types for analytic milestones
- Core design: Vec3 as addressing convention (buffer, offset) not a type, with in-place mutation confined to sim layer
- Determinism enforced via fixed iteration order, integer step counter, no Date.now/Math.random, and byte-level ArrayBuffer replay
- Eight milestones defined: vector/time/units, Kepler two-body, orbit classification, N-body integration, Lambert solver, maneuvers, patched-conic transfer, CR3BP
- SI units (m, s, kg, rad) internally with boundary-only conversions, constants module as single source of physical values

Files: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`

## 2026-06-04 — Three architectural candidates evaluated for Orrery astrodynamics core

Design workflow explored data-oriented SoA, functional immutable, and hybrid layered architectures with full tradeoff analysis

- Architecture candidate 1: Data-oriented typed-array with Structure-of-Arrays (SoA) Float64Array buffers for all state, Vec3 as addressing convention not a type
- Architecture candidate 2: Functional immutable with Vec3 as readonly object type, pure free functions, O(N) allocation per substep accepted for clarity
- Architecture candidate 3: Hybrid layered splitting analytic layer (Vec3 immutable objects) from simulation layer (packed Float64Array buffers) with narrow seam
- All three designs enforce determinism via fixed iteration order, integer step counting, no Date.now/Math.random, and basic arithmetic only in hot loop
- PEFRL coefficients specified as xi=0.1786178958448091, lambda=-0.2123418310626054, chi=-0.6626458266981849 across all designs
- Verification strategy consistent across designs: two-body analytic oracle, conservation invariants, cross-integrator checks, Lambert re-propagation
- Physical constants standardized to IAU 2015 nominal GM values, JPL DE440 for higher precision, CODATA 2018 for G, all SI internally
- Eight milestones defined identically: vec3/time/units, Kepler two-body, orbit classification, N-body integration, Lambert, maneuvers, patched-conic, CR3BP

## 2026-06-04 — Hybrid layered architecture selected as Orrery core design

Combines immutable Vec3 analytic layer with packed buffer simulation layer, scored 8/9/9/8 on correctness/testability/determinism/performance

- Hybrid layered scored highest on testability (9) and determinism (9), matching functional immutable on testability and data-oriented on determinism
- Functional immutable penalized for dual numeric paths (escape hatch creates silent fork risk if CI byte-check skipped), determinism scored only 6
- Data-oriented penalized for untyped Float64Array offset math (highest-probability defect per its own spec), testability and correctness both scored 6
- Hybrid avoids both failure modes: single buffer numeric path (no fork risk) and analytic API never sees offset math
- Hybrid provides two independent cross-check implementations: universal-variable vs per-regime Kepler, Izzo vs BMW Lambert to 1e-9 precision
- Seam risk bounded: fromBodies/toBodies are two auditable functions invoked exactly twice per run, testable as scatter(gather(i)) identity
- Replay mechanism: ArrayBuffer byte-equality compare on packed Float64Array(6*N) state with zero per-step allocation for GC-free determinism

## 2026-06-04 — Hybrid layered architecture re-confirmed from performance and maintainability perspective

Single hot-loop implementation avoids escape-hatch maintenance burden, scores 9/9/9/9 across all criteria from scalability judge

- Hybrid layered scored 9 across correctness, testability, determinism, and performance from performance-focused evaluation
- Functional immutable penalized for PEFRL allocating ~9*N objects per step, billions over multi-million-step runs, and dual hot-loop maintenance burden from escape hatch
- Data-oriented penalized for noUncheckedIndexedAccess friction (number|undefined on every read), silent 3*i offset bugs with no type help
- Hybrid achieves zero per-step allocation on simulation layer (packed Float64Array) while keeping analytic layer on immutable Vec3 where allocation invisible
- Hybrid seam overhead: fromBodies/toBodies conversion runs O(N) exactly twice per run cycle (build and snapshots), never inside step loop
- Single hot-loop code path in hybrid (no escape hatch fork) eliminates byte-equality drift risk flagged in functional immutable design
- Hybrid includes Izzo Lambert for production multi-revolution support serving porkchop scans, BMW-only designs weaker on multi-rev enumeration

## 2026-06-04 — Hybrid layered architecture validated by third independent judge for physics fidelity

Scored 9/9/9/8, confines buffer hazards to milestone 4 only, provides dual independent Kepler and Lambert implementations

- Physics fidelity judge scored hybrid 9/9/9/8 on correctness/testability/determinism/performance, highest overall evaluation
- Three independent judges converged on hybrid layered from distinct perspectives: testability/determinism, performance/maintainability, physics fidelity
- Hybrid provides strongest validation backbone: two independent Kepler implementations (universal-variable vs per-regime Danby/Newton/Barker), two Lambert solvers (Izzo vs BMW), Forest-Ruth as second 4th-order symplectic cross-check
- Precision-critical analytic physics (COE-RV, Kepler, Lambert, CR3BP, maneuvers) isolated on immutable Vec3 layer where singular geometry and cancellation bugs occur
- Data-oriented penalized for raw Float64Array 3*i offset arithmetic being silent when wrong across all milestones, design admits this as highest-probability defect
- Functional immutable penalized for second code path (packed-array escape hatch) that can drift from reference if CI byte-check skipped
- Hybrid explicitly flags unproven claims: PEFRL vs Forest-Ruth accuracy advantage marked verified=false, GM trailing digits need confirmation, FMA contraction assumption to be tested

## 2026-06-04 — Hybrid layered architecture selected for Orrery astrodynamics engine

Design workflow evaluated three architectures and chose hybrid approach separating immutable analytic layer from packed-buffer simulation layer.

- Hybrid layered architecture chosen over functional immutable and data-oriented typed-array approaches after multi-judge evaluation scoring correctness, testability, determinism, and performance.
- Analytic layer uses immutable Vec3 = {readonly x, y, z} with pure functions for two-body Kepler, Lambert, maneuvers, and CR3BP physics where NaN-emitting edge cases concentrate.
- Simulation layer uses packed Float64Array(6*N) buffer with interleaved position-velocity for N-body integration hot loop achieving zero per-step allocation.
- Seam between layers consists of exactly two functions (fromBodies/toBodies) plus one Body type, invoked twice per run cycle, never inside step loop.
- Verification strategy enforces dual independent implementations: universal-variable versus per-regime Kepler solvers must agree to 1e-9, Izzo versus Bate-Mueller-White Lambert solvers must agree to 1e-9.
- Four integrators defined: velocity-Verlet leapfrog (2nd order symplectic baseline), PEFRL (4th order symplectic production), Forest-Ruth (4th order symplectic cross-check), RK4 (4th order non-symplectic reference).
- Determinism enforced through fixed floating-point operation order, seeded PRNG (splitmix64 to xoshiro256**), integer-driven time (stepIndex*h not running sum), and ArrayBuffer byte-equality replay verification.
- Complete module layout defined: 26 modules across src/core (constants, vec3, mat3, units, time, rng), src/numeric (stumpff, rootfind, sum), src/twobody, src/orbit, src/integrators, src/lambert, src/maneuvers, src/transfer, src/cr3bp, plus test harness.

## 2026-06-04 — Project quality gates and architectural constraints established

Test-driven development workflow defined with bar.json thresholds, break testing, and pure core library constraint

- Success criteria require all SPEC.md acceptance criteria demonstrated by passing tests
- All bar.json thresholds must reach targets with no regression from previous turns
- Three consecutive break pushes must find zero new failures before completion
- Hard constraints prohibit weakening or deleting tests and lowering bar.json targets
- Core library must remain free of network, database, file IO, and environment variables
- Two-body analytic solution and conservation invariants serve as ground truth overriding heuristics
- Work limited to 60 turns maximum with STATUS block required at end of each turn

## 2026-06-04 — Design workflow initiated for external validation layer

Multi-agent workflow created to design differential testing architecture against external oracles

- Task created to run design workflow for external validation layer with ID 1
- Workflow will fan out parallel agents for Oracle B library selection, Oracle A Horizons fetch recipe, tolerance and architecture design, and red team review
- Design outputs will be synthesized into SPEC-external.md, bar-external.json, CLAUDE-external.md, and runner implementation
- External validation layer will be built in separate verify-external workspace to maintain core package zero-dependency rule

## 2026-06-04 — External differential validation layer architecture

Designing separate verification workspace to validate Orrery core against real ephemerides and independent astrodynamics library

- External validation layer will live in verify-external/ directory to preserve core's zero runtime dependency rule
- Oracle A uses JPL Horizons real ephemerides fetched once and committed as fixtures for offline deterministic testing
- Oracle B uses one pinned external Python astrodynamics library as independent implementation
- Validation covers elements conversion, Kepler propagation, Lambert solver, maneuvers (Hohmann/bi-elliptic/plane-change), and Lagrange points
- Tolerance discipline distinguishes exact methods (tight tolerances) from approximate models (Standish ephemeris gets published accuracy envelope, not machine precision)
- Design workflow spawned to research library selection, Horizons fixture recipe, tolerance architecture, and convention traps
- bar-external.json will track maximum agreement error per category, fixture count, sample size, and zero unexplained disagreements
- After one-time fixture generation, entire differential suite runs offline against committed fixtures and fixed RNG seed

## 2026-06-04 — Pykep selected as independent astrodynamics oracle library

ESA pykep library provides ic2par, par2ic, propagate_lagrangian, and lambert_problem in SI units

- Pykep library identified as /esa/pykep with 238 code snippets and high reputation
- All pykep functions use SI units (meters, m^3/s^2, radians) internally
- ic2par converts Cartesian state vector to Keplerian elements (a, e, i, W, w, M order)
- par2ic converts Keplerian elements back to Cartesian state vector
- propagate_lagrangian performs Keplerian propagation from state vector and time delta
- lambert_problem supports multi-revolution solutions via max_revs parameter
- MU_SUN constant available as pk.MU_SUN in m^3/s^2

## 2026-06-04 — Task created to wire patched-conic transfer validation against independent Lambert oracle

Will add transferArc category comparing engine v_inf against hapsira izzo heliocentric solver to move bar-external patchedConicVsReference from null to measured

- Task created to wire patchedConicVsReference validation: new emit category, oracle wrapper, pytest test comparing transferArc hyperbolic excess speeds
- Validation will use independent heliocentric Lambert oracle (hapsira izzo) rather than the engine's lambertBMW solver used by transferArc
- Target tolerance is 1e-3 relative for v_inf (patched-conic published accuracy envelope), not machine precision
- bar-external.json patchedConicVsReference.current currently null (pending), will be updated to measured worst-case agreement after implementation
- This extends external validation coverage from 6 active categories to 7, completing the baseline coverage for all major analytic operations

## 2026-06-04 — Five-task roadmap created to complete external validation acceptance criteria

Tasks cover patched-conic wiring, Lambert multi-rev, Horizons propagation check, sample size increase to 1024, and three adversarial break pushes

- Task 1: Wire patchedConicVsReference validation comparing transferArc v_inf against hapsira izzo heliocentric Lambert oracle
- Task 2: Extend Lambert validation to multi-revolution branches (revs>0, left/right) matching engine against hapsira izzo with M>0
- Task 3: Add Oracle A second check - propagateUniversal of Horizons state vs later Horizons state using new short-span fixture (network one-time fetch)
- Task 4: Raise SAMPLE_SIZE_NOMINAL from 256 to 1024 in seeds.ts, re-emit all categories, confirm all tolerances hold with no regression, update bar-external from measured.json
- Task 5: Run three consecutive adversarial break pushes with extreme-case generators, target zero new unexplained disagreements, file any exceedance as failing test before fix
- Roadmap addresses SPEC-external.md requirements: both Oracle A checks (Standish + propagation), Oracle B coverage (all operations including multi-rev Lambert), build push (extend coverage), break push (adversarial cases)

## 2026-06-04 — Launched multi-agent review workflow for playground quality verification

Four-lens parallel review examines correctness, robustness, code quality, and UX across 10 playground files with adversarial verification

- Workflow playground-review launched with ID wf_e22a7053-50c to review 10 web playground files
- Review phase uses four parallel lenses: correctness (rendering/physics mapping), robustness (edge cases/errors), quality (code patterns), UX (accessibility/usability)
- Each lens reviews subset of files with structured schema requiring file, severity, confidence, issue, evidence, and fix fields
- Verify phase adversarially checks high/medium severity findings against actual current code to confirm reality and fix-worthiness
- Context provided to agents includes complete core API surface, SI unit conventions, and confirmation that numeric engine tests already passed
- Review instructed to focus on what headless tests cannot catch: rendering bugs, coordinate mapping, unit display, animation correctness, error handling, UX issues

## 2026-06-04 — Verification workflow constraints and ground truth hierarchy established

Rigorous testing framework with hard constraints on tolerance changes and dependency isolation

- Core package must remain free of runtime dependencies
- verify-external module may use Python or network, core package may not
- Horizons fixtures and pinned independent library are ground truth that override the engine
- Tolerance changes require cited justification written in spec
- Success criteria: all acceptance criteria in SPEC-external.md pass, all thresholds in bar-external.json meet targets, three consecutive break pushes with zero unexplained disagreements
- Hard constraint: never loosen tolerance to pass tests, never edit committed Horizons fixtures to pass

