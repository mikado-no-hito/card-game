// ============================================================
// util.js
// 画面を組み立てるための小さな DOM ヘルパー。
//   el('button.primary', { onclick }, 'ラベル')
// のように、タグ + クラス + 属性/イベント + 子要素 を一度に作れます。
// ============================================================

export function el(tagSpec, props = {}, ...children) {
  // "div.card.large#id" の記法を解釈
  const [tagAndId, ...classes] = tagSpec.split('.');
  const [tag, id] = tagAndId.split('#');
  const node = document.createElement(tag || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');

  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

// 子要素をまとめて差し替える
export function clear(node) { node.replaceChildren(); return node; }

// カード名などを、はみ出さないギリギリまでフォントサイズを縮める。
// 要素は幅が確定している必要があるため、DOM 追加後に呼ぶこと。
//   fitText(nameEl, { max: 22, min: 9 })
export function fitText(node, { max = 22, min = 9 } = {}) {
  if (!node) return;
  node.style.whiteSpace = 'nowrap';
  let size = max;
  node.style.fontSize = size + 'px';
  // 横にはみ出している間、最小値まで 1px ずつ縮める
  let guard = 64;
  while (node.scrollWidth > node.clientWidth && size > min && guard-- > 0) {
    size -= 1;
    node.style.fontSize = size + 'px';
  }
}
