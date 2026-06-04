/**
 * Lagrange Points panel (circular restricted three-body problem).
 *
 * In the frame rotating with two primaries, a third tiny body feels an effective
 * potential combining gravity and the centrifugal term. Its five equilibria are the
 * Lagrange points: the core's lagrangePoints returns all five (L1-L3 collinear by a
 * Newton solve, L4/L5 the exact equilateral triangles). The background is the core's
 * effectivePotential sampled across the frame, so you can see L1-L3 sit on saddles
 * between the wells and L4/L5 on the broad ridges.
 *
 * Distances are non-dimensional: the primaries are unit-separated, the larger at
 * x = -mu and the smaller at x = 1 - mu.
 */
;(function () {
  const O = window.Orrery

  UI.registerPanel({
    id: 'lagrange',
    label: 'Lagrange Points',
    hint: 'The five equilibrium points of a two-body rotating frame. Pick a system or set the mass ratio μ. The heatmap is the engine’s effective potential; the marked points are where its gradient vanishes.',
    setup({ controls, vp }) {
      const st = { mu: O.earthMoonMassParameter(), heat: true }
      let raf = 0
      // The heatmap is a full canvas sweep plus a sort; coalesce rapid μ-drag events to one per frame.
      function scheduleRender() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; render() }) }

      const sysBody = UI.section(controls, 'System')
      const sys = UI.select(sysBody, { label: 'primaries', options: [
        { label: 'Earth – Moon', value: 'em' },
        { label: 'Sun – Earth', value: 'se' },
        { label: 'Custom μ', value: 'custom' },
      ] }, (v) => {
        if (v === 'em') { st.mu = O.earthMoonMassParameter(); muCtl.set(st.mu) }
        else if (v === 'se') { st.mu = O.sunEarthMassParameter(); muCtl.set(st.mu) }
        // 'custom': keep the current μ and let the slider drive it.
        render()
      })
      const muCtl = UI.slider(sysBody, { label: 'mass ratio μ', min: 0.000001, max: 0.5, step: 0.000001, value: st.mu, fmt: (v) => v.toExponential(3) }, (v) => {
        st.mu = v
        sys.set('custom') // dragging μ means a custom system; keep the dropdown label honest
        scheduleRender()
      })
      UI.checkbox(controls, 'effective-potential heatmap', true, (v) => { st.heat = v; render() })

      const out = UI.readout(UI.section(controls, 'Equilibria (x, y)'))

      function ramp(t) {
        t = Math.max(0, Math.min(1, t))
        const stops = [[8, 12, 28], [30, 70, 110], [70, 170, 150], [245, 210, 110]]
        const seg = t * (stops.length - 1)
        const i = Math.min(stops.length - 2, Math.floor(seg))
        const f = seg - i
        const a = stops[i], b = stops[i + 1]
        return `rgb(${(a[0] + (b[0] - a[0]) * f) | 0},${(a[1] + (b[1] - a[1]) * f) | 0},${(a[2] + (b[2] - a[2]) * f) | 0})`
      }

      function drawHeat() {
        const cell = 7
        const c = vp.ctx
        const scale = vp.scale
        const vals = []
        const cells = []
        let lo = Infinity, hi = -Infinity
        for (let px = 0; px < vp.cssW; px += cell) {
          for (let py = 0; py < vp.cssH; py += cell) {
            const x = vp.cx + (px + cell / 2 - vp.cssW / 2) / scale
            const y = vp.cy - (py + cell / 2 - vp.cssH / 2) / scale
            let v = O.effectivePotential(O.vec3(x, y, 0), st.mu)
            if (!isFinite(v)) v = 1e9
            cells.push([px, py, v])
            vals.push(v)
          }
        }
        // Clamp the singular spikes near the primaries to a high percentile.
        vals.sort((a, b) => a - b)
        lo = vals[Math.floor(vals.length * 0.02)]
        hi = vals[Math.floor(vals.length * 0.9)]
        const span = hi - lo || 1
        for (const [px, py, v] of cells) {
          c.fillStyle = ramp((v - lo) / span)
          c.fillRect(px, py, cell + 1, cell + 1)
        }
      }

      function render() {
        const mu = st.mu
        vp.fit(1.55)
        vp.clear()
        if (st.heat) drawHeat()
        else vp.grid(0.25)

        // Primaries.
        vp.disc(-mu, 0, 9, '#ffcf6b'); vp.label(-mu, 0, 'm₁', '#ffe7ad', -22, 16)
        vp.disc(1 - mu, 0, Math.max(4, 9 * Math.cbrt(mu / (1 - mu))), '#cfd8ee'); vp.label(1 - mu, 0, 'm₂', '#cfd8ee')

        const lp = O.lagrangePoints(mu)
        // Equilateral triangle edges to L4/L5.
        vp.poly([[-mu, 0], [lp.L4.x, lp.L4.y], [1 - mu, 0], [lp.L5.x, lp.L5.y], [-mu, 0]], { stroke: 'rgba(255,255,255,0.18)', width: 1 })

        const mark = (P, name, color) => {
          vp.ring(P.x, P.y, 5, color, 1.6)
          vp.disc(P.x, P.y, 2, color)
          vp.label(P.x, P.y, name, color)
        }
        mark(lp.L1, 'L1', '#8fe6c0'); mark(lp.L2, 'L2', '#8fe6c0'); mark(lp.L3, 'L3', '#8fe6c0')
        mark(lp.L4, 'L4', '#ff9ecb'); mark(lp.L5, 'L5', '#ff9ecb')

        out.set('μ', mu.toExponential(4), true)
        out.set('L1', lp.L1.x.toFixed(5) + ', 0')
        out.set('L2', lp.L2.x.toFixed(5) + ', 0')
        out.set('L3', lp.L3.x.toFixed(5) + ', 0')
        out.set('L4', lp.L4.x.toFixed(4) + ', ' + lp.L4.y.toFixed(4))
        out.set('L5', lp.L5.x.toFixed(4) + ', ' + lp.L5.y.toFixed(4))
      }

      vp.onResize(render)
      render()
    },
  })
})()
