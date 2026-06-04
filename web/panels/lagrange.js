/**
 * Lagrange Points panel (circular restricted three-body problem).
 *
 * In the frame rotating with two primaries, a third tiny body feels an effective
 * potential combining gravity and the centrifugal term. Its five equilibria are the
 * Lagrange points: the core's lagrangePoints returns all five (L1-L3 collinear by a
 * Newton solve, L4/L5 the exact equilateral triangles). The background is the core's
 * effectivePotential sampled across the frame.
 *
 * Press Play to release a probe near a chosen point and integrate its real motion
 * with the core's propagateRotating: near L4/L5 it librates (a tadpole orbit, stable
 * for small mass ratios); near L1/L2/L3 it drifts away (those points are unstable).
 *
 * Distances are non-dimensional: the primaries are unit-separated, the larger at
 * x = -mu and the smaller at x = 1 - mu. Scroll to zoom, drag to pan.
 */
;(function () {
  const O = window.Orrery

  UI.registerPanel({
    id: 'lagrange',
    label: 'Lagrange Points',
    hint: 'The five equilibrium points of a two-body rotating frame. Pick a system or set μ. Play releases a probe near a point and integrates its real motion: L4/L5 librate, L1–L3 drift away.',
    setup({ controls, vp }) {
      const st = { mu: O.earthMoonMassParameter(), heat: true, release: 'L4' }
      let traj = [] // [x,y] samples of the released probe
      let head = 0
      let rafPending = 0
      function scheduleRender() { if (rafPending) return; rafPending = requestAnimationFrame(() => { rafPending = 0; render() }) }

      const sysBody = UI.section(controls, 'System')
      const sys = UI.select(sysBody, { label: 'primaries', options: [
        { label: 'Earth – Moon', value: 'em' },
        { label: 'Sun – Earth', value: 'se' },
        { label: 'Custom μ', value: 'custom' },
      ] }, (v) => {
        if (v === 'em') { st.mu = O.earthMoonMassParameter(); muCtl.set(st.mu) }
        else if (v === 'se') { st.mu = O.sunEarthMassParameter(); muCtl.set(st.mu) }
        refreshProbe()
        render()
      })
      const muCtl = UI.slider(sysBody, { label: 'mass ratio μ', min: 0.000001, max: 0.5, step: 0.000001, value: st.mu, fmt: (v) => v.toExponential(3) }, (v) => {
        st.mu = v
        sys.set('custom')
        traj = []; head = 0 // μ changed mid-drag; old trajectory is stale (re-Play to release again)
        scheduleRender()
      })
      UI.checkbox(controls, 'effective-potential heatmap', true, (v) => { st.heat = v; render() })

      const probe = UI.section(controls, 'Probe')
      UI.select(probe, { label: 'release near', options: [
        { label: 'L4 (stable libration)', value: 'L4' },
        { label: 'L5 (stable libration)', value: 'L5' },
        { label: 'L1 (unstable, escapes)', value: 'L1' },
      ] }, (v) => { st.release = v; refreshProbe(); render() })
      const anim = UI.loop((dt) => {
        if (traj.length > 1) { head += dt * (traj.length / 7); if (head >= traj.length - 1) head = 0 } // replay over ~7 s
        render()
      }, vp.canvas)
      UI.button(controls, '▶ Play', (b) => {
        const on = anim.toggle()
        b.textContent = on ? '❚❚ Pause' : '▶ Play'
        b.classList.toggle('on', on)
        if (on) buildTrajectory()
      })

      const out = UI.readout(UI.section(controls, 'Equilibria (x, y)'))

      function refreshProbe() {
        if (anim.playing) buildTrajectory()
        else { traj = []; head = 0 }
      }

      // Integrate the probe's real rotating-frame trajectory with the core integrator.
      function buildTrajectory() {
        const mu = st.mu
        const lp = O.lagrangePoints(mu)
        let seed, totalT
        if (st.release === 'L1') {
          seed = O.vec3(lp.L1.x + 0.004, 0, 0) // nudge off the unstable saddle
          totalT = 8 * Math.PI
        } else {
          const P = st.release === 'L5' ? lp.L5 : lp.L4
          // A small along-orbit (longitude) nudge excites a clean tadpole libration.
          const d = 0.08, cs = Math.cos(d), sn = Math.sin(d)
          seed = O.vec3(P.x * cs - P.y * sn, P.x * sn + P.y * cs, 0)
          const periodLong = (2 * Math.PI) / Math.sqrt((27 / 4) * mu) // long-period libration estimate
          totalT = Math.max(60, Math.min(800, 1.3 * periodLong))
        }
        const dt = Math.max(0.01, Math.min(0.08, totalT / 3000))
        const steps = Math.round(totalT / dt)
        const sampleEvery = Math.max(1, Math.round(steps / 500))
        const states = O.propagateRotating({ pos: seed, vel: O.vec3(0, 0, 0) }, mu, dt, steps, sampleEvery)
        traj = states.map((s) => [s.pos.x, s.pos.y])
        head = 0
      }

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
        const cell = 8
        const c = vp.ctx
        const scale = vp.scale
        const cells = []
        const vals = []
        for (let px = 0; px < vp.cssW; px += cell) {
          for (let py = 0; py < vp.cssH; py += cell) {
            const w = vp.worldAt(px + cell / 2, py + cell / 2)
            let v = O.effectivePotential(O.vec3(w.x, w.y, 0), st.mu)
            if (!isFinite(v)) v = 1e9
            cells.push([px, py, v])
            vals.push(v)
          }
        }
        vals.sort((a, b) => a - b)
        const lo = vals[Math.floor(vals.length * 0.02)]
        const hi = vals[Math.floor(vals.length * 0.9)]
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

        vp.disc(-mu, 0, 9, '#ffcf6b'); vp.label(-mu, 0, 'm₁', '#ffe7ad', -22, 16)
        vp.disc(1 - mu, 0, Math.max(4, 9 * Math.cbrt(mu / (1 - mu))), '#cfd8ee'); vp.label(1 - mu, 0, 'm₂', '#cfd8ee')

        const lp = O.lagrangePoints(mu)
        vp.poly([[-mu, 0], [lp.L4.x, lp.L4.y], [1 - mu, 0], [lp.L5.x, lp.L5.y], [-mu, 0]], { stroke: 'rgba(255,255,255,0.18)', width: 1 })

        const mark = (P, name, color) => {
          vp.ring(P.x, P.y, 5, color, 1.6)
          vp.disc(P.x, P.y, 2, color)
          vp.label(P.x, P.y, name, color)
        }
        mark(lp.L1, 'L1', '#8fe6c0'); mark(lp.L2, 'L2', '#8fe6c0'); mark(lp.L3, 'L3', '#8fe6c0')
        mark(lp.L4, 'L4', '#ff9ecb'); mark(lp.L5, 'L5', '#ff9ecb')

        // The released probe: its trail and a rocket at the head.
        if (traj.length > 1) {
          const h = Math.min(traj.length - 1, Math.max(1, Math.floor(head)))
          vp.poly(traj.slice(0, h + 1), { stroke: 'rgba(120,230,255,0.9)', width: 1.6 })
          const a0 = traj[h - 1], a1 = traj[h]
          vp.rocket(a1[0], a1[1], Math.atan2(a1[1] - a0[1], a1[0] - a0[0]), 7, '#dff6ff', anim.playing)
        }

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
