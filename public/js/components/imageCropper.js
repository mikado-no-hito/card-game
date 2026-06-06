// ============================================================
// components/imageCropper.js
// ============================================================

import { el } from '../util.js';

export const ART_ASPECT = 4 / 3;

export function defaultTransform() { return { zoom: 1, cx: 0.5, cy: 0.5 }; }

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// aspect パラメータで縦横比を指定可能（デフォルト: ART_ASPECT = 4/3）
export function computeCropRect(natW, natH, t, aspect = ART_ASPECT) {
  const tr = { ...defaultTransform(), ...(t || {}) };
  const zoom = Math.max(1, tr.zoom || 1);

  let coverW, coverH;
  if (natW / natH > aspect) { coverH = natH; coverW = natH * aspect; }
  else { coverW = natW; coverH = natW / aspect; }

  const cropW = coverW / zoom;
  const cropH = coverH / zoom;

  const cx = clamp(tr.cx, (cropW / 2) / natW, 1 - (cropW / 2) / natW);
  const cy = clamp(tr.cy, (cropH / 2) / natH, 1 - (cropH / 2) / natH);

  return {
    sx: cx * natW - cropW / 2, sy: cy * natH - cropH / 2,
    sw: cropW, sh: cropH, cx, cy, zoom,
  };
}

export function layoutFrame(frameEl, imgEl, natW, natH, t, aspect = ART_ASPECT) {
  const FW = frameEl.clientWidth;
  if (!FW || !natW) return null;
  const FH = FW / aspect;
  frameEl.style.height = FH + 'px';

  const r = computeCropRect(natW, natH, t, aspect);
  const displayScale = FW / r.sw;
  imgEl.style.position = 'absolute';
  imgEl.style.maxWidth = 'none';
  imgEl.style.width = natW * displayScale + 'px';
  imgEl.style.height = natH * displayScale + 'px';
  imgEl.style.left = (FW / 2 - r.cx * natW * displayScale) + 'px';
  imgEl.style.top = (FH / 2 - r.cy * natH * displayScale) + 'px';
  return r;
}

export function createCropper({ src, transform, maxZoom = 4, aspect = ART_ASPECT, onChange } = {}) {
  const t = { ...defaultTransform(), ...(transform || {}) };
  const img = el('img.cropper-img', { src, alt: '', draggable: 'false' });
  const frame = el('div.cropper-frame', {}, img);

  let natW = 0, natH = 0, ready = false;
  const pointers = new Map();
  let pinchStart = null;

  function apply() {
    if (!ready) return;
    const r = layoutFrame(frame, img, natW, natH, t, aspect);
    if (r) { t.cx = r.cx; t.cy = r.cy; t.zoom = r.zoom; onChange && onChange({ ...t }); }
  }

  img.addEventListener('load', () => {
    natW = img.naturalWidth; natH = img.naturalHeight; ready = true; apply();
  });

  frame.addEventListener('pointerdown', (e) => {
    frame.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinchStart = { dist: pointerDist(), zoom: t.zoom };
  });
  frame.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !ready) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2 && pinchStart) {
      const ratio = pointerDist() / pinchStart.dist;
      t.zoom = clamp(pinchStart.zoom * ratio, 1, maxZoom);
      apply();
    } else {
      const FW = frame.clientWidth;
      const r = computeCropRect(natW, natH, t, aspect);
      const displayScale = FW / r.sw;
      t.cx -= (e.clientX - prev.x) / (natW * displayScale);
      t.cy -= (e.clientY - prev.y) / (natH * displayScale);
      apply();
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
  };
  frame.addEventListener('pointerup', endPointer);
  frame.addEventListener('pointercancel', endPointer);

  frame.addEventListener('wheel', (e) => {
    e.preventDefault();
    t.zoom = clamp(t.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 1, maxZoom);
    apply();
  }, { passive: false });

  function pointerDist() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  const ro = new ResizeObserver(() => apply());
  ro.observe(frame);

  return {
    element: frame,
    getTransform: () => ({ ...t }),
    setZoom: (z) => { t.zoom = clamp(z, 1, maxZoom); apply(); },
    relayout: apply,
    destroy: () => ro.disconnect(),
  };
}
