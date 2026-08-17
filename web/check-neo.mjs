/**
 * Live check of the near-Earth asteroid control in web/panels/solar.js.
 *
 * Needs network. Run by hand, never from `npm test`: the core suite is offline by
 * rule, and vitest.config.ts only includes src/** and test/**. It fetches the same
 * NeoWs page the panel fetches and runs the panel's own propagation: coeToRv once at
 * perihelion, where true anomaly is 0 by definition, then propagateUniversal to any
 * date. Two checks, both driven by a Julian date so the time base is genuinely under
 * test, not just the static conic geometry:
 *
 *   A. At the object's own perihelion and half a period later, the panel's route must
 *      land on the perihelion and aphelion distances NASA publishes. NASA is the
 *      external oracle. Propagating through mu also means a wrong mu moves this
 *      check, not just a wrong angle or a wrong epoch.
 *   B. At eight other dates, the panel's route (coeToRv once, then propagateUniversal)
 *      must agree with an independent route: the classical mean-to-eccentric-to-true
 *      chain (the core's danby, then coeToRv at the resulting true anomaly), computed
 *      from four catalogue fields (mean_anomaly, mean_motion, epoch_osculation,
 *      perihelion_time) the panel's route never reads.
 *
 * What neither check catches: an angle-unit error (a missed degree-to-radian
 * conversion) or a length-unit error (AU_KM). Both routes are fed the same AU_KM and
 * the same pre-converted radians, so if either were wrong, both sides of every
 * comparison would be wrong together and the check would stay green. Do not add a
 * claim here that this catches unit errors without first breaking one on purpose and
 * watching the script go red.
 *
 * Usage:
 *     npm run build:web
 *     npm run verify:neo
 *     npm run verify:neo -- YOURKEY   # override the rate-limited shared DEMO_KEY
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The playground bundle is an IIFE that assigns a global, not an ES module. Evaluate
// it and take the completion value rather than adding a second esbuild target. This
// is required in eval form because the bundle opens with "use strict", which gives
// the eval its own variable scope so `var Orrery` does not leak.
const bundle = readFileSync(fileURLToPath(new URL('./orrery-core.js', import.meta.url)), 'utf8')
const O = eval(bundle + '\nOrrery')

const AU_KM = 1.49597871e8          // the value web/data/planets.js and Curtis use
const MU_SUN_KM = O.MU_SUN / 1e9    // m^3/s^2 to km^3/s^2
const RTOL_PUBLISHED = 1e-9         // A: NASA prints q and Q to 16 digits
// B: measured live against real Eros data (2000433) at 2.512e-8, not machine epsilon.
// A synthetic, exactly self-consistent orbit agrees to ~1e-14 (checked by feeding this
// same script's math a fabricated element set whose period comes from this core's own
// mu instead of a catalogue value), so the gap is not solver noise: NASA's published
// orbital_period and mean_motion describe a real, perturbed, observed orbit and are
// not perfectly self-consistent with an idealized two-body propagation under this
// core's fixed solar mu. Route 1 (time and mu) and Route 2 (NASA's own mean motion)
// then trace slightly different phase away from the perihelion/aphelion extrema, which
// is exactly where check A sits and stays exact (radius is flat at an extremum, so a
// small phase error barely moves it). 1e-6 keeps a wide margin over the one measured
// value while staying far tighter than an actual logic bug (the old design's injected
// mean-for-true-anomaly bug moved its equivalent check to 8.172e-1).
const RTOL_ROUTES = 1e-6
// Built through URLSearchParams, same as web/panels/solar.js, so the key is encoded
// by URLSearchParams rather than concatenated into the query string by hand. Override
// the shared, rate-limited demo key with an argv value, e.g. `npm run verify:neo -- YOURKEY`.
const BROWSE_URL = 'https://api.nasa.gov/neo/rest/v1/neo/browse?' +
  new URLSearchParams({ api_key: process.argv[2] || 'DEMO_KEY' })

// The whole run lives inside an async function, and every exit path sets
// process.exitCode then returns, rather than calling process.exit() directly.
// Measured on this machine (Node 24, Windows): calling process.exit() right after an
// undici fetch() can crash the process with a libuv "UV_HANDLE_CLOSING" assertion
// (src/win/async.c) before the exit code is even reported, reproduced with a
// three-line script containing nothing but fetch() and process.exit(). Setting
// process.exitCode and letting the module finish lets Node close the connection on
// its own and avoids it.
async function main() {
  const abort = new AbortController()
  const abortTimer = setTimeout(() => abort.abort(), 30000)

  let res, body
  try {
    res = await fetch(BROWSE_URL, { signal: abort.signal })
    body = await res.json().catch(() => null)
  } catch (err) {
    console.error('NeoWs unreachable: ' + ((err && err.message) || err))
    process.exitCode = 1
    return
  } finally {
    clearTimeout(abortTimer)
  }
  if (!res.ok) {
    console.error(`NASA ${res.status}: ${(body && body.error && body.error.message) || res.statusText}`)
    process.exitCode = 1
    return
  }

  let checked = 0, skipped = 0, worstA = 0, worstB = 0
  for (const obj of Array.isArray(body && body.near_earth_objects) ? body.near_earth_objects : []) {
    const d = obj.orbital_data || {}
    const num = (k) => parseFloat(d[k]) // every element arrives as a JSON string
    const a = num('semi_major_axis'), e = num('eccentricity'), q = num('perihelion_distance'), Q = num('aphelion_distance'), P = num('orbital_period'), tp = num('perihelion_time'), ma = num('mean_anomaly'), n = num('mean_motion'), ep = num('epoch_osculation')
    const i = O.degToRad(num('inclination'))
    const raan = O.degToRad(num('ascending_node_longitude'))
    const argp = O.degToRad(num('perihelion_argument'))
    const all = [a, e, q, Q, P, tp, ma, n, ep, i, raan, argp]
    if (!all.every(Number.isFinite) || e >= 1 || a <= 0) { skipped++; continue }

    // Route 1: exactly what the panel does.
    const s0 = O.coeToRv(a * AU_KM, e, i, raan, argp, 0, MU_SUN_KM)
    const panelAt = (j) => {
      const days = (((j - tp) % P) + P) % P
      return O.propagateUniversal(s0.r, s0.v, days * 86400, MU_SUN_KM).r
    }

    // Route 2: the classical mean -> eccentric -> true chain, from four catalogue
    // fields the panel never reads.
    const classicAt = (j) => {
      const M = O.degToRad(((((ma + n * (j - ep)) % 360) + 360) % 360))
      const E = O.danby((x) => x - e * Math.sin(x) - M, (x) => 1 - e * Math.cos(x), (x) => e * Math.sin(x), M)
      const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
      return O.coeToRv(a * AU_KM, e, i, raan, argp, nu, MU_SUN_KM).r
    }

    worstA = Math.max(
      worstA,
      Math.abs(O.norm(panelAt(tp)) / AU_KM - q) / q,
      Math.abs(O.norm(panelAt(tp + P / 2)) / AU_KM - Q) / Q,
    )
    for (const f of [1 / 12, 1 / 6, 1 / 4, 1 / 3, 5 / 12, 7 / 12, 3 / 4, 11 / 12]) {
      const j = tp + f * P
      const p = panelAt(j), c = classicAt(j)
      const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z
      worstB = Math.max(worstB, Math.sqrt(dx * dx + dy * dy + dz * dz) / O.norm(c))
    }
    checked++
  }

  // checked > 0 is part of the gate: an empty payload must not read as a pass.
  const okA = checked > 0 && worstA <= RTOL_PUBLISHED
  const okB = checked > 0 && worstB <= RTOL_ROUTES
  console.log(`checked ${checked} objects, skipped ${skipped}`)
  console.log(`A distance vs NASA q and Q:     worst ${worstA.toExponential(3)} (limit ${RTOL_PUBLISHED}) ${okA ? 'PASS' : 'FAIL'}`)
  console.log(`B propagateUniversal vs danby:  worst ${worstB.toExponential(3)} (limit ${RTOL_ROUTES}) ${okB ? 'PASS' : 'FAIL'}`)
  process.exitCode = okA && okB ? 0 : 1
}

await main()
