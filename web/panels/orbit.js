/**
 * Orbit Designer panel.
 *
 * Build an orbit from its six classical elements, see it drawn, and press Play to
 * fly a rocket along it. The position comes from the core: coeToRv turns the
 * elements into a state vector, classify reports the orbit's properties, and
 * propagateUniversal advances the real two-body motion (so the rocket genuinely
 * speeds up at periapsis and slows at apoapsis, it is not a constant-rate sweep).
 *
 * The view is a top-down projection onto the reference X-Y plane, so an inclined
 * orbit looks foreshortened, which is the honest picture of its tilt. Scroll to
 * zoom, drag to pan, double-click to reset.
 */
;(function () {
  const O = window.Orrery
  const DEG = Math.PI / 180
  const R_EARTH = 6.371e6 // m, for altitude readouts and the central disc

  UI.registerPanel({
    id: 'orbit',
    label: 'Orbit Designer',
    hint: 'Set the six orbital elements of an Earth orbit. Play flies a rocket along it with the real two-body propagator, so it races through periapsis and crawls through apoapsis.',
    setup({ controls, vp }) {
      const mu = O.MU_EARTH
      const p = { a: 2.4e7, e: 0.6, i: 35 * DEG, raan: 40 * DEG, argp: 60 * DEG, nu: 0 }
      let body = null // {r, v} current state
      let pts = []

      const elems = UI.section(controls, 'Elements')
      UI.slider(elems, { label: 'semi-major axis a', min: 6.7e6, max: 1.1e8, step: 1e5, value: p.a, fmt: UI.fmt.dist }, (v) => { p.a = v; reset() })
      UI.slider(elems, { label: 'eccentricity e', min: 0, max: 0.92, step: 0.01, value: p.e, fmt: (v) => v.toFixed(2) }, (v) => { p.e = v; reset() })
      UI.slider(elems, { label: 'inclination i', min: 0, max: 180, step: 1, value: 35, fmt: (v) => v + '°' }, (v) => { p.i = v * DEG; reset() })
      UI.slider(elems, { label: 'RAAN Ω', min: 0, max: 360, step: 1, value: 40, fmt: (v) => v + '°' }, (v) => { p.raan = v * DEG; reset() })
      UI.slider(elems, { label: 'arg. of periapsis ω', min: 0, max: 360, step: 1, value: 60, fmt: (v) => v + '°' }, (v) => { p.argp = v * DEG; reset() })
      UI.slider(elems, { label: 'true anomaly ν', min: 0, max: 360, step: 1, value: 0, fmt: (v) => v + '°' }, (v) => { p.nu = v * DEG; reset() })

      const anim = UI.loop((dt) => {
        const period = UI.TAU * Math.sqrt((p.a * p.a * p.a) / mu)
        const s = O.propagateUniversal(body.r, body.v, dt * (period / 6), mu) // one orbit every ~6 s
        body = { r: s.r, v: s.v }
        render()
      }, vp.canvas)
      UI.playButton(controls, anim)

      const out = UI.readout(UI.section(controls, 'Live state'))

      function reset() {
        const s = O.coeToRv(p.a, p.e, p.i, p.raan, p.argp, p.nu, mu)
        body = { r: s.r, v: s.v }
        const N = 256
        pts = []
        for (let k = 0; k <= N; k++) {
          const s2 = O.coeToRv(p.a, p.e, p.i, p.raan, p.argp, (k / N) * UI.TAU, mu)
          pts.push([s2.r.x, s2.r.y])
        }
        render()
      }

      function render() {
        let maxR = 0
        for (const q of pts) maxR = Math.max(maxR, Math.hypot(q[0], q[1]))
        vp.fit(maxR * 1.18)
        vp.clear()
        vp.grid(maxR / 4)
        const rpx = Math.max(5, R_EARTH * vp.scale)
        vp.glow(0, 0, rpx * 2.4, 'rgba(91,155,213,0.30)')
        vp.disc(0, 0, rpx, '#5b9bd5')
        vp.poly(pts, { stroke: 'rgba(143,182,255,0.85)', width: 1.6 })
        const peri = O.coeToRv(p.a, p.e, p.i, p.raan, p.argp, 0, mu).r
        const apo = O.coeToRv(p.a, p.e, p.i, p.raan, p.argp, Math.PI, mu).r
        vp.ring(peri.x, peri.y, 4, '#58d4a0', 1.5)
        vp.label(peri.x, peri.y, 'peri', '#58d4a0')
        if (p.e > 0.02) { vp.ring(apo.x, apo.y, 4, '#ffcf6b', 1.5); vp.label(apo.x, apo.y, 'apo', '#ffcf6b') }
        // The rocket flies along the orbit, nose along its velocity.
        const r = body.r, v = body.v
        vp.rocket(r.x, r.y, Math.atan2(v.y, v.x), 9, '#e8eef8', anim.playing)
        const props = O.classify(r, v, mu)
        out.set('orbit type', props.conic)
        out.set('radius |r|', UI.fmt.dist(O.norm(r)))
        out.set('speed |v|', UI.fmt.speed(O.norm(v)), true)
        out.set('period', isFinite(props.period) ? UI.fmt.secs(props.period) : 'unbound')
        out.set('periapsis alt', UI.fmt.dist(props.periapsis - R_EARTH))
        out.set('apoapsis alt', isFinite(props.apoapsis) ? UI.fmt.dist(props.apoapsis - R_EARTH) : 'unbound')
        out.set('specific energy', (props.energy / 1e6).toFixed(3) + ' MJ/kg')
      }

      vp.onResize(render)
      reset()
    },
  })
})()
