/**
 * Solar System panel: the orrery itself.
 *
 * Each planet's heliocentric position comes from the core's planetStateAtJD (Curtis
 * Algorithm 8.1) applied to the cited Standish element tables. Scrub or play the
 * date and the planets move along their real orbits. This is the approximate
 * low-precision model (a few arcminutes over 1800-2050), not an ephemeris.
 *
 * The near-Earth asteroid control adds one real object from NASA's NeoWs catalogue.
 * Its state vector is built once, at perihelion, where true anomaly is 0 by
 * definition, with the core's coeToRv, then advanced to any date with
 * propagateUniversal: the same build-once-then-propagate pattern the Orbit Designer
 * and Lambert Transfer panels already use. This panel still contains no orbital
 * mechanics of its own.
 */
;(function () {
  const O = window.Orrery
  const AU_KM = window.AU_KM
  const MU_SUN_KM = O.MU_SUN / 1e9
  const J2000 = O.J2000_JD

  // NeoWs /neo/browse returns twenty well known near-Earth asteroids with their full
  // orbital elements in one response, and sends Access-Control-Allow-Origin: *, so the
  // whole control costs one direct request and needs no proxy.
  //
  // NASA publishes a shared, unauthenticated, rate-limited-per-IP demo credential for
  // exactly this kind of public client-side use (see api.nasa.gov); it is not a secret
  // and ships hardcoded in NASA's own docs and sample code. A visitor who wants their
  // own quota can add ?nasa_key=YOURKEY to the page URL; that value, if present, is
  // used instead and nothing personal is ever stored in this repository.
  function neoApiKey() {
    return new URLSearchParams(location.search).get('nasa_key') || 'DEMO_KEY'
  }
  // Built through URLSearchParams so a visitor-supplied key is encoded, not pasted raw.
  const NEO_URL = 'https://api.nasa.gov/neo/rest/v1/neo/browse?' +
    new URLSearchParams({ api_key: neoApiKey() })

  UI.registerPanel({
    id: 'solar',
    label: 'Solar System',
    hint: 'The planets at any date, from the Standish model in the core. Drag the date or press Play. Switch between the inner planets and the full system (the scale jumps from ~1.5 AU to ~30 AU). Load from NASA adds one real near-Earth asteroid from the NeoWs catalogue, its state built once at perihelion and advanced with the same two-body propagator the Orbit and Transfer panels use. Its elements are osculating at a single recent epoch, so dates far from that epoch drift and close planetary encounters are not modelled. The shared NASA demo key is rate limited; add ?nasa_key=YOURKEY to the page URL to use your own.',
    setup({ controls, vp }) {
      const st = { year: 2000, speed: 2, inner: true }
      let rings = []

      const t = UI.section(controls, 'Time')
      const yearCtl = UI.slider(t, { label: 'epoch (year)', min: 1900, max: 2050, step: 0.02, value: st.year, fmt: (v) => v.toFixed(1) }, (v) => { st.year = v; render() })
      UI.slider(t, { label: 'play speed', min: 0.1, max: 25, step: 0.1, value: st.speed, fmt: (v) => v.toFixed(1) + ' yr/s' }, (v) => { st.speed = v })
      const anim = UI.loop((dt) => {
        st.year += dt * st.speed
        if (st.year > 2050) st.year = 1900
        yearCtl.set(st.year)
        render()
      }, vp.canvas)
      UI.playButton(controls, anim)
      UI.select(UI.section(controls, 'View'), { label: 'planets', options: [
        { label: 'Inner (Mercury–Mars)', value: true }, { label: 'All eight', value: false },
      ] }, (v) => { st.inner = v; buildRings(); vp.resetView(); render() }) // reframe cleanly (the scale jumps ~18x)

      const out = UI.readout(UI.section(controls, 'Heliocentric distance'))

      const shown = () => (st.inner ? window.PLANETS.slice(0, 4) : window.PLANETS)
      const jd = () => J2000 + (st.year - 2000) * 365.25
      function posAU(planet, j) {
        const s = O.planetStateAtJD(planet.el, j, MU_SUN_KM, AU_KM)
        return [s.r.x / AU_KM, s.r.y / AU_KM, O.norm(s.r) / AU_KM]
      }

      // --- near-Earth asteroid, live from NASA -------------------------------
      let neo = null

      /** One NeoWs object to the numbers this panel needs, or null if unusable. */
      function parseNeo(obj) {
        const d = obj.orbital_data || {}
        const num = (k) => parseFloat(d[k]) // every element arrives as a JSON string
        const o = {
          name: obj.name_limited || obj.name,
          a: num('semi_major_axis'),        // AU
          e: num('eccentricity'),
          period: num('orbital_period'),    // days
          tp: num('perihelion_time'),       // Julian date; true anomaly is 0 here by definition
          q: num('perihelion_distance'),    // AU
          Q: num('aphelion_distance'),      // AU
          i: O.degToRad(num('inclination')),
          raan: O.degToRad(num('ascending_node_longitude')),
          argp: O.degToRad(num('perihelion_argument')),
        }
        // Reject anything that would draw a wrong orbit rather than no orbit: a field
        // that did not parse (parseFloat of a missing key is NaN), a non-string name,
        // or an unbound orbit, for which coeToRv's p = a (1 - e^2) is negative and the
        // conic is not an ellipse. A rejected object is dropped, never plotted.
        const numbers = [o.a, o.e, o.period, o.tp, o.q, o.Q, o.i, o.raan, o.argp]
        return numbers.every(Number.isFinite) && typeof o.name === 'string' && o.name && o.e < 1 && o.a > 0 ? o : null
      }

      /**
       * The asteroid at a Julian date, as [x AU, y AU, |r| AU]. neo.r0 / neo.v0 is the
       * state vector coeToRv built once at perihelion; propagateUniversal advances it
       * the same way orbit.js advances its rocket and transfer.js flies its arc.
       */
      function neoState(j) {
        const days = (((j - neo.tp) % neo.period) + neo.period) % neo.period
        const s = O.propagateUniversal(neo.r0, neo.v0, days * 86400, MU_SUN_KM)
        return [s.r.x / AU_KM, s.r.y / AU_KM, O.norm(s.r) / AU_KM]
      }

      function setNeo(o) {
        neo = o
        try {
          const s0 = O.coeToRv(neo.a * AU_KM, neo.e, neo.i, neo.raan, neo.argp, 0, MU_SUN_KM)
          neo.r0 = s0.r
          neo.v0 = s0.v
          // One full period at the same 240-sample density as the planet rings. Also
          // exhausts the propagator over this object's whole domain up front, so a
          // later per-frame call cannot be the first one to throw and stop the planets.
          const j0 = jd(), pts = []
          for (let k = 0; k <= 240; k++) {
            const p = neoState(j0 + (k / 240) * neo.period)
            pts.push([p[0], p[1]])
          }
          neo.pts = pts
        } catch (err) {
          neo = null
          out.set('asteroid', 'propagation failed for ' + o.name, true)
          out.set('asteroid q, Q', 'n/a')
          render()
          return
        }
        vp.resetView() // the inner frame stretches to this object's aphelion
        render()
      }

      const neoSec = UI.section(controls, 'Near-Earth asteroid')
      UI.button(neoSec, 'Load from NASA', async (b) => {
        b.disabled = true
        out.set('asteroid', 'loading from NASA ...', true)
        try {
          const res = await fetch(NEO_URL, { signal: AbortSignal.timeout(15000) })
          const body = await res.json().catch(() => null)
          if (!res.ok) throw new Error('NASA ' + res.status + ': ' + ((body && body.error && body.error.message) || res.statusText))
          const objects = Array.isArray(body && body.near_earth_objects) ? body.near_earth_objects : []
          const list = objects.map(parseNeo).filter(Boolean)
          if (!list.length) throw new Error('NASA returned no usable element sets')
          UI.select(neoSec, { label: 'object', options: list.map((o) => ({ label: o.name, value: o })) }, setNeo)
          setNeo(list[0])
          b.remove() // the twenty objects arrived in this one response; no second call
        } catch (err) {
          out.set('asteroid', String((err && err.message) || err), true)
          b.disabled = false
        }
      })

      function buildRings() {
        rings = shown().map((planet) => {
          const Tdays = 365.25 * Math.pow(planet.el.a, 1.5)
          const j0 = jd()
          const pts = []
          for (let k = 0; k <= 160; k++) {
            const p = posAU(planet, j0 + (k / 160) * Tdays)
            pts.push([p[0], p[1]])
          }
          return { planet, pts }
        })
      }

      function render() {
        const planets = shown()
        const half = st.inner ? Math.max(1.75, neo ? neo.Q * 1.1 : 0) : 31
        vp.fit(half)
        vp.clear()
        vp.grid(st.inner ? 0.5 : 10)
        vp.glow(0, 0, st.inner ? 26 : 16, 'rgba(255,207,107,0.45)')
        vp.disc(0, 0, st.inner ? 8 : 5, '#ffcf6b')
        for (const ring of rings) vp.poly(ring.pts, { stroke: 'rgba(140,160,210,0.22)', width: 1 })
        if (neo) vp.poly(neo.pts, { stroke: 'rgba(143,230,192,0.45)', width: 1.2 })
        const j = jd()
        for (const planet of planets) {
          const p = posAU(planet, j)
          vp.disc(p[0], p[1], planet.dotSize, planet.color)
          vp.label(p[0], p[1], planet.name, planet.color)
        }
        if (neo) {
          const p = neoState(j)
          vp.disc(p[0], p[1], 4, '#8fe6c0')
          vp.label(p[0], p[1], neo.name, '#8fe6c0')
          out.set('asteroid', neo.name + '  ' + p[2].toFixed(3) + ' AU')
          out.set('asteroid q, Q', neo.q.toFixed(3) + ', ' + neo.Q.toFixed(3) + ' AU')
        }
        out.set('epoch', st.year.toFixed(2) + ' AD')
        const earth = posAU(window.PLANETS[2], j), mars = posAU(window.PLANETS[3], j)
        out.set('Earth', earth[2].toFixed(3) + ' AU')
        out.set('Mars', mars[2].toFixed(3) + ' AU')
      }

      vp.onResize(render)
      buildRings()
      render()
    },
  })
})()
