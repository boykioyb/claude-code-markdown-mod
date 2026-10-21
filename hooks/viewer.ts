// A standalone page for one diagram: wheel zoom around the pointer, drag to pan, fit, browser full screen.
const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

export const viewerHtml = (title: string, svg: string): string => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  html, body { margin: 0; height: 100%; background: #f6f7f9; font: 14px system-ui, sans-serif; }
  #bar { position: fixed; top: 12px; right: 12px; z-index: 2; display: flex; gap: 6px; align-items: center;
    background: #fff; border: 1px solid #d0d4da; border-radius: 8px; padding: 6px 8px; box-shadow: 0 2px 8px #0001; }
  #bar button { font: inherit; padding: 4px 10px; border: 1px solid #c4c9d0; border-radius: 6px; background: #fff; cursor: pointer; }
  #bar button:hover { background: #eef1f4; }
  #pct { min-width: 48px; text-align: right; color: #555; font-variant-numeric: tabular-nums; }
  #stage { position: fixed; inset: 0; overflow: hidden; cursor: grab; }
  #stage.drag { cursor: grabbing; }
  #wrap { position: absolute; left: 0; top: 0; transform-origin: 0 0; background: #fff; }
  #wrap svg { display: block; max-width: none !important; }
</style></head><body>
<div id="bar">
  <button id="zout" title="Thu nhỏ (-)">−</button><span id="pct"></span><button id="zin" title="Phóng to (+)">+</button>
  <button id="fit" title="Vừa màn hình (0)">Vừa màn hình</button><button id="one" title="Kích thước thật (1)">100%</button>
  <button id="fs" title="Toàn màn hình (f)">Toàn màn hình</button>
</div>
<div id="stage"><div id="wrap">${svg}</div></div>
<script>
  const stage = document.getElementById('stage'), wrap = document.getElementById('wrap')
  const svg = wrap.querySelector('svg'), pct = document.getElementById('pct')
  const w = svg.width.baseVal.value || svg.getBBox().width, h = svg.height.baseVal.value || svg.getBBox().height
  svg.setAttribute('width', w); svg.setAttribute('height', h)
  let s = 1, x = 0, y = 0
  const apply = () => { wrap.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; pct.textContent = Math.round(s * 100) + '%' }
  const zoomAt = (factor, cx, cy) => {
    const next = Math.min(20, Math.max(0.05, s * factor))
    x = cx - (cx - x) * (next / s); y = cy - (cy - y) * (next / s); s = next; apply()
  }
  const center = () => { x = (innerWidth - w * s) / 2; y = (innerHeight - h * s) / 2; apply() }
  const fit = () => { s = Math.min((innerWidth - 48) / w, (innerHeight - 96) / h); center() }
  const mid = () => [innerWidth / 2, innerHeight / 2]
  stage.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY) }, { passive: false })
  let drag = null
  stage.addEventListener('pointerdown', e => { drag = [e.clientX - x, e.clientY - y]; stage.classList.add('drag'); stage.setPointerCapture(e.pointerId) })
  stage.addEventListener('pointermove', e => { if (drag) { x = e.clientX - drag[0]; y = e.clientY - drag[1]; apply() } })
  stage.addEventListener('pointerup', () => { drag = null; stage.classList.remove('drag') })
  document.getElementById('zin').onclick = () => zoomAt(1.25, ...mid())
  document.getElementById('zout').onclick = () => zoomAt(0.8, ...mid())
  document.getElementById('fit').onclick = fit
  document.getElementById('one').onclick = () => { s = 1; center() }
  const toggleFull = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
  document.getElementById('fs').onclick = toggleFull
  addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') zoomAt(1.25, ...mid())
    else if (e.key === '-') zoomAt(0.8, ...mid())
    else if (e.key === '0') fit()
    else if (e.key === '1') { s = 1; center() }
    else if (e.key === 'f') toggleFull()
  })
  addEventListener('resize', fit)
  fit()
</script></body></html>
`
