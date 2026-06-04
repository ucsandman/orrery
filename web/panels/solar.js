/**
 * Solar System panel: the orrery itself.
 *
 * Each planet's heliocentric position comes from the core's planetStateAtJD (Curtis
 * Algorithm 8.1) applied to the cited Standish element tables. Scrub or play the
 * date and the planets move along their real orbits. This is the approximate
 * low-precision model (a few arcminutes over 1800-2050), not an ephemeris.
 */
;(function () {
  const O = window.Orrery
  const AU_KM = window.AU_KM
  const MU_SUN_KM = O.MU_SUN / 1e9
  const J2000 = O.J2000_JD

  UI.registerPanel({
    id: 'solar',
    label: 'Solar System',
    hint: 'The planets at any date, from the Standish model in the core. Drag the date or press Play. Switch between the inner planets and the full system (the scale jumps from ~1.5 AU to ~30 AU).',
    setup({ controls, vp }) {
      const st = { year: 2000, speed: 2, inner: true, playing: false }
      let rings = []
      let lastTs = 0

      const t = UI.section(controls, 'Time')
      const yearCtl = UI.slider(t, { label: 'epoch (year)', min: 1900, max: 2050, step: 0.02, value: st.year, fmt: (v) => v.toFixed(1) }, (v) => { st.year = v; render() })
      UI.slider(t, { label: 'play speed', min: 0.1, max: 25, step: 0.1, value: st.speed, fmt: (v) => v.toFixed(1) + ' yr/s' }, (v) => { st.speed = v })
      const playBtn = UI.button(controls, '▶ Play', () => {
        st.playing = !st.playing
        playBtn.textContent = st.playing ? '❚❚ Pause' : '▶ Play'
        playBtn.classList.toggle('on', st.playing)
        if (st.playing) { lastTs = 0; requestAnimationFrame(tick) }
      })
      UI.select(UI.section(controls, 'View'), { label: 'planets', options: [
        { label: 'Inner (Mercury–Mars)', value: true }, { label: 'All eight', value: false },
      ] }, (v) => { st.inner = v; buildRings(); render() })

      const out = UI.readout(UI.section(controls, 'Heliocentric distance'))

      const shown = () => (st.inner ? window.PLANETS.slice(0, 4) : window.PLANETS)
      const jd = () => J2000 + (st.year - 2000) * 365.25
      function posAU(planet, j) {
        const s = O.planetStateAtJD(planet.el, j, MU_SUN_KM, AU_KM)
        return [s.r.x / AU_KM, s.r.y / AU_KM, O.norm(s.r) / AU_KM]
      }

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

      function tick(ts) {
        if (!st.playing) return
        if (lastTs) {
          const wall = Math.min(0.05, (ts - lastTs) / 1000)
          st.year += wall * st.speed
          if (st.year > 2050) st.year = 1900
          yearCtl.set(st.year) // pass the number; the slider's own fmt renders it
        }
        lastTs = ts
        render()
        requestAnimationFrame(tick)
      }

      function render() {
        const planets = shown()
        const half = st.inner ? 1.75 : 31
        vp.fit(half)
        vp.clear()
        vp.grid(st.inner ? 0.5 : 10)
        vp.glow(0, 0, st.inner ? 26 : 16, 'rgba(255,207,107,0.45)')
        vp.disc(0, 0, st.inner ? 8 : 5, '#ffcf6b')
        for (const ring of rings) vp.poly(ring.pts, { stroke: 'rgba(140,160,210,0.22)', width: 1 })
        const j = jd()
        for (const planet of planets) {
          const p = posAU(planet, j)
          vp.disc(p[0], p[1], planet.dotSize, planet.color)
          vp.label(p[0], p[1], planet.name, planet.color)
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
