// ============================================================
// orientation.js
// スマホでの推奨画面向きを案内する。
//  - カード作成 → 縦(portrait) 推奨
//  - 対戦       → 横(landscape) 推奨
// Web では端末の向きを強制ロックできないため、向きが合わないときに
// 「回転してください」のオーバーレイを表示する方式にしています。
// （PC では発動しません）
// ============================================================

let preferred = null;   // 'portrait' | 'landscape' | null
let overlay = null;

function isPhone() {
  // タッチ操作 かつ 短辺が小さい端末をスマホ扱い
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) <= 600;
  return coarse && small;
}

function currentOrientation() {
  return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'orientation-overlay';
  overlay.innerHTML = `
    <div class="orientation-card">
      <div class="orientation-icon">⟳</div>
      <p class="orientation-text"></p>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function update() {
  if (!preferred || !isPhone() || currentOrientation() === preferred) {
    if (overlay) overlay.classList.remove('show');
    return;
  }
  const o = ensureOverlay();
  o.querySelector('.orientation-text').textContent =
    preferred === 'portrait' ? '画面を縦にしてください' : '画面を横にしてください';
  o.classList.add('show');
}

window.addEventListener('resize', update);
window.addEventListener('orientationchange', update);

export const orientation = {
  // 各画面の mount() から呼ぶ。null で解除（どの向きでもOK）。
  setPreferred(o) { preferred = o; update(); },
};
