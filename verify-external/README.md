# verify-external

An external differential-validation layer for the Orrery core. It checks the
unmodified TypeScript core against truth the original build did not author: real
JPL Horizons ephemerides (Oracle A) and one independent astrodynamics library,
hapsira (Oracle B). The core keeps its zero runtime dependency rule; this layer
lives entirely here and may use Python and the network.

Read `SPEC-external.md` for the contract and `CLAUDE-external.md` for the working
agreement. The external ratchet is `bar-external.json`.

## Layout

```
sample/        TypeScript engine JSON emitter (run via tsx), seeded case generators
data/          Standish planet element tables (cited) the core does not expose
fixtures/      committed JPL Horizons truth + the one-time fetch script
generated/     committed engine-output JSON, one file per category (the audit artifact)
tests/         pytest differential runner, tolerances, oracle wrappers
```

## Install

```
# Python oracle (hapsira pulls astropy, astroquery, numba, numpy, scipy):
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.lock

# Node emitter (tsx, no build step):
npm install
```

## One-time Horizons fetch (network, run by hand, output committed)

```
.venv/Scripts/python.exe fixtures/fetch_horizons.py
```

This writes `fixtures/horizons_planets.json`, which is committed. The test run
never touches the network.

## Run the differential suite (offline, deterministic)

```
npm run emit:all
.venv/Scripts/python.exe -m pytest tests -q
```

`emit:all` regenerates the committed engine outputs under `generated/` from the
fixed per-category seeds in `sample/seeds.ts`. pytest then checks each engine
output against its oracle within the named tolerances in `tests/tolerances.py`.

## Pinned oracle

hapsira 0.18.0 (the maintained poliastro fork), with scipy and cited closed forms
for the pieces hapsira does not cover. The full resolved dependency set is pinned
in `requirements.lock`. pykep was rejected because it ships no Windows wheel on
PyPI; poliastro was archived in October 2023.
