/**
 * Lambert Transfer panel.
 *
 * The mission-design question: given a departure point on an inner orbit, an
 * arrival point on an outer orbit, and how long you are willing to fly, what
 * trajectory connects them? lambertIzzo answers it. We draw the real transfer arc
 * (propagated by propagateUniversal) and read off the departure and arrival burns
 * as the difference between the transfer velocity and the local circular velocity.
 *
 * Heliocentric and coplanar, so it reads like an Earth-to-Mars style transfer:
 * radii in AU, flight time in days, burns in km/s.
 */
;(function () {
  const O = window.Orrery
  const DEG = Math.PI / 180
  const DAY = 86400
  const AU = O.AU_M

  UI.registerPanel({
    id: 'transfer',
    label: 'Lambert Transfer',
    hint: 'Choose two heliocentric orbits, where the target sits, and a flight time. The engine solves Lambert’s problem for the connecting arc and reports the departure and arrival burns. Long flight times unlock multi-revolution solutions.',
    setup({ controls, vp }) {
      const mu = O.MU_SUN
      const st = { r1: 1.0, r2: 1.52, sweep: 150, tofDays: 259, multi: false }

      const geo = UI.section(controls, 'Geometry')
      UI.slider(geo, { label: 'inner radius r₁', min: 0.4, max: 2.0, step: 0.01, value: st.r1, fmt: (v) => v.toFixed(2) + ' AU' }, (v) => { st.r1 = v; render() })
      UI.slider(geo, { label: 'outer radius r₂', min: 0.6, max: 6.0, step: 0.01, value: st.r2, fmt: (v) => v.toFixed(2) + ' AU' }, (v) => { st.r2 = v; render() })
      UI.slider(geo, { label: 'transfer angle Δθ', min: 20, max: 340, step: 1, value: st.sweep, fmt: (v) => v + '°' }, (v) => { st.sweep = v; render() })
      const flight = UI.section(controls, 'Flight')
      UI.slider(flight, { label: 'time of flight', min: 30, max: 1200, step: 1, value: st.tofDays, fmt: (v) => v + ' days' }, (v) => { st.tofDays = v; render() })
      UI.checkbox(flight, 'show multi-revolution branches', false, (v) => { st.multi = v; render() })

      const out = UI.readout(UI.section(controls, 'Result'))

      function circVel(rvec, r) {
        const vc = Math.sqrt(mu / r)
        // Prograde (counterclockwise) tangent: rotate the radial unit vector by +90°.
        return { x: (-rvec.y / r) * vc, y: (rvec.x / r) * vc, z: 0 }
      }
      function arc(r0, v0, tof, n) {
        const out = []
        for (let k = 0; k <= n; k++) {
          const s = O.propagateUniversal(r0, v0, (k / n) * tof, mu)
          out.push([s.r.x, s.r.y])
        }
        return out
      }

      function render() {
        const r1 = st.r1 * AU, r2 = st.r2 * AU
        const th = st.sweep * DEG
        const tof = st.tofDays * DAY
        const r1v = { x: r1, y: 0, z: 0 }
        const r2v = { x: r2 * Math.cos(th), y: r2 * Math.sin(th), z: 0 }

        const big = Math.max(r1, r2) * 1.2
        vp.fit(big)
        vp.clear()
        vp.grid(AU)
        // Sun.
        vp.glow(0, 0, Math.max(16, 0.05 * AU * vp.scale), 'rgba(255,207,107,0.35)')
        vp.disc(0, 0, 7, '#ffcf6b')
        // The two orbits.
        const ring = (rad) => { const a = []; for (let k = 0; k <= 180; k++) { const t = (k / 180) * UI.TAU; a.push([rad * Math.cos(t), rad * Math.sin(t)]) } return a }
        vp.poly(ring(r1), { stroke: 'rgba(91,155,213,0.5)', width: 1.2 })
        vp.poly(ring(r2), { stroke: 'rgba(193,68,14,0.55)', width: 1.2 })

        let branches
        try {
          branches = O.lambertIzzo(r1v, r2v, tof, mu, { maxRevs: st.multi ? 3 : 0 })
        } catch (e) {
          out.set('status', 'degenerate geometry', true)
          vp.label(r1v.x, r1v.y, 'adjust Δθ', '#ff8080')
          return
        }
        const primary = branches.find((b) => b.revs === 0) || branches[0]

        // Multi-revolution branches, dashed.
        if (st.multi) {
          for (const b of branches) {
            if (b.revs === 0) continue
            vp.poly(arc(r1v, b.v1, tof, 360), { stroke: 'rgba(140,160,210,0.35)', width: 1, dash: [4, 4] })
          }
        }
        // Primary transfer arc.
        vp.poly(arc(r1v, primary.v1, tof, 200), { stroke: '#8fe6c0', width: 2 })

        // Endpoints.
        vp.disc(r1v.x, r1v.y, 5, '#5b9bd5'); vp.label(r1v.x, r1v.y, 'depart', '#5b9bd5')
        vp.disc(r2v.x, r2v.y, 5, '#c1440e'); vp.label(r2v.x, r2v.y, 'arrive', '#e0764a')

        // Burns: transfer velocity minus local circular velocity.
        const c1 = circVel(r1v, r1), c2 = circVel(r2v, r2)
        const dvD = O.norm(O.sub(primary.v1, c1))
        const dvA = O.norm(O.sub(primary.v2, c2))
        out.set('departure Δv', UI.fmt.speed(dvD))
        out.set('arrival Δv', UI.fmt.speed(dvA))
        out.set('total Δv', UI.fmt.speed(dvD + dvA), true)
        out.set('time of flight', st.tofDays + ' days')
        out.set('solutions found', String(branches.length))
        out.set('multi-rev', st.multi ? String(branches.filter((b) => b.revs > 0).length) + ' branch(es)' : 'off')
      }

      vp.onResize(render)
      render()
    },
  })
})()
