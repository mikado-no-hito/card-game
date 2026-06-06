// ============================================================
// cardImage.js
// 画像の読み込み（縮小して保存サイズを抑える）と、
// transform から表示用の切り出し画像(dataURL)を生成するヘルパー。
// localStorage を圧迫しないよう、元画像は縮小して保存します。
// ============================================================

import { computeCropRect, defaultTransform, ART_ASPECT, layoutFrame } from './components/imageCropper.js';
export { layoutFrame };

const cache = new Map(); // 切り出し結果のメモ化

// アルバム等から選んだ画像ファイルを、最大辺 maxDim px に縮小した
// dataURL(JPEG) にして返す。
export function loadImageDownscaled(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// カードの imageSource + imageTransform から、表示用の切り出し画像を生成。
// outW は出力幅（高さは ART_ASPECT で決まる）。結果はキャッシュ。
export function toDisplayDataURL(card, outW = 600) {
  if (!card.imageSource) return Promise.resolve('');
  const key = `${card.id}|${JSON.stringify(card.imageTransform || {})}|${outW}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = computeCropRect(img.naturalWidth, img.naturalHeight, card.imageTransform || defaultTransform());
      const outH = Math.round(outW / ART_ASPECT);
      const c = document.createElement('canvas');
      c.width = outW; c.height = outH;
      c.getContext('2d').drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, outW, outH);
      const url = c.toDataURL('image/jpeg', 0.85);
      cache.set(key, url);
      resolve(url);
    };
    img.onerror = () => resolve('');
    img.src = card.imageSource;
  });
}

// <img> 要素にカード画像を非同期でセット（未設定なら何もしない）
export function setCardImage(imgEl, card, outW = 600) {
  toDisplayDataURL(card, outW).then((url) => { if (url) imgEl.src = url; });
}

// プロフィールアイコン用: 正方形(1:1)に切り出した dataURL を返す
export function toIconDataURL(source, transform, size = 256) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = computeCropRect(img.naturalWidth, img.naturalHeight, transform || defaultTransform(), 1);
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.getContext('2d').drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve('');
    img.src = source;
  });
}

export function invalidateCardImage(cardId) {
  for (const k of [...cache.keys()]) if (k.startsWith(`${cardId}|`)) cache.delete(k);
}
