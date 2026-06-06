// ============================================================
// store.js
// カード・デッキ・プレイヤープロフィールの保存・読み込み。
// ============================================================

const KEYS = {
  cards:   'cardgame.cards',
  decks:   'cardgame.decks',
  profile: 'cardgame.profile',
};

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  // --- カード ---
  getCards() { return read(KEYS.cards) || []; },
  getCard(id) { return this.getCards().find((c) => c.id === id) || null; },
  saveCard(card) {
    const cards = this.getCards();
    const i = cards.findIndex((c) => c.id === card.id);
    if (i >= 0) cards[i] = card; else cards.push(card);
    write(KEYS.cards, cards);
    return card;
  },
  deleteCard(id) {
    write(KEYS.cards, this.getCards().filter((c) => c.id !== id));
    const decks = this.getDecks().map((d) => ({
      ...d, cardIds: d.cardIds.filter((cid) => cid !== id),
    }));
    write(KEYS.decks, decks);
  },

  // --- デッキ ---
  getDecks() { return read(KEYS.decks) || []; },
  getDeck(id) { return this.getDecks().find((d) => d.id === id) || null; },
  saveDeck(deck) {
    const decks = this.getDecks();
    const i = decks.findIndex((d) => d.id === deck.id);
    if (i >= 0) decks[i] = deck; else decks.push(deck);
    write(KEYS.decks, decks);
    return deck;
  },
  deleteDeck(id) {
    write(KEYS.decks, this.getDecks().filter((d) => d.id !== id));
  },
  resolveDeck(deck) {
    const map = new Map(this.getCards().map((c) => [c.id, c]));
    return deck.cardIds.map((id) => map.get(id)).filter(Boolean);
  },

  // --- プレイヤープロフィール ---
  getProfile() {
    return read(KEYS.profile) || { name: 'プレイヤー', icon: '' };
  },
  saveProfile(profile) {
    write(KEYS.profile, profile);
  },
};
