// ============================================================
// screens/battle.js  —  ③ 対戦
// ============================================================

import { Screen } from '../router.js';
import { el } from '../util.js';
import { store } from '../store.js';
import { net } from '../net.js';
import { createCPU } from '../cpu.js';
import { createGame, TOTAL_PHASES } from '../game.js';
import { setCardImage } from '../cardImage.js';
import { isDeckComplete } from '../models.js';
import { orientation } from '../orientation.js';
import { C2S, S2C, NET_STATE } from '../protocol.js';

const STAMPS = [
  { id: 'like',   emoji: '👍', label: 'いいね' },
  { id: 'dame',   emoji: '🙅', label: 'だめぇぇぇ！' },
  { id: 'unko',   emoji: '💩', label: 'うんこ！' },
  { id: 'lol',    emoji: '😂', label: '爆笑' },
  { id: 'point',  emoji: '👉', label: '指さし' },
  { id: 'chinko', emoji: '🍆', label: 'ちんこ' },
  { id: 'win',    emoji: '🏆', label: '勝ち！' },
  { id: 'lose',   emoji: '😭', label: '負け' },
];

export class BattleScreen extends Screen {
  mount() {
    orientation.setPreferred('landscape');
    this.selectedDeckId = null;
    this.randDeck = null;
    this.vsCPU = false;
    this.cpu = null;
    this.engine = null;
    this.myCards = [];
    this.seed = 0;
    this.cardPreview = null;    // 確認中のカード
    this.glowCardId = null;     // 赤光りアニメ中のカードID
    this.enlargedCard = null;   // 拡大表示中のカード { card, label }
    this.oppProfile = null;     // 相手のプロフィール（オンライン時）
    this.showStampPicker = false;
    this.receivedStamp = null;
    this.sentStamp = null;
    this._receivedStampTimer = null;
    this._sentStampTimer = null;

    this.statusEl = el('span.status');
    this.body = el('div.battle-body');

    this.root.append(
      el('div.screen', {},
        el('header.bar', {},
          el('button.back', { onclick: () => this._exit() }, '← 戻る'),
          el('h2', {}, '自作カードバトル'),
          this.statusEl,
        ),
        this.body,
      ),
    );

    this.addCleanup(net.onState((s) => this._renderStatus(s)));
    this.addCleanup(net.on(S2C.WAITING,       (p) => this._renderWaiting(p)));
    this.addCleanup(net.on(S2C.ROOM_CREATED,  (p) => this._renderWaiting(p)));
    this.addCleanup(net.on(S2C.GAME_START,    (p) => this._onStart(p)));
    this.addCleanup(net.on(S2C.GAME_ACTION,   (p) => this.engine && this.engine.remote(p)));
    this.addCleanup(net.on(S2C.OPPONENT_LEFT, () => { alert('相手が退出しました。'); this._exit(); }));
    this.addCleanup(net.on(S2C.ERROR,         (p) => alert(p.message || 'エラー')));
    this.addCleanup(net.on(S2C.STAMP,         (p) => this._onReceiveStamp(p)));

    net.connect();
    this._renderLobby();
  }

  unmount() {
    if (this.cpu) this.cpu.reset();
    if (!this.vsCPU && net.state === NET_STATE.CONNECTED) net.send(C2S.LEAVE);
    super.unmount();
  }

  _renderStatus(s) {
    this.statusEl.textContent = { disconnected: '● 未接続', connecting: '● 接続中…', connected: '● 接続済み' }[s] || s;
    this.statusEl.className = `status ${s}`;
  }

  _resolveSelectedDeck(id) {
    const did = id || this.selectedDeckId;

    // ランダムデッキ
    if (did === 'random') {
      if (!this.randDeck) {
        const cards = this._makeRandomDeck();
        if (!cards) return null;
        this.randDeck = cards;
      }
      return { deck: { id: 'random', name: 'ランダムデッキ', cardIds: this.randDeck.map((c) => c.id) }, cards: this.randDeck };
    }

    if (!did) { alert('デッキを選択してください'); return null; }
    const d = store.getDeck(did);
    if (!d) { alert('デッキを選択してください'); return null; }
    const cards = store.resolveDeck(d);
    if (!isDeckComplete(cards)) { alert('このデッキは未完成です（各コスト3枚ずつ・合計9枚にしてください）'); return null; }
    return { deck: d, cards };
  }

  _makeRandomDeck() {
    const allCards = store.getCards();
    const byCost = { 1: [], 2: [], 3: [] };
    for (const c of allCards) if (byCost[c.cost]) byCost[c.cost].push(c);
    const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const selected = [];
    for (const cost of [1, 2, 3]) {
      const s = shuffle(byCost[cost]);
      if (s.length < 3) { alert(`コスト${cost}のカードが3枚未満です（${s.length}枚）。各コスト3枚以上のカードが必要です。`); return null; }
      selected.push(...s.slice(0, 3));
    }
    return selected;
  }

  _deckSummary(d, cards) {
    return { id: d.id, name: d.name, cardIds: d.cardIds, cards: cards.map((c) => ({ id: c.id, name: c.name, cost: c.cost })) };
  }

  // ---------- ロビー ----------
  _renderLobby() {
    const decks = store.getDecks();
    const ready = decks.map((d) => ({ d, ok: isDeckComplete(store.resolveDeck(d)) }));

    const deckSelect = el('select', {
      onchange: (e) => {
        const v = e.target.value;
        if (v === 'random') {
          const cards = this._makeRandomDeck();
          if (cards) {
            this.randDeck = cards;
            this.selectedDeckId = 'random';
            this._renderLobby();
          } else {
            e.target.value = this.selectedDeckId || '';
          }
        } else {
          this.selectedDeckId = v;
          this.randDeck = null;
          this._renderLobby();
        }
      },
    },
      el('option', { value: '' }, decks.length ? 'デッキを選択…' : 'デッキがありません'),
      ...ready.map(({ d, ok }) => el('option', { value: d.id }, `${d.name}${ok ? '' : '（未完成）'}`)),
      decks.length > 0 ? el('option', { value: 'random' }, '🎲 ランダムデッキ（自動生成）') : null,
    );

    // 選択状態を反映
    if (this.selectedDeckId === 'random') {
      deckSelect.value = 'random';
    } else if (this.selectedDeckId) {
      deckSelect.value = this.selectedDeckId;
    } else {
      const firstOk = ready.find((r) => r.ok);
      if (firstOk) { this.selectedDeckId = firstOk.d.id; deckSelect.value = this.selectedDeckId; }
    }

    // ランダムデッキ選択中のカード一覧表示
    const randomInfo = (this.selectedDeckId === 'random' && this.randDeck)
      ? el('div', { style: 'font-size:.78rem;color:var(--text-dim);margin-top:4px;background:var(--surface-2);border-radius:6px;padding:6px 8px' },
          el('strong', {}, '🎲 '),
          this.randDeck.map((c) => `${c.name}(コスト${c.cost})`).join('、'),
        )
      : null;

    const pwInput = el('input', { type: 'text', placeholder: 'パスワード', maxlength: 20 });

    this.body.replaceChildren(
      el('section.lobby', {},
        el('label.field', {},
          el('span.field-label', {}, '使用デッキ（完成デッキのみ対戦可）'),
          deckSelect,
          randomInfo,
        ),
        !decks.length ? el('p.hint', {}, 'まず ', el('a', { href: '#/decks?tab=decks' }, 'デッキ編成'), ' でデッキを作成してください。') : null,
        el('div.lobby-cards', {},
          el('div.lobby-opt', {},
            el('h3', {}, 'パスワードで対戦'),
            el('p.hint', {}, '同じパスワードの相手と1対1。'),
            pwInput,
            el('div.actions', {},
              el('button', {
                onclick: () => {
                  const r = this._resolveSelectedDeck();
                  if (r) {
                    this._pending = r;
                    const profile = store.getProfile();
                    net.send(C2S.CREATE_ROOM, { deck: this._deckSummary(r.deck, r.cards), password: pwInput.value.trim(), profile: { name: profile.name, icon: profile.icon } });
                  }
                },
              }, '部屋を作る'),
              el('button', {
                onclick: () => {
                  const r = this._resolveSelectedDeck();
                  if (r) {
                    this._pending = r;
                    const profile = store.getProfile();
                    net.send(C2S.JOIN_ROOM, { deck: this._deckSummary(r.deck, r.cards), password: pwInput.value.trim(), profile: { name: profile.name, icon: profile.icon } });
                  }
                },
              }, '参加する'),
            ),
          ),
          el('div.lobby-opt', {},
            el('h3', {}, 'CPUと対戦'),
            el('p.hint', {}, '相手がいないときの練習用。ランダムデッキも使えます。'),
            el('button.primary', {
              onclick: () => { const r = this._resolveSelectedDeck(); if (r) this._startCPU(r.cards); },
            }, 'CPUと対戦する'),
          ),
        ),
      ),
    );
  }

  _renderWaiting(p) {
    this.body.replaceChildren(
      el('section.waiting', {},
        el('div.spinner'),
        el('h3', {}, '対戦相手を待っています…'),
        p.password ? el('p.room-code', {}, 'パスワード: ', el('strong', {}, p.password)) : null,
        p.password ? el('p.hint', {}, 'このパスワードを友達に伝えて「参加する」を押してもらってください。') : null,
        el('div.actions', {},
          el('button.primary', {
            onclick: () => { net.send(C2S.LEAVE); if (this._pending) this._startCPU(this._pending.cards); },
          }, 'CPUと対戦する'),
          el('button', { onclick: () => { net.send(C2S.LEAVE); this._renderLobby(); } }, 'キャンセル'),
        ),
      ),
    );
  }

  // ---------- 対戦開始 ----------
  _onStart(p) {
    this.seed = p.seed || 1;
    this.oppProfile = p.opponentProfile || null;
    const r = this._pending || this._resolveSelectedDeck();
    if (!r) return;
    this.vsCPU = false; this.cpu = null;
    this._beginGame(r.cards, this.seed);
  }

  _startCPU(cards) {
    this.vsCPU = true;
    this.cpu = createCPU();
    this.oppProfile = null;
    this.seed = Math.floor(Math.random() * 2 ** 31);
    this._beginGame(cards, this.seed);
  }

  _beginGame(cards, seed) {
    this.myCards = cards;
    this.cardPreview = null;
    this.glowCardId = null;
    this.enlargedCard = null;
    this.engine = createGame({ myCards: cards, seed, onChange: () => this._renderGame() });
    this._renderGame();
  }

  _dispatch(outbox) {
    for (const msg of outbox) {
      if (this.vsCPU) {
        const replies = this.cpu.handle(msg);
        for (const rep of replies) setTimeout(() => this.engine && this.engine.remote(rep), 600);
      } else {
        net.send(C2S.GAME_ACTION, msg);
      }
    }
  }

  _ready()    { this.enlargedCard = null; this._dispatch(this.engine.localReady()); }
  _commit(id) {
    this.glowCardId = id;
    this.cardPreview = null;
    this.enlargedCard = null;
    this._renderGame();
    setTimeout(() => {
      this.glowCardId = null;
      this._dispatch(this.engine.localCommit(id));
    }, 950);
  }
  _vote(r)    { this._dispatch(this.engine.localVote(r)); }
  _next()     { this.enlargedCard = null; this.engine.localNext(); }
  _rematch()  { this._dispatch(this.engine.localRematch()); }

  // ---------- カード描画ヘルパー ----------
  _fullCard(idOrCard) {
    if (typeof idOrCard === 'object' && idOrCard) {
      return this.myCards.find((c) => c.id === idOrCard.id) || idOrCard;
    }
    return this.myCards.find((c) => c.id === idOrCard) || null;
  }

  // カードのフル表示要素（card-preview スタイルを使用）
  _buildCardEl(card) {
    const artImg = el('img', { alt: '', style: 'width:100%;height:100%;object-fit:cover;display:block' });
    const art = (card && card.imageSource)
      ? el('div.pv-art', {}, artImg)
      : el('div.pv-art', {}, '画像なし');
    if (card && card.imageSource) setCardImage(artImg, card, 400);

    return el('div.card-preview', {},
      el('div.pv-cost', {}, card ? card.cost : ''),
      el('div.pv-name', {}, card ? (card.name || '') : ''),
      art,
      el('div.pv-text', {}, card ? (card.text || '') : ''),
      card && card.tags && card.tags.length
        ? el('div.pv-tags', {}, ...card.tags.map((t) => el('span.pv-tag', {}, t)))
        : null,
    );
  }

  // バトル用小カード（手札表示）
  _bcard(card, { faceDown = false, used = false, selected = false, glow = false, onClick = null } = {}) {
    if (faceDown || !card) {
      return el('div.bcard back', {}, el('div.bcard-back-mark', {}, '?'));
    }
    const full = this._fullCard(card);
    const artImg = el('img.bcard-art-img', { alt: '', draggable: 'false' });
    const art = (full && full.imageSource)
      ? el('div.bcard-art', {}, artImg)
      : el('div.bcard-art empty', {}, '画像なし');
    if (full && full.imageSource) setCardImage(artImg, full, 200);

    let cls = 'bcard';
    if (used)              cls += ' used';
    if (selected)          cls += ' selected';
    if (glow)              cls += ' glow-red';
    if (onClick && !used)  cls += ' clickable';

    return el(`div.${cls}`, { onclick: (used || !onClick) ? null : onClick },
      el('div.bcard-cost', {}, card.cost),
      el('div.bcard-name-top', {}, card.name || ''),
      art,
      el('div.bcard-text', {}, (full && full.text) || card.text || ''),
    );
  }

  _oppName() {
    if (this.vsCPU) return 'CPU';
    return (this.oppProfile && this.oppProfile.name) ? this.oppProfile.name : '相手';
  }

  _scoreboard(s) {
    const profile = store.getProfile();
    const myName = profile.name || 'あなた';
    const oppName = this._oppName();

    const makeIcon = (iconSrc) => iconSrc
      ? el('img', { src: iconSrc, alt: '', style: 'width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;vertical-align:middle' })
      : null;

    const myIcon = makeIcon(profile.icon);
    const oppIconSrc = (!this.vsCPU && this.oppProfile) ? this.oppProfile.icon : null;
    const oppIcon = makeIcon(oppIconSrc);

    return el('div.scoreboard', {},
      el('div.sb-side', {},
        el('div', { style: 'display:flex;align-items:center;gap:5px' }, myIcon, el('span.sb-label', {}, myName)),
        el('span.sb-pts', {}, s.me.points),
      ),
      el('div.sb-center', {},
        el('div', {}, `フェーズ ${s.phase} / ${TOTAL_PHASES}`),
        el('div', {}, `ターン ${s.turn + 1}`),
      ),
      el('div.sb-side opp', {},
        el('div', { style: 'display:flex;align-items:center;justify-content:flex-end;gap:5px' }, el('span.sb-label', {}, oppName), oppIcon),
        el('span.sb-pts', {}, s.opp.points),
      ),
    );
  }

  // ---------- 対戦画面ルーター ----------
  _renderGame() {
    if (!this.engine) return;
    const s = this.engine.state;

    const confirmOverlay = this.cardPreview ? this._viewCardConfirm(this.cardPreview) : null;
    const enlargedOverlay = this.enlargedCard ? this._enlargedCardOverlay(this.enlargedCard.card, this.enlargedCard.label) : null;

    let main;
    if (s.status === 'prep')          main = this._viewPrep(s);
    else if (s.status === 'select' || s.status === 'reveal' || s.status === 'resolved')
                                       main = this._viewSelect(s);
    else if (s.status === 'gameover') main = this._viewGameOver(s);

    // 準備フェーズ中はスコアボードを非表示
    const showScoreboard = s.status !== 'prep';

    this.body.replaceChildren(
      el('section.game', {},
        showScoreboard ? this._scoreboard(s) : null,
        main,
        s.status !== 'gameover' ? this._renderStampOverlay() : null,
      ),
      confirmOverlay,
      enlargedOverlay,
    );
  }

  // ---------- 準備フェーズ ----------
  _viewPrep(s) {
    const allDecks = store.getDecks();
    const readyDecks = allDecks.filter((d) => isDeckComplete(store.resolveDeck(d)));
    const deckSel = el('select', {
      onchange: (e) => {
        const did = e.target.value;
        if (!did) return;
        const r = this._resolveSelectedDeck(did);
        if (r) {
          this.myCards = r.cards;
          this.engine.resetCards(r.cards);
          if (did === 'random') this.randDeck = r.cards;
        }
      },
    },
      el('option', { value: '' }, '（変更する場合は選択）'),
      ...readyDecks.map((d) => el('option', { value: d.id }, d.name)),
      el('option', { value: 'random' }, '🎲 ランダムデッキ'),
    );

    const hand = el('div.hand', {},
      ...s.me.battlefield.map((c) => this._bcard(this._fullCard(c))),
    );

    // 相手の状態表示（カードは表示しない）
    const oppReadyCls = s.opp.ready ? 'opp-ready-status ready' : 'opp-ready-status waiting';
    const oppReadyText = s.opp.ready
      ? `${this._oppName()} — 準備完了！`
      : `${this._oppName()} — 準備中…`;

    return el('div.phase-prep', {},
      el('h3.prep-title', {}, '準備タイム'),
      el('div.prep-deck-select', {},
        el('label', {}, 'デッキ変更:'),
        deckSel,
      ),
      el(`div.${oppReadyCls}`, {}, oppReadyText),
      el('div.zone', { style: 'flex:1;min-height:0;display:flex;flex-direction:column' },
        el('span.zone-label', {}, 'あなたの手札'),
        hand,
      ),
      el('div.phase-actions', {},
        s.me.ready
          ? el('span.waiting-note', {}, `${this._oppName()}の準備を待っています…`)
          : el('button.primary', { onclick: () => this._ready() }, '準備完了'),
      ),
    );
  }

  // ---------- 選択〜判定フェーズ（統合） ----------
  _viewSelect(s) {
    const committed = s.me.committed;
    const status = s.status;

    // 自分の手札
    const hand = el('div.hand', {},
      ...s.me.battlefield.map((c) => {
        const full = this._fullCard(c);
        const isCommitted = committed && committed.id === c.id;
        const isGlow = this.glowCardId === c.id;
        const canClick = !c.used && !committed && status === 'select';
        return this._bcard(full || c, {
          used: c.used,
          selected: isCommitted,
          glow: isGlow,
          onClick: canClick ? () => { this.cardPreview = full || c; this._renderGame(); } : null,
        });
      }),
    );

    // 相手の表示（使用済み: 表向き・タップで拡大 / 未使用: 裏向き）
    const oppUsed = s.opp.usedCards.map((c) => this._bcard(c, {
      onClick: () => { this.enlargedCard = { card: c, label: `${this._oppName()}のカード（使用済み）` }; this._renderGame(); },
    }));
    const oppFaceDown = Array.from({ length: s.opp.faceDownCount }, () => this._bcard(null, { faceDown: true }));
    const oppRow = el('div.hand opp-hand', {}, ...oppUsed, ...oppFaceDown);

    const themeBanner = status !== 'prep' ? this._themeBanner(s) : null;

    // reveal / resolved 時の中央比較表示
    let centerArea = null;
    if (status === 'reveal' || status === 'resolved') {
      centerArea = this._revealCenter(s);
    }

    let actionArea = null;
    if (status === 'select') {
      actionArea = committed
        ? el('p.waiting-note', {}, `${this._oppName()}の選択を待っています…`)
        : el('p.hint', {}, 'カードをタップして選んでください。');
    } else if (status === 'reveal') {
      actionArea = s.me.vote
        ? el('p.waiting-note', {}, `${this._oppName()}の判定を待っています…`)
        : el('div.vote-buttons', {},
            el('button.primary', { onclick: () => this._vote('win') }, 'あなたの勝ち'),
            el('button', { onclick: () => this._vote('draw') }, '引き分け'),
            el('button.danger', { onclick: () => this._vote('lose') }, 'あなたの負け'),
          );
    } else if (status === 'resolved') {
      const r = s.lastResult;
      const msg = r.mismatch
        ? '引き分け（判定不一致のため自動解決）'
        : r.outcome === 'me' ? `あなたの勝ち！ +${r.gained}pt`
        : r.outcome === 'opp' ? `${this._oppName()}の勝ち（+${r.gained}pt）`
        : '引き分け';
      actionArea = el('div', {},
        el('p.result-msg', {}, msg),
        el('div.actions', { style: 'justify-content:center' },
          el('button.primary', { onclick: () => this._next() }, '次へ'),
        ),
      );
    }

    return el('div.phase-select', {},
      themeBanner,
      el('div.zone', {}, el('span.zone-label', {}, `${this._oppName()}`), oppRow),
      centerArea,
      el('div.zone', {}, el('span.zone-label', {}, 'あなたの手札（タップで確認）'), hand),
      actionArea ? el('div.phase-actions', {}, actionArea) : null,
    );
  }

  // reveal 後の2枚比較エリア（タップで拡大可）
  _revealCenter(s) {
    const myFull = s.me.committed ? this._fullCard(s.me.committed) : null;
    const oppCard = s.opp.committed;

    const myCardEl = myFull
      ? this._buildRevealCard(myFull, () => { this.enlargedCard = { card: myFull, label: 'あなたのカード' }; this._renderGame(); })
      : el('p.waiting-note', {}, '（待機中）');

    const oppCardEl = oppCard
      ? this._buildRevealCard(oppCard, () => { this.enlargedCard = { card: oppCard, label: `${this._oppName()}のカード` }; this._renderGame(); })
      : el('div.bcard back', {}, el('div.bcard-back-mark', {}, '?'));

    return el('div.reveal-center', {},
      el('div.reveal-side', {},
        el('div.reveal-side-label', {}, 'あなた'),
        myCardEl,
      ),
      el('div.reveal-vs', {}, 'VS'),
      el('div.reveal-side', {},
        el('div.reveal-side-label', {}, this._oppName()),
        oppCardEl,
      ),
    );
  }

  _buildRevealCard(card, onClick) {
    const artImg = el('img', { alt: '', style: 'width:100%;height:100%;object-fit:cover;display:block' });
    const art = card.imageSource
      ? el('div.pv-art', {}, artImg)
      : el('div.pv-art', {}, '画像なし');
    if (card.imageSource) setCardImage(artImg, card, 400);

    return el('div.reveal-card clickable', { onclick: onClick },
      el('div.pv-cost', {}, card.cost),
      el('div.pv-name', {}, card.name || ''),
      art,
      el('div.pv-text', {}, card.text || ''),
      card.tags && card.tags.length
        ? el('div.pv-tags', {}, ...card.tags.map((t) => el('span.pv-tag', {}, t)))
        : null,
    );
  }

  // カード確認オーバーレイ（フルカード表示 + 固定底ボタン）
  _viewCardConfirm(card) {
    return el('div.card-confirm-overlay', {
      onclick: (e) => {
        const t = e.target;
        if (t.classList.contains('card-confirm-overlay') || t.classList.contains('card-confirm-inner') || t.classList.contains('card-confirm-scroll')) {
          this.cardPreview = null; this._renderGame();
        }
      },
    },
      el('div.card-confirm-inner', {},
        el('div.card-confirm-scroll', {}, this._buildCardEl(card)),
        el('div.card-confirm-btns', {},
          el('button.primary', { onclick: () => this._commit(card.id) }, '✓ このカードで決定'),
          el('button', { onclick: () => { this.cardPreview = null; this._renderGame(); } }, 'キャンセル'),
        ),
      ),
    );
  }

  // 拡大表示オーバーレイ（相手カード等をタップして確認）
  _enlargedCardOverlay(card, label) {
    const artImg = el('img.pv-art-img', { alt: '', draggable: 'false' });
    const art = card.imageSource
      ? el('div.pv-art', {}, artImg)
      : el('div.pv-art', {}, '画像なし');
    if (card.imageSource) setCardImage(artImg, card, 600);

    const cardEl = el('div.card-modal-card', {},
      el('div.pv-cost', {}, card.cost),
      el('div.pv-name', {}, card.name || ''),
      art,
      el('div.pv-text', {}, card.text || ''),
      card.tags && card.tags.length
        ? el('div.pv-tags', {}, ...card.tags.map((t) => el('span.pv-tag', {}, t)))
        : null,
    );

    return el('div.card-modal-overlay', {
      onclick: (e) => { if (e.target === e.currentTarget) { this.enlargedCard = null; this._renderGame(); } },
    },
      el('div.card-modal-inner', {},
        label ? el('div', { style: 'color:#fff;text-align:center;font-size:.82rem;margin-bottom:6px' }, label) : null,
        el('button.card-modal-close', { onclick: () => { this.enlargedCard = null; this._renderGame(); } }, '✕'),
        cardEl,
      ),
    );
  }

  _themeBanner(s) {
    return el('div.theme-banner', {},
      el('span.theme-label', {}, 'お題'),
      el('span.theme-word', {}, s.theme),
      el('span.turn-no', {}, `${s.phase}-${s.turn + 1}`),
    );
  }

  // ---------- ゲームオーバー ----------
  _viewGameOver(s) {
    const msg = s.winner === 'me' ? 'あなたの勝ち！' : s.winner === 'opp' ? `${this._oppName()}の勝ち` : '引き分け';
    return el('div.phase-over', {},
      el('h2.result-msg', {}, msg),
      el('p', {}, `最終スコア — あなた ${s.me.points} / ${this._oppName()} ${s.opp.points}`),
      s.rematch.me ? el('p.waiting-note', {}, `${this._oppName()}の再戦待ち…`) : null,
      el('div.actions', {},
        el('button.primary', { onclick: () => this._rematch() }, '再戦'),
        el('button.danger', { onclick: () => this._exit() }, '対戦を終了'),
      ),
    );
  }

  _exit() {
    if (this.cpu) this.cpu.reset();
    if (!this.vsCPU && net.state === NET_STATE.CONNECTED) net.send(C2S.LEAVE);
    this.app.navigate('/home');
  }

  // ---------- スタンプ ----------
  _renderStampOverlay() {
    const recvData = STAMPS.find((s) => s.id === this.receivedStamp);
    const sentData = STAMPS.find((s) => s.id === this.sentStamp);

    return el('div.stamp-area', {},
      recvData ? el('div.stamp-popup stamp-opp', {},
        el('span.stamp-emoji', {}, recvData.emoji),
        el('span.stamp-label', {}, recvData.label),
      ) : null,
      sentData ? el('div.stamp-popup stamp-me', {},
        el('span.stamp-emoji', {}, sentData.emoji),
        el('span.stamp-label', {}, sentData.label),
      ) : null,
      el('button.stamp-btn', {
        onclick: (e) => {
          e.stopPropagation();
          this.showStampPicker = !this.showStampPicker;
          this._renderGame();
        },
      }, '💬'),
      this.showStampPicker ? el('div.stamp-picker', {},
        ...STAMPS.map((item) => el('button.stamp-choice', {
          onclick: () => this._sendStamp(item.id),
          title: item.label,
        },
          el('span.stamp-emoji-sm', {}, item.emoji),
          el('span.stamp-choice-label', {}, item.label),
        )),
      ) : null,
    );
  }

  _sendStamp(id) {
    this.showStampPicker = false;
    if (this._sentStampTimer) clearTimeout(this._sentStampTimer);
    this.sentStamp = id;
    if (!this.vsCPU) net.send(C2S.STAMP, { stamp: id });
    this._renderGame();
    this._sentStampTimer = setTimeout(() => { this.sentStamp = null; this._renderGame(); }, 2500);
  }

  _onReceiveStamp({ stamp }) {
    if (this._receivedStampTimer) clearTimeout(this._receivedStampTimer);
    this.receivedStamp = stamp;
    this._renderGame();
    this._receivedStampTimer = setTimeout(() => { this.receivedStamp = null; this._renderGame(); }, 2500);
  }
}
