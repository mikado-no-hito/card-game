// ============================================================
// screens/deckBuilder.js  —  ② コレクション / デッキ編成
// 変更点:
//  ・ミニカード: 名前を最上部、説明文を表示
//  ・コレクション: タップで拡大表示、ソート/絞り込み機能
//  ・デッキエディタ: 同じカードの重複選択を防止
// ============================================================

import { Screen } from '../router.js';
import { el, fitText } from '../util.js';
import { store } from '../store.js';
import { createDeck, validateDeck, isDeckComplete, DECK_RULES } from '../models.js';
import { setCardImage } from '../cardImage.js';
import { orientation } from '../orientation.js';

export class DeckBuilderScreen extends Screen {
  mount(params) {
    orientation.setPreferred(null);
    this.view = params.tab === 'decks' ? 'decks' : 'collection';
    this.editing = null;
    this.slots = null;
    this.picker = null;
    this.enlargeCard = null;  // コレクションで拡大表示中のカード
    this.collectionMode = null; // null | 'edit' | 'delete'

    // コレクションのソート・絞り込み状態
    this.sortKey = 'createdAt';  // createdAt / cost / name
    this.filterCost = '';        // '' / '1' / '2' / '3'
    this.filterTag = '';         // タグ文字列

    this.bodyEl = el('div.db-body');
    this.titleEl = el('h2', {}, 'コレクション');
    this.headRight = el('div.head-right');

    this.root.append(
      el('div.screen', {},
        el('header.bar', {},
          el('button.back', { onclick: () => this._onBack() }, '← 戻る'),
          this.titleEl,
          this.headRight,
        ),
        this.bodyEl,
      ),
    );
    this.render();
  }

  _onBack() {
    if (this.enlargeCard) { this.enlargeCard = null; this.render(); return; }
    if (this.view === 'editor') { this.view = 'decks'; this.editing = null; this.render(); }
    else if (this.view === 'decks') { this.view = 'collection'; this.render(); }
    else this.app.navigate('/home');
  }

  render() {
    if (this.view === 'collection') return this._renderCollection();
    if (this.view === 'decks') return this._renderDeckList();
    return this._renderEditor();
  }

  // ====== ミニカード（名前が一番上・説明文全表示・タグ最下部） ======
  _mini(c, opts = {}) {
    const name = el('div.mc-name', {}, c.name || '（無名）');
    const artImg = el('img.mc-art-img', { alt: '', draggable: 'false' });
    const art = c.imageSource
      ? el('div.mc-art', {}, artImg)
      : el('div.mc-art empty', {}, '画像なし');
    if (c.imageSource) setCardImage(artImg, c, 300);

    const text = el('div.mc-text', {}, c.text || '');
    const tags = c.tags && c.tags.length
      ? el('div.mc-tags', {}, ...c.tags.map((t) => el('span.mc-tag', {}, t)))
      : null;

    const cls = `div.mini-card${opts.compact ? ' compact' : ''}${opts.extraClass || ''}`;
    const node = el(
      cls,
      { onclick: opts.onclick || null },
      el('div.mc-cost', {}, c.cost),
      name,
      art,
      text,
      tags,
      opts.actions || null,
    );
    // fitText は使わない（名前は固定高さで揃える）
    return node;
  }

  // ====== コレクション（カード一覧） ======
  _renderCollection() {
    this.titleEl.textContent = 'コレクション';

    // モード表示用ラベル
    const modeLabel = this.collectionMode === 'edit'
      ? '✏️ 編集するカードを選択してください'
      : this.collectionMode === 'delete'
        ? '🗑️ 削除するカードを選択してください'
        : null;

    // ヘッダー右側: 編集・削除モードボタン + 新規カード + デッキ
    const editBtn = el('button', {
      style: this.collectionMode === 'edit' ? 'background:var(--primary);color:#fff' : '',
      onclick: () => {
        this.collectionMode = this.collectionMode === 'edit' ? null : 'edit';
        this.render();
      },
    }, '✏️ 編集');
    const deleteBtn = el('button', {
      style: this.collectionMode === 'delete' ? 'background:var(--danger);color:#fff;border-color:var(--danger)' : '',
      onclick: () => {
        this.collectionMode = this.collectionMode === 'delete' ? null : 'delete';
        this.render();
      },
    }, '🗑️ 削除');

    this.headRight.replaceChildren(
      editBtn,
      deleteBtn,
      el('button', { onclick: () => this.app.navigate('/cards/new') }, '＋ 新規カード'),
      el('button.primary', { onclick: () => { this.collectionMode = null; this.view = 'decks'; this.render(); } }, 'デッキ'),
    );

    const allCards = store.getCards();

    // --- ツールバー（ソート・絞り込み） ---
    const sortSel = el('select', { onchange: (e) => { this.sortKey = e.target.value; this.render(); } },
      el('option', { value: 'createdAt' }, '作成順'),
      el('option', { value: 'cost' }, 'コスト順'),
      el('option', { value: 'name' }, '名前順'),
    );
    sortSel.value = this.sortKey;

    const costSel = el('select', { onchange: (e) => { this.filterCost = e.target.value; this.render(); } },
      el('option', { value: '' }, '全コスト'),
      el('option', { value: '1' }, 'コスト1'),
      el('option', { value: '2' }, 'コスト2'),
      el('option', { value: '3' }, 'コスト3'),
    );
    costSel.value = this.filterCost;

    const tagInput = el('input', {
      type: 'text', placeholder: 'タグで絞り込み', value: this.filterTag,
      oninput: (e) => { this.filterTag = e.target.value; this.render(); },
    });

    const toolbar = el('div.collection-toolbar', {},
      el('span.toolbar-label', {}, '並び替え:'), sortSel,
      el('span.toolbar-label', {}, '絞り込み:'), costSel,
      tagInput,
    );

    // --- フィルタリング・ソート ---
    let cards = [...allCards];
    if (this.filterCost) cards = cards.filter((c) => String(c.cost) === this.filterCost);
    if (this.filterTag.trim()) {
      const tag = this.filterTag.trim().toLowerCase();
      cards = cards.filter((c) => c.tags && c.tags.some((t) => t.toLowerCase().includes(tag)));
    }
    if (this.sortKey === 'cost') cards.sort((a, b) => a.cost - b.cost || (a.name || '').localeCompare(b.name || ''));
    else if (this.sortKey === 'name') cards.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else cards.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    // --- グリッド ---
    const grid = el('div.card-grid');
    if (!cards.length) {
      grid.append(el('p.empty', {}, allCards.length
        ? '絞り込み条件に合うカードがありません'
        : 'まだカードがありません。「＋ 新規カード」から作成してください。'));
    }
    for (const c of cards) {
      // モードに応じたクリック処理
      let onCardClick;
      let extraClass = '';
      if (this.collectionMode === 'edit') {
        onCardClick = () => this.app.navigate(`/cards/edit?id=${c.id}`);
        extraClass = ' mode-hover';
      } else if (this.collectionMode === 'delete') {
        onCardClick = () => this._deleteCard(c.id);
        extraClass = ' mode-delete';
      } else {
        // 通常モード: タップで拡大表示
        onCardClick = () => { this.enlargeCard = c; this.render(); };
      }
      grid.append(this._mini(c, {
        onclick: onCardClick,
        extraClass,
      }));
    }

    this.bodyEl.replaceChildren(
      el('section.panel', {},
        el('h3', {}, `作成したカード（${allCards.length}）`),
        modeLabel ? el('p', { style: 'color:var(--primary);font-weight:700;margin-bottom:8px' }, modeLabel) : null,
        toolbar,
        grid,
      ),
      this.enlargeCard ? this._cardModal(this.enlargeCard) : null,
    );
  }

  // ====== カード拡大モーダル ======
  _cardModal(c) {
    const artImg = el('img.pv-art-img', { alt: '', draggable: 'false' });
    const art = c.imageSource
      ? el('div.pv-art', {}, artImg)
      : el('div.pv-art', {}, el('span', {}, '画像なし'));
    if (c.imageSource) setCardImage(artImg, c, 600);

    const card = el('div.card-modal-card', {},
      el('div.pv-cost', {}, c.cost),
      el('div.pv-name', {}, c.name || '（無名）'),
      art,
      el('div.pv-text', {}, c.text || '（説明なし）'),
      c.tags && c.tags.length ? el('div.pv-tags', {}, ...c.tags.map((t) => el('span.pv-tag', {}, t))) : null,
    );

    const overlay = el('div.card-modal-overlay', { onclick: (e) => {
      if (e.target === overlay) { this.enlargeCard = null; this.render(); }
    }},
      el('div.card-modal-inner', {},
        el('button.card-modal-close', { onclick: () => { this.enlargeCard = null; this.render(); } }, '✕'),
        card,
      ),
    );
    return overlay;
  }

  // ====== デッキ一覧 ======
  _renderDeckList() {
    this.titleEl.textContent = 'デッキ';
    this.headRight.replaceChildren(
      el('button.primary', { onclick: () => this._newDeck() }, '＋ 新規編成'),
    );

    const decks = store.getDecks();
    const list = el('div.deck-list');
    if (!decks.length) list.append(el('p.empty', {}, 'デッキがありません。「＋ 新規編成」で作成してください。'));
    for (const d of decks) {
      const cards = store.resolveDeck(d);
      const complete = isDeckComplete(cards);
      list.append(el('div.deck-row', {},
        el('span.deck-name', {}, d.name),
        el('span.deck-badge ' + (complete ? 'ok' : 'ng'), {}, complete ? '完成' : '未完成'),
        el('span.deck-count', {}, `${cards.length} / ${DECK_RULES.total} 枚`),
        el('div.mc-actions', {},
          el('button', { onclick: () => this._editDeck(d) }, 'デッキ編成'),
          el('button.danger', {
            onclick: () => { if (confirm('削除しますか？')) { store.deleteDeck(d.id); this.render(); } },
          }, '削除'),
        ),
      ));
    }
    this.bodyEl.replaceChildren(
      el('section.panel', {},
        el('p.hint', {}, `ルール: 合計 ${DECK_RULES.total} 枚 / コスト1・2・3 を各 ${DECK_RULES.perCost} 枚ずつ`),
        list,
      ),
    );
  }

  _newDeck() {
    this.editing = createDeck({ name: `デッキ${store.getDecks().length + 1}` });
    this.slots = { 1: [null, null, null], 2: [null, null, null], 3: [null, null, null] };
    this.view = 'editor'; this.render();
  }

  _editDeck(deck) {
    this.editing = { ...deck, cardIds: [...deck.cardIds] };
    const slots = { 1: [null, null, null], 2: [null, null, null], 3: [null, null, null] };
    const idx = { 1: 0, 2: 0, 3: 0 };
    for (const cid of deck.cardIds) {
      const card = store.getCard(cid);
      if (card && idx[card.cost] < DECK_RULES.perCost) slots[card.cost][idx[card.cost]++] = cid;
    }
    this.slots = slots;
    this.view = 'editor'; this.render();
  }

  // ====== デッキエディタ ======
  _renderEditor() {
    this.titleEl.textContent = this.editing.cardIds ? 'デッキ編成' : '新規編成';
    this.headRight.replaceChildren();

    const nameInput = el('input', {
      type: 'text', value: this.editing.name,
      oninput: (e) => { this.editing.name = e.target.value; },
    });

    const costRows = DECK_RULES.costs.map((cost) =>
      el('div.cost-row', {},
        el('div.cost-tag', {}, `コスト ${cost}`),
        el('div.slot-row', {}, ...this.slots[cost].map((cid, i) => this._slot(cost, i, cid))),
      ),
    );

    const filled = this._filledCount();
    const errors = el('div.errors');

    const save = () => {
      this.editing.cardIds = this._collectIds();
      const cards = store.resolveDeck({ cardIds: this.editing.cardIds });
      const errs = validateDeck(this.editing, cards);
      errors.replaceChildren(...errs.map((m) => el('div.error', {}, m)));
      store.saveDeck(this.editing);
      this.view = 'decks'; this.editing = null; this.render();
    };

    this.bodyEl.replaceChildren(
      el('section.panel deck-editor', {},
        el('label.field', {}, el('span.field-label', {}, 'デッキ名'), nameInput),
        el('p.hint', {}, `各コスト ${DECK_RULES.perCost} 枚ずつ・合計 ${DECK_RULES.total} 枚（現在 ${filled} 枚）`),
        ...costRows,
        errors,
        el('div.actions', {},
          el('button.primary', { onclick: save }, '保存'),
          el('button', {
            onclick: () => { this.view = 'decks'; this.editing = null; this.render(); },
          }, 'キャンセル'),
        ),
      ),
      this.picker ? this._pickerOverlay() : null,
    );
  }

  _slot(cost, index, cardId) {
    const card = cardId ? store.getCard(cardId) : null;
    if (card) {
      return el('div.slot filled', { onclick: () => this._openPicker(cost, index) },
        this._mini(card, { compact: true }));
    }
    return el('button.slot empty', { onclick: () => this._openPicker(cost, index) }, '＋');
  }

  _openPicker(cost, index) { this.picker = { cost, index }; this.render(); }

  _pickerOverlay() {
    const { cost, index } = this.picker;

    // 現在スロットに入っている全カードIDを収集（重複防止用）
    const usedIds = new Set(this._collectIds());
    // 現在のスロットのカードは選択可能（自分のスロット）
    const currentSlotId = this.slots[cost][index];
    if (currentSlotId) usedIds.delete(currentSlotId);

    const choices = store.getCards().filter((c) => c.cost === cost);
    const grid = el('div.card-grid');
    if (!choices.length) {
      grid.append(el('p.empty', {}, `コスト ${cost} のカードがありません。先に作成してください。`));
    }
    for (const c of choices) {
      const alreadyUsed = usedIds.has(c.id);
      const cardEl = this._mini(c, {
        compact: true,
        onclick: alreadyUsed ? null : () => this._pick(cost, index, c.id),
      });
      if (alreadyUsed) {
        cardEl.style.opacity = '0.4';
        cardEl.title = '既に他のスロットで使用中';
      }
      grid.append(cardEl);
    }

    return el('div.overlay', {
      onclick: (e) => { if (e.target.classList.contains('overlay')) this._closePicker(); },
    },
      el('div.overlay-card', {},
        el('div.overlay-head', {},
          el('h3', {}, `コスト ${cost} のカードを選択`),
          el('button', { onclick: () => this._closePicker() }, '閉じる'),
        ),
        el('div.actions', {},
          el('button.danger', {
            onclick: () => this._pick(cost, index, null),
          }, 'このスロットを空にする'),
        ),
        el('p.hint', {}, '※ 既に他のスロットで使用中のカードは選択できません'),
        grid,
      ),
    );
  }

  _pick(cost, index, cardId) { this.slots[cost][index] = cardId; this.picker = null; this.render(); }
  _closePicker() { this.picker = null; this.render(); }

  _collectIds() {
    const ids = [];
    for (const cost of DECK_RULES.costs) {
      for (const cid of this.slots[cost]) if (cid) ids.push(cid);
    }
    return ids;
  }
  _filledCount() { return this._collectIds().length; }

  _deleteCard(id) {
    if (!confirm('このカードを削除しますか？（デッキからも取り除かれます）')) return;
    store.deleteCard(id);
    this.enlargeCard = null;
    this.render();
  }
}
