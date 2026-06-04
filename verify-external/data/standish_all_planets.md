# Standish planetary elements: provenance

`standish_all_planets.json` holds the J2000 mean orbital elements and centennial
rates for the eight major planet-system barycenters, the data the core's
`planetStateAtJD` (Curtis Algorithm 8.1) needs but does not itself expose for any
body other than Earth and Mars.

## Source

Standish (1992), mean orbital elements of the planets referred to the mean ecliptic
and equinox of J2000, as reproduced in:

Howard D. Curtis, *Orbital Mechanics for Engineering Students*, Table 8.1.

Columns and units:

- `a` semi-major axis (AU), `aRate` (AU per Julian century).
- `e` eccentricity (dimensionless), `eRate` (per century).
- `inc` inclination (degrees), `incRate` (arcseconds per century).
- `raan` longitude of the ascending node (degrees), `raanRate` (arcsec per century).
- `lonPeri` longitude of perihelion (degrees), `lonPeriRate` (arcsec per century).
- `meanLon` mean longitude (degrees), `meanLonRate` (arcsec per century).

The core derives the argument of perihelion as `lonPeri - raan` and the mean
anomaly as `meanLon - lonPeri`, matching this table's conventions.

## Frame and body choice

These elements describe each planet-system barycenter (Mercury barycenter,
Venus barycenter, Earth-Moon barycenter, Mars barycenter, and the four giant
planet barycenters), heliocentric, referred to the J2000 ecliptic. The matching
JPL Horizons fixtures therefore query the barycenter NAIF ids 1 through 8 about
the Sun (`location='@sun'`) in the ecliptic frame, so model and truth share a
frame and a center.

## Verification status

- `earth` and `mars` are byte-identical to the core's `STANDISH_EARTH` and
  `STANDISH_MARS`. The emitter (`sample/emit.ts`) asserts this equality on every
  run, so these two rows are anchored to the verified core constants.
- `mercury`, `venus`, `jupiter`, `saturn`, `uranus`, `neptune` are transcribed
  from the same Curtis Table 8.1 / Standish 1992 source and are pending an
  independent re-read against the printed table. They are exercised by the
  Standish-vs-Horizons comparison: a transcription error in any row shows up as a
  disagreement larger than the published Standish accuracy envelope, which the
  suite files as a real finding rather than passing silently.
