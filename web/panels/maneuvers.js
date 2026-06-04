/**
 * Maneuvers panel.
 *
 * Compare the two classic ways to raise a circular orbit: the Hohmann transfer (one
 * ellipse, two burns) and the bi-elliptic transfer (out to a distant apoapsis and
 * back, three burns). The core's hohmann and biElliptic return the burn breakdown;
 * recommendTransfer gives the textbook verdict, which flips to bi-elliptic once the
 * radius ratio passes about 11.94. Earth-centred, radii in km, burns in km/s.
 */
;(function () {
  const O = window.Orrery
  const KM = 1e3
  const R_EARTH = 6.371e6

  UI.registerPanel({
    id: 'maneuvers',
    label: 'Maneuvers',
    hint: 'Raise a circular orbit from r₁ to r₂. Watch the total Δv of the Hohmann and bi-elliptic transfers, and the engine’s recommendation: bi-elliptic wins only for large radius ratios with a high enough turn-around point r_b.',
    setup({ controls, vp }) {
      const mu = O.MU_EARTH
      const st = { r1: 7000, r2: 105000, rb: 400000, show: 'both' }
      let af = 0 // animation fraction along the flown transfer
      let pathPts = []

      const g = UI.section(controls, 'Orbits (km)')
      UI.slider(g, { label: 'start radius r₁', min: 6600, max: 30000, step: 100, value: st.r1, fmt: (v) => UI.fmt.num(v, 0) }, (v) => { st.r1 = v; render() })
      UI.slider(g, { label: 'target radius r₂', min: 8000, max: 420000, step: 500, value: st.r2, fmt: (v) => UI.fmt.num(v, 0) }, (v) => { st.r2 = v; render() })
      UI.slider(g, { label: 'bi-elliptic apoapsis r_b', min: 50000, max: 1200000, step: 1000, value: st.rb, fmt: (v) => UI.fmt.num(v, 0) }, (v) => { st.rb = v; render() })
      const showSec = UI.section(controls, 'Show')
      UI.select(showSec, { label: 'transfer', options: [
        { label: 'Both', value: 'both' }, { label: 'Hohmann only', value: 'hohmann' }, { label: 'Bi-elliptic only', value: 'biell' },
      ] }, (v) => { st.show = v; vp.resetView(); render() }) // reframe cleanly (extent changes with r_b)
      const anim = UI.loop((dt) => { af = (af + dt / 6) % 1; render() }, vp.canvas) // fly the transfer in ~6 s
      UI.playButton(showSec, anim)

      const out = UI.readout(UI.section(controls, 'Δv budget'))

      // Real propagated transfer path (equal-time samples) for the flying rocket.
      const periSpeed = (peri, apo) => { const a = (peri + apo) / 2; return Math.sqrt(mu * (2 / peri - 1 / a)) }
      const apoSpeed = (peri, apo) => { const a = (peri + apo) / 2; return Math.sqrt(mu * (2 / apo - 1 / a)) }
      const halfP = (peri, apo) => { const a = (peri + apo) / 2; return Math.PI * Math.sqrt((a * a * a) / mu) }
      const sampleArc = (r0, v0, T, n) => { const o = []; for (let k = 0; k <= n; k++) { const s = O.propagateUniversal(r0, v0, (k / n) * T, mu); o.push([s.r.x, s.r.y]) } return o }

      // Ellipse with the focus at the origin and periapsis on +x, sampled over [t0,t1].
      function ellipse(periM, apoM, t0, t1, n) {
        const a = (periM + apoM) / 2, e = (apoM - periM) / (apoM + periM), p = a * (1 - e * e)
        const pts = []
        for (let k = 0; k <= n; k++) {
          const th = t0 + (k / n) * (t1 - t0)
          const r = p / (1 + e * Math.cos(th))
          pts.push([r * Math.cos(th), r * Math.sin(th)])
        }
        return pts
      }
      function circle(rad) { const a = []; for (let k = 0; k <= 180; k++) { const t = (k / 180) * UI.TAU; a.push([rad * Math.cos(t), rad * Math.sin(t)]) } return a }

      function render() {
        const r1 = st.r1 * KM
        const r2 = Math.max(st.r2 * KM, r1 * 1.02)
        const rb = Math.max(st.rb * KM, r2 * 1.02)
        const showH = st.show !== 'biell'
        const showB = st.show !== 'hohmann'

        const extent = (showB ? rb : r2) * 1.15
        vp.fit(extent)
        vp.clear()
        vp.grid(extent / 4)
        vp.glow(0, 0, Math.max(10, R_EARTH * vp.scale * 1.6), 'rgba(91,155,213,0.30)')
        vp.disc(0, 0, Math.max(5, R_EARTH * vp.scale), '#5b9bd5')
        vp.poly(circle(r1), { stroke: 'rgba(120,150,210,0.55)', width: 1.2 })
        vp.poly(circle(r2), { stroke: 'rgba(120,150,210,0.55)', width: 1.2 })
        vp.label(r1, 0, 'r₁', '#9fb2d8'); vp.label(-r2, 0, 'r₂', '#9fb2d8')

        const hoh = O.hohmann(r1, r2, mu)
        const bie = O.biElliptic(r1, r2, rb, mu)

        if (showH) vp.poly(ellipse(r1, r2, 0, Math.PI, 160), { stroke: '#8fe6c0', width: 2 })
        if (showB) {
          vp.poly(ellipse(r1, rb, 0, Math.PI, 200), { stroke: '#ffcf6b', width: 1.8, dash: [6, 4] })
          vp.poly(ellipse(r2, rb, Math.PI, UI.TAU, 200), { stroke: '#ffcf6b', width: 1.8, dash: [6, 4] })
        }

        // The rocket flies the transfer that is shown (bi-elliptic when it is the only one).
        if (showB && !showH) {
          const leg1 = sampleArc(O.vec3(r1, 0, 0), O.vec3(0, periSpeed(r1, rb), 0), halfP(r1, rb), 150)
          const leg2 = sampleArc(O.vec3(-rb, 0, 0), O.vec3(0, -apoSpeed(r2, rb), 0), halfP(r2, rb), 150)
          pathPts = leg1.concat(leg2.slice(1)) // drop the duplicated apoapsis point so the heading stays smooth
        } else {
          pathPts = sampleArc(O.vec3(r1, 0, 0), O.vec3(0, periSpeed(r1, r2), 0), halfP(r1, r2), 220)
        }
        const idx = Math.min(pathPts.length - 2, Math.max(0, Math.floor(af * (pathPts.length - 1))))
        const a0 = pathPts[idx], a1 = pathPts[idx + 1]
        vp.rocket(a0[0], a0[1], Math.atan2(a1[1] - a0[1], a1[0] - a0[0]), 7, '#e8eef8', anim.playing)

        const R = r2 / r1
        out.set('radius ratio r₂/r₁', R.toFixed(2))
        if (showH) hoh.burns.forEach((b, i) => out.set('Hohmann ' + (b.name || 'burn ' + (i + 1)), UI.fmt.speed(b.dv)))
        out.set('Hohmann total', UI.fmt.speed(hoh.totalDv), true)
        if (showB) {
          bie.burns.forEach((b, i) => out.set('Bi-elliptic ' + (b.name || 'burn ' + (i + 1)), UI.fmt.speed(b.dv)))
          out.set('Bi-elliptic total', UI.fmt.speed(bie.totalDv), true)
        }
        out.set('engine verdict', O.recommendTransfer(R))
      }

      vp.onResize(render)
      render()
    },
  })
})()
