// ============================================================
// game.js  —  バトルの進行ロジック（DOM 非依存・テスト可能）
//
// ルール:
//  準備(prep): デッキ9枚(コスト1/2/3を各3枚)を手札に置く。相手は裏向き。
//  ターン:
//   ② お題(テーマ)がランダム発表 → 手札から未使用の1枚を選ぶ(commit)
//   ③ 両者選び終えると相手のカードも表になる(reveal)
//   ④ どちらが適しているか互いに評価。勝ち/負け/引き分けを両者が押し、
//      判定が一致したら、勝った側が「自分の出したカードのコスト」を得点。
//   ⑤ 出した2枚は「使用済み」になるが手元に残り、相手からも見える状態に。
//      ※墓地の概念なし。使用済みカードは薄暗く表示され選択不可。
//   ⑥ 全カード使用済みになるまで繰り返す → ⑦フェーズ終了
//  ⑧ フェーズ2を同様に実施 → ⑨⑩ 得点が多い方の勝ち
// ============================================================

export const THEMES = [
  // もとのテーマ
  '強そう', 'かわいい', 'かっこいい', '速そう', '賢そう', '面白い', '美しい',
  '怖い', '頼れる', '珍しい', '優しそう', '派手', 'シンプル', 'クール',
  '元気', '神秘的', '危険', '癒やし系', '最強感', 'レア感',
  // 追加テーマ（自然・場所）
  '深海の主', '大空の王者', '大地の守護', '炎の申し子', '氷の化身',
  '嵐を呼ぶ者', '砂漠の覇者', '森の番人', '山の頂点', '星の使者',
  // 追加テーマ（キャラクター系）
  '最強戦士', '天才魔法使い', '謎の刺客', '慈悲の天使', '邪悪な悪魔',
  '伝説の勇者', '王者の貫禄', '最新メカ', '大ドラゴン', '気まぐれ精霊',
  '孤独な英雄', '道化師', '吟遊詩人', '錬金術師', '占い師',
  // 追加テーマ（感情・概念）
  '勇気の象徴', '友情パワー', '裏切り者', '希望の光', '絶望の淵',
  '怒りの化身', '平和の使者', '混沌の申し子', '救世主', '反逆者',
  '笑いの王', '涙の物語', '誇り高き', '謙虚な', '慈しみ深い',
  // 追加テーマ（世界観）
  '古代文明', '未来都市', '異世界', '夢の中', '現実逃避',
  '時を操る者', '次元の狭間', '天空の城', '地底の王国', '海底神殿',
  // 追加テーマ（能力・特性）
  '知恵の王', '力の象徴', '敏捷の極み', '耐久力抜群', '謎めいた力',
  '希少価値', '最終兵器', '隠れた才能', '覚醒したばかり', '絶対防御',
  // 追加テーマ（状況）
  '土壇場の逆転', '圧倒的劣勢', '余裕綽々', '全力全開', '温存中',
  '頂上決戦', '奇跡の一手', '伝家の宝刀', '切り札', '奥の手',
];

export const TOTAL_PHASES = 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame({ myCards, seed = 1, onChange = () => {} } = {}) {
  const deck = (myCards || []).map((c) => ({
    id: c.id, name: c.name, cost: c.cost,
    imageSource: c.imageSource || '', imageTransform: c.imageTransform,
    tags: c.tags || [], text: c.text || '',
  }));
  let rematchCount = 0;

  const state = {
    phase: 1, turn: 0, totalPhases: TOTAL_PHASES,
    status: 'prep', theme: '',
    me: {
      battlefield: [],    // 全カード（used: bool フラグつき）
      points: 0, ready: false, committed: null, vote: null,
    },
    opp: {
      faceDownCount: 0,   // 伏せ札（未使用）の枚数
      usedCards: [],       // 使用済み（表向きで双方から見える）
      points: 0, ready: false, committed: null, vote: null,
    },
    mismatch: false, lastResult: null,
    rematch: { me: false, opp: false }, winner: null,
  };

  const emit = () => onChange(state);

  function themeFor(phase, turn) {
    const s = (seed ^ (phase * 73856093) ^ (turn * 19349663) ^ (rematchCount * 83492791)) >>> 0;
    return THEMES[Math.floor(mulberry32(s)() * THEMES.length)];
  }

  function startPhase(phase) {
    state.phase = phase; state.turn = 0;
    state.me.battlefield = deck.map((c) => ({ ...c, used: false }));
    state.me.ready = false; state.me.committed = null; state.me.vote = null;
    state.opp.faceDownCount = state.me.battlefield.length;
    state.opp.usedCards = [];
    state.opp.ready = false; state.opp.committed = null; state.opp.vote = null;
    state.mismatch = false; state.lastResult = null;
    state.status = 'prep';
  }

  function startTurn() {
    state.theme = themeFor(state.phase, state.turn);
    state.me.committed = null; state.me.vote = null;
    state.opp.committed = null; state.opp.vote = null;
    state.mismatch = false; state.lastResult = null;
    state.status = 'select';
  }

  function maybeStartTurns() {
    if (state.status === 'prep' && state.me.ready && state.opp.ready) startTurn();
  }

  function maybeReveal() {
    if (state.status === 'select' && state.me.committed && state.opp.committed) {
      state.status = 'reveal';
    }
  }

  function resolveCards(outcome, gained, mismatch) {
    state.lastResult = {
      outcome, gained, mismatch: !!mismatch,
      myCard: state.me.committed, oppCard: state.opp.committed, theme: state.theme,
    };
    const usedCard = state.me.battlefield.find((c) => c.id === state.me.committed.id);
    if (usedCard) usedCard.used = true;
    state.opp.usedCards.push({ ...state.opp.committed });
    state.opp.faceDownCount = Math.max(0, state.opp.faceDownCount - 1);
    state.me.committed = null; state.opp.committed = null;
    state.me.vote = null; state.opp.vote = null;
    state.mismatch = false;
    state.status = 'resolved';
  }

  function maybeResolve() {
    if (state.status !== 'reveal' || !state.me.vote || !state.opp.vote) return;
    const mv = state.me.vote, ov = state.opp.vote;
    const consistent =
      (mv === 'win' && ov === 'lose') ||
      (mv === 'lose' && ov === 'win') ||
      (mv === 'draw' && ov === 'draw');
    if (!consistent) {
      // 判定不一致 → 自動で引き分け扱いにして次へ
      resolveCards('draw', 0, true);
      return;
    }
    let outcome = 'draw', gained = 0;
    if (mv === 'win') { outcome = 'me'; gained = state.me.committed.cost; state.me.points += gained; }
    else if (mv === 'lose') { outcome = 'opp'; gained = state.opp.committed.cost; state.opp.points += gained; }
    resolveCards(outcome, gained, false);
  }

  function gameOver() {
    state.status = 'gameover';
    state.winner = state.me.points > state.opp.points ? 'me'
      : state.me.points < state.opp.points ? 'opp' : 'draw';
  }

  function resetGame() {
    rematchCount += 1;
    state.me.points = 0; state.opp.points = 0;
    state.rematch = { me: false, opp: false };
    state.winner = null;
    startPhase(1);
  }

  startPhase(1);

  return {
    state,
    getState: () => state,

    // 準備フェーズ中にデッキを差し替える（まだ ready を押す前のみ有効）
    resetCards(newCards) {
      if (state.status !== 'prep' || state.me.ready) return;
      deck.splice(0, deck.length, ...newCards.map((c) => ({
        id: c.id, name: c.name, cost: c.cost,
        imageSource: c.imageSource || '', imageTransform: c.imageTransform,
        tags: c.tags || [], text: c.text || '',
      })));
      state.me.battlefield = deck.map((c) => ({ ...c, used: false }));
      state.opp.faceDownCount = state.me.battlefield.length;
      emit();
    },

    localReady() {
      if (state.status !== 'prep' || state.me.ready) return [];
      state.me.ready = true; maybeStartTurns(); emit();
      return [{ kind: 'ready' }];
    },
    localCommit(cardId) {
      if (state.status !== 'select' || state.me.committed) return [];
      const card = state.me.battlefield.find((c) => c.id === cardId && !c.used);
      if (!card) return [];
      state.me.committed = card; maybeReveal(); emit();
      return [{ kind: 'commit', card: { id: card.id, name: card.name, cost: card.cost, imageSource: card.imageSource, imageTransform: card.imageTransform, text: card.text || '' } }];
    },
    localVote(result) {
      if (state.status !== 'reveal' || state.me.vote) return [];
      state.me.vote = result; maybeResolve(); emit();
      return [{ kind: 'vote', result }];
    },
    localNext() {
      if (state.status !== 'resolved') return [];
      state.turn += 1;
      if (state.me.battlefield.every((c) => c.used)) {
        if (state.phase < state.totalPhases) startPhase(state.phase + 1);
        else gameOver();
      } else startTurn();
      emit();
      return [];
    },
    localRematch() {
      if (state.status !== 'gameover' || state.rematch.me) return [];
      state.rematch.me = true;
      if (state.rematch.me && state.rematch.opp) resetGame();
      emit();
      return [{ kind: 'rematch' }];
    },

    remote(msg) {
      if (!msg || !msg.kind) return [];
      switch (msg.kind) {
        case 'ready':   state.opp.ready = true; maybeStartTurns(); break;
        case 'commit':  state.opp.committed = msg.card; maybeReveal(); break;
        case 'vote':    state.opp.vote = msg.result; maybeResolve(); break;
        case 'rematch':
          state.rematch.opp = true;
          if (state.rematch.me && state.rematch.opp) resetGame();
          break;
        default: break;
      }
      emit();
      return [];
    },
  };
}
