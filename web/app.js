/**
 * Orrery playground: shared UI framework and boot.
 *
 * Loaded as a classic script (no modules, so the page opens straight from a file).
 * Defines a small global UI namespace (a canvas Viewport, control widgets, number
 * formatting) and a tab system. Each panel file calls UI.registerPanel(...) before
 * this script's DOMContentLoaded boot builds the tabs.
 *
 * Every physical number shown by a panel comes from the global `Orrery`, the real
 * compiled core bundled by `npm run build:web`. This file does no orbital mechanics.
 */
;(function () {
  'use strict'

  const PANELS = []
  const TAU = Math.PI * 2

  // --- tiny DOM helper ---------------------------------------------------------
  function el(tag, props, children) {
    const node = document.createElement(tag)
    if (props) {
      for (const k in props) {
        if (k === 'class') node.className = props[k]
        else if (k === 'text') node.textContent = props[k]
        else node.setAttribute(k, props[k])
      }
    }
    for (const c of children || []) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
    return node
  }

  // --- number formatting -------------------------------------------------------
  const fmt = {
    /** A length in metres shown in km or AU as appropriate. */
    dist(m) {
      const km = m / 1e3
      if (Math.abs(km) >= 1e6) return (m / window.AU_KM / 1e3).toFixed(4) + ' AU'
      return km.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' km'
    },
    speed(ms) {
      return (ms / 1e3).toFixed(3) + ' km/s'
    },
    secs(s) {
      if (s >= 86400 * 2) return (s / 86400).toFixed(2) + ' days'
      if (s >= 3600) return (s / 3600).toFixed(2) + ' h'
      if (s >= 120) return (s / 60).toFixed(1) + ' min'
      return s.toFixed(0) + ' s'
    },
    deg(rad) {
      return ((rad * 180) / Math.PI).toFixed(2) + '°'
    },
    num(x, d) {
      return x.toLocaleString(undefined, { maximumFractionDigits: d == null ? 3 : d })
    },
  }

  // --- control widgets ---------------------------------------------------------
  // Each appends a labelled row to a parent and returns an accessor.
  function slider(parent, opt, onInput) {
    const out = el('span', { class: 'val' })
    const input = el('input', { type: 'range', min: opt.min, max: opt.max, step: opt.step, value: opt.value, 'aria-label': opt.label })
    const show = (v) => {
      out.textContent = opt.fmt ? opt.fmt(v) : String(v)
      input.setAttribute('aria-valuetext', out.textContent) // announce the human-readable value, not raw SI
    }
    show(opt.value)
    input.addEventListener('input', () => {
      const v = parseFloat(input.value)
      show(v)
      onInput(v)
    })
    parent.appendChild(el('label', { class: 'ctl' }, [el('span', { class: 'ctl-label' }, [opt.label, out]), input]))
    // set() coerces so a caller passing a formatted string cannot break the fmt path.
    return { get: () => parseFloat(input.value), set: (v) => { v = parseFloat(v); input.value = v; show(v) } }
  }

  function select(parent, opt, onChange) {
    const sel = el('select')
    opt.options.forEach((o, i) => sel.appendChild(el('option', { value: String(i) }, [o.label])))
    sel.value = String(opt.value || 0)
    sel.addEventListener('change', () => onChange(opt.options[parseInt(sel.value, 10)].value, parseInt(sel.value, 10)))
    parent.appendChild(el('label', { class: 'ctl' }, [el('span', { class: 'ctl-label' }, [opt.label]), sel]))
    return {
      get: () => opt.options[parseInt(sel.value, 10)].value,
      index: () => parseInt(sel.value, 10),
      // Programmatic set (does not fire change), so a panel can keep the dropdown in sync.
      set: (val) => { const i = opt.options.findIndex((o) => o.value === val); if (i >= 0) sel.value = String(i) },
    }
  }

  function checkbox(parent, label, value, onChange) {
    const box = el('input', { type: 'checkbox' })
    box.checked = !!value
    box.addEventListener('change', () => onChange(box.checked))
    parent.appendChild(el('label', { class: 'ctl ctl-check' }, [box, el('span', {}, [label])]))
    return { get: () => box.checked }
  }

  function button(parent, label, onClick) {
    const b = el('button', { class: 'btn' }, [label])
    b.addEventListener('click', () => onClick(b))
    parent.appendChild(b)
    return b
  }

  function section(parent, title) {
    const body = el('div', { class: 'sec-body' })
    parent.appendChild(el('div', { class: 'sec' }, [el('h3', {}, [title]), body]))
    return body
  }

  /** A key/value readout block; returns set(key, value) and clear(). */
  function readout(parent) {
    const dl = el('dl', { class: 'readout' })
    parent.appendChild(dl)
    const rows = {}
    return {
      set(key, value, accent) {
        let row = rows[key]
        if (!row) {
          const dd = el('dd')
          dl.appendChild(el('dt', {}, [key]))
          dl.appendChild(dd)
          row = rows[key] = dd
        }
        row.textContent = value
        row.className = accent ? 'accent' : ''
      },
    }
  }

  // --- canvas viewport ---------------------------------------------------------
  // World coordinates are physical; +x right, +y up, origin at canvas centre. A
  // panel calls fit(halfWidth) to choose how much world half-extent fills the view.
  class Viewport {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.halfWidth = 1
      this.margin = 28
      this.cx = 0
      this.cy = 0
      this._render = null
      this.cssW = 1
      this.cssH = 1
      const ro = new ResizeObserver(() => this._resize())
      ro.observe(canvas.parentElement)
      this._resize()
    }
    onResize(cb) { this._render = cb }
    _resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = this.canvas.parentElement.getBoundingClientRect()
      this.cssW = Math.max(1, Math.floor(rect.width))
      this.cssH = Math.max(1, Math.floor(rect.height))
      this.canvas.width = Math.floor(this.cssW * dpr)
      this.canvas.height = Math.floor(this.cssH * dpr)
      this.canvas.style.width = this.cssW + 'px'
      this.canvas.style.height = this.cssH + 'px'
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (this._render) this._render()
    }
    fit(halfWidth, cx, cy) {
      this.halfWidth = halfWidth
      this.cx = cx || 0
      this.cy = cy || 0
    }
    get scale() {
      return (Math.min(this.cssW, this.cssH) / 2 - this.margin) / this.halfWidth
    }
    sx(x) { return this.cssW / 2 + (x - this.cx) * this.scale }
    sy(y) { return this.cssH / 2 - (y - this.cy) * this.scale }
    clear(bg) {
      this.ctx.fillStyle = bg || '#070b14'
      this.ctx.fillRect(0, 0, this.cssW, this.cssH)
    }
    grid(stepWorld, color) {
      const c = this.ctx
      c.save()
      c.strokeStyle = color || 'rgba(120,150,210,0.08)'
      c.lineWidth = 1
      const sc = this.scale
      const stepPx = stepWorld * sc
      if (stepPx > 6) {
        const x0 = this.sx(this.cx) % stepPx
        const y0 = this.sy(this.cy) % stepPx
        c.beginPath()
        for (let x = x0; x < this.cssW; x += stepPx) { c.moveTo(x, 0); c.lineTo(x, this.cssH) }
        for (let y = y0; y < this.cssH; y += stepPx) { c.moveTo(0, y); c.lineTo(this.cssW, y) }
        c.stroke()
      }
      c.restore()
    }
    disc(x, y, rpx, color) {
      const c = this.ctx
      c.beginPath()
      c.arc(this.sx(x), this.sy(y), rpx, 0, TAU)
      c.fillStyle = color
      c.fill()
    }
    glow(x, y, rpx, color) {
      const c = this.ctx
      const g = c.createRadialGradient(this.sx(x), this.sy(y), 0, this.sx(x), this.sy(y), rpx)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.beginPath()
      c.arc(this.sx(x), this.sy(y), rpx, 0, TAU)
      c.fill()
    }
    ring(x, y, rpx, color, width) {
      const c = this.ctx
      c.beginPath()
      c.arc(this.sx(x), this.sy(y), rpx, 0, TAU)
      c.strokeStyle = color
      c.lineWidth = width || 1
      c.stroke()
    }
    /** Draw a world-space polyline of [x,y] points. */
    poly(points, opt) {
      const c = this.ctx
      opt = opt || {}
      c.save()
      c.beginPath()
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const X = this.sx(p[0]), Y = this.sy(p[1])
        if (i === 0) c.moveTo(X, Y)
        else c.lineTo(X, Y)
      }
      if (opt.close) c.closePath()
      if (opt.dash) c.setLineDash(opt.dash)
      c.strokeStyle = opt.stroke || '#8fb6ff'
      c.lineWidth = opt.width || 1.5
      c.stroke()
      c.restore()
    }
    label(x, y, text, color, dx, dy) {
      const c = this.ctx
      const X = this.sx(x) + (dx == null ? 6 : dx)
      const Y = this.sy(y) + (dy == null ? -6 : dy)
      c.save()
      c.font = '12px ui-monospace, Menlo, Consolas, monospace'
      // Dark halo so labels stay legible over the potential heatmap and any background.
      c.lineWidth = 3
      c.lineJoin = 'round'
      c.strokeStyle = 'rgba(0,0,0,0.85)'
      c.strokeText(text, X, Y)
      c.fillStyle = color || '#9fb2d8'
      c.fillText(text, X, Y)
      c.restore()
    }
  }

  // --- panel registry and boot -------------------------------------------------
  function registerPanel(panel) { PANELS.push(panel) }

  function boot() {
    if (!window.Orrery) {
      document.body.innerHTML =
        '<div class="fatal">orrery-core.js did not load. Run <code>npm run build:web</code>, ' +
        'then open this page with <code>npm run web</code> (some browsers block local module loads from file://).</div>'
      return
    }
    const tabs = document.getElementById('tabs')
    const host = document.getElementById('panels')
    const built = new Set()
    tabs.setAttribute('role', 'tablist')
    tabs.setAttribute('aria-label', 'Astrodynamics panels')

    function show(panel) {
      for (const t of tabs.children) {
        const on = t.dataset.id === panel.id
        t.classList.toggle('active', on)
        t.setAttribute('aria-selected', on ? 'true' : 'false')
        t.tabIndex = on ? 0 : -1
      }
      for (const s of host.children) s.classList.toggle('active', s.dataset.panel === panel.id)
      if (!built.has(panel.id)) {
        built.add(panel.id)
        const section = host.querySelector(`[data-panel="${panel.id}"]`)
        const controls = section.querySelector('.controls')
        const canvas = section.querySelector('canvas')
        const vp = new Viewport(canvas)
        panel.setup({ controls, canvas, vp, stage: section.querySelector('.stage') })
      }
    }

    PANELS.forEach((panel, i) => {
      const tab = el('button', { class: 'tab', role: 'tab', id: 'tab-' + panel.id, 'aria-controls': 'panel-' + panel.id, 'aria-selected': 'false', tabindex: '-1' }, [panel.label])
      tab.dataset.id = panel.id
      tab.addEventListener('click', () => show(panel))
      tabs.appendChild(tab)

      const sec = el('section', { class: 'panel', role: 'tabpanel', id: 'panel-' + panel.id, 'aria-labelledby': 'tab-' + panel.id, tabindex: '0' })
      sec.dataset.panel = panel.id
      const controls = el('aside', { class: 'controls' })
      if (panel.hint) controls.appendChild(el('p', { class: 'hint' }, [panel.hint]))
      const canvas = el('canvas', { role: 'img', 'aria-label': panel.label + ' plot; the live values are in the adjacent readout panel' })
      const stage = el('div', { class: 'stage' }, [canvas])
      sec.appendChild(controls)
      sec.appendChild(stage)
      host.appendChild(sec)
      if (i === 0) show(panel)
    })

    // Roving Left/Right/Home/End navigation across the tablist (WAI-ARIA tabs pattern).
    tabs.addEventListener('keydown', (e) => {
      const list = Array.from(tabs.children)
      const cur = list.indexOf(document.activeElement)
      if (cur < 0) return
      let next = -1
      if (e.key === 'ArrowRight') next = (cur + 1) % list.length
      else if (e.key === 'ArrowLeft') next = (cur - 1 + list.length) % list.length
      else if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = list.length - 1
      if (next < 0) return
      e.preventDefault()
      list[next].focus()
      list[next].click()
    })
  }

  window.UI = { registerPanel, el, fmt, slider, select, checkbox, button, section, readout, Viewport, TAU }
  document.addEventListener('DOMContentLoaded', boot)
})()
