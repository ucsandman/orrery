# CLAUDE-external.md

Working agreement for `verify-external/`, the external differential-validation
layer. `SPEC-external.md` is the contract (what it checks and how). This file is
how to work on it. The core's `CLAUDE.md` and `SPEC.md` still apply; this file
adds the rules specific to the external layer.

## What this layer is

A Python oracle suite that cross-checks the unmodified TypeScript core against
truth the original build did not author: real JPL Horizons ephemerides (Oracle A)
and one independent astrodynamics library, hapsira (Oracle B). The core stays
pure: this layer lives entirely under `verify-external/`, uses Python and the
network, and never adds a runtime dependency to `src/`.

## The separation rule

- Never modify `src/`. No new planet tables, no new exports for the oracle's
  convenience. If the comparison needs data the core does not expose (the six
  non-Earth, non-Mars planet element sets), that data is committed under
  `verify-external/data/`, cited, and fed to the unmodified core function.
- The core is imported, never edited. The engine JSON emitter (`sample/emit.ts`)
  imports the public barrel from `../src` through `tsx`; it adds no code to `src/`.

## Determinism and offline rule

- Exactly one step touches the network: the one-time Horizons fixture fetch
  (`fixtures/fetch_horizons.py`), run by hand. Its output is committed JSON.
- After that fetch, the entire differential suite runs offline and
  deterministically: the engine emitter draws cases from a fixed integer seed,
  the oracle libraries do no network in the paths used (astropy IERS
  auto-download is disabled in `tests/conftest.py`), and the Horizons truth is
  the committed fixtures.
- The fetch script is never invoked by the test run.

## Tolerance discipline (the crux)

- No bare equality and no fixed decimal places. Every comparison uses the mixed
  tolerance `|a - b| <= atol + rtol * max(|a|, |b|)`.
- Every tolerance is a named constant in `tests/tolerances.py` with its cited
  source in a docstring.
- Exact methods (elements, Kepler, Lambert, maneuvers, Lagrange points) get tight
  tolerances anchored to the core's own measured internal envelope in `bar.json`
  plus headroom for the oracle's different numerical method. They are not held to
  machine precision against a second implementation.
- Approximate models get the model's own published accuracy envelope, never
  machine precision: the Standish ephemeris against its published 1800-2050
  envelope, the patched-conic transfer against its stated accuracy.

## Standards

These apply everywhere: code, comments, commit messages, generated docs.

- Zero slop. No filler, no placeholder prose, no restating the obvious.
- No em dashes, and no en dashes used as punctuation, anywhere. Use commas,
  colons, parentheses, or rewrite. Normal hyphens in compound words are fine.
- No fabricated metrics. Never invent an agreement number. Report only values
  produced by a real run, and show the command and its output. A tolerance that
  is still a target, not a measurement, is marked as such.
- Plain language. Explain each term the first time it appears.
- Direct and honest. State disagreements and gaps plainly.

## Build and break loop

- A build push extends coverage of the comparison: another category wired to its
  oracle, another planet's fixtures, a tighter measured tolerance.
- A break push generates cases that maximize disagreement (extreme eccentricity,
  very long time of flight, multi-revolution, retrograde, near-parabolic,
  near-collinear) and asserts agreement within tolerance, or files the
  discrepancy as a failing test that records the case before any fix.

`bar-external.json` is the external ratchet. Each entry has a current value (the
worst agreement error seen in a real run, or a baseline sentinel before the first
run) and a target traced to a source. Current values move toward target only
through verified runs.

## Commands

```
# one-time, network, run by hand, output committed:
verify-external/.venv/Scripts/python.exe verify-external/fixtures/fetch_horizons.py

# offline differential run (emit engine outputs, then check against oracles):
npm --prefix verify-external run emit:all
verify-external/.venv/Scripts/python.exe -m pytest verify-external/tests -q

# one break push (round N draws a distinct adversarial sample via the seed offset):
npm --prefix verify-external run emit:all -- adversarial N
ORRERY_PROFILE=adversarial verify-external/.venv/Scripts/python.exe -m pytest verify-external/tests -q
```

The break push runs the same test bodies against the adversarial sample
(`ORRERY_PROFILE=adversarial` switches `load_generated` to the `*.adversarial.json`
files). Its artifacts are gitignored; the committed fixtures stay the nominal
sample. A disagreement above tolerance is either a real engine finding filed as a
failing test or an explained oracle-domain limit (for example hapsira `danby` is an
elliptic-and-parabolic solver, so the hyperbolic Kepler oracle is the robust
all-conic `farnocchia`).

## Turn close protocol

End every turn with a fenced STATUS block containing:

- the literal output tail of the differential run with its exit code, pasted from
  a real run, never summarized into a claim;
- every `bar-external.json` value next to its target;
- a one-line note on what advanced and what remains;
- any red comparison (a category disagreeing above tolerance), named.

Never call a result passing without the output that shows it.
