// ============================================================
// models.js
// カードとデッキのデータ構造。
// カードの項目: ①名前 ②コスト(1〜3) ③画像 ④説明文 ⑤タグ
// 画像は「元画像(縮小版) + 調整情報(transform)」で持ち、表示用の切り出しは
// cardImage.js が transform から生成します（余白なし・はみ出し制限つき）。
// ============================================================

// 一意な ID を生成
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ② コストの取り得る値（1〜3）
export const COST_VALUES = [1, 2, 3];

// 画像の調整情報の初期値（zoom=1, 中心 = 画像中央）
export function defaultImageTransform() {
  return { zoom: 1, cx: 0.5, cy: 0.5 };
}

// 新しいカードを作る。未指定の項目は既定値で補完。
export function createCard(data = {}) {
  return {
    id: data.id || uid('card'),
    name: data.name || '',
    cost: COST_VALUES.includes(data.cost) ? data.cost : 1,   // ② 1〜3
    imageSource: data.imageSource || '',                      // ③ 元画像(縮小版 dataURL)
    imageTransform: data.imageTransform || defaultImageTransform(), // ③ 拡大/位置の調整
    text: data.text || '',                                    // ④ 説明文
    tags: Array.isArray(data.tags) ? data.tags : [],          // ⑤ タグ
    attributes: data.attributes || {},                        // 将来用の自由項目（攻撃力など）
    createdAt: data.createdAt || Date.now(),
  };
}

// 入力チェック。問題なければ空配列、あればメッセージの配列を返す。
export function validateCard(card) {
  const errors = [];
  if (!card.name || !card.name.trim()) errors.push('カード名を入力してください');
  if (!COST_VALUES.includes(card.cost)) errors.push('コストは 1〜3 で指定してください');
  return errors;
}

// 新しいデッキを作る
export function createDeck(data = {}) {
  return {
    id: data.id || uid('deck'),
    name: data.name || '新しいデッキ',
    cardIds: Array.isArray(data.cardIds) ? data.cardIds : [],
    createdAt: data.createdAt || Date.now(),
  };
}

// デッキ構築のルール: 合計9枚 / コスト1・2・3 をそれぞれ3枚ずつ
export const DECK_RULES = {
  perCost: 3,            // 各コストの必要枚数
  costs: [1, 2, 3],      // 使用するコスト
  total: 9,              // 合計枚数（perCost * costs.length）
};

// 解決済みカード配列からコスト別枚数を数える
export function countByCost(cards) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const c of cards) if (counts[c.cost] != null) counts[c.cost]++;
  return counts;
}

// deck と「解決済みカード配列(任意)」を受け取り検証
export function validateDeck(deck, cards) {
  const errors = [];
  if (!deck.name || !deck.name.trim()) errors.push('デッキ名を入力してください');
  if (cards) {
    const counts = countByCost(cards);
    for (const cost of DECK_RULES.costs) {
      if (counts[cost] !== DECK_RULES.perCost) {
        errors.push(`コスト${cost} のカードを ${DECK_RULES.perCost} 枚にしてください（現在 ${counts[cost]} 枚）`);
      }
    }
  }
  return errors;
}

// デッキが対戦可能な完成状態か
export function isDeckComplete(cards) {
  const counts = countByCost(cards);
  return DECK_RULES.costs.every((c) => counts[c] === DECK_RULES.perCost);
}
