// ============================================================
// cpu.js  —  CPU 対戦相手（クライアント内で完結。サーバー不要）
// game.js のメッセージ(kind: ready/commit/vote/rematch)に対して、
// 相手プレイヤー役として応答を返します。
//  - ready  : 戦場(9枚)を補充して ready を返す
//  - commit : 自分の手札から1枚出す（テーマ評価は人間が行う前提）
//  - vote   : プレイヤーの判定に合わせて整合する票を返す
//  - rematch: rematch を返す
// 強さや選択の賢さは think 系の関数を差し替えて実装してください。
// ============================================================

function makeCpuCards() {
  const cards = [];
  for (const cost of [1, 2, 3]) {
    for (let i = 0; i < 3; i++) {
      cards.push({ id: `cpu_${cost}_${i}`, name: `CPUカード ${cost}-${i + 1}`, cost, imageSource: '', tags: [] });
    }
  }
  return cards;
}

const inverseVote = (v) => (v === 'win' ? 'lose' : v === 'lose' ? 'win' : 'draw');

export function createCPU() {
  let battlefield = [];

  function refill() { battlefield = makeCpuCards(); }

  function pickCard() {
    if (!battlefield.length) refill();
    // いまはランダム選択（★ここを賢くすると強い CPU になる）
    const i = Math.floor(Math.random() * battlefield.length);
    return battlefield.splice(i, 1)[0];
  }

  return {
    // プレイヤーのメッセージを受け取り、CPU の応答メッセージ配列を返す
    handle(msg) {
      if (!msg || !msg.kind) return [];
      switch (msg.kind) {
        case 'ready':   refill(); return [{ kind: 'ready' }];
        case 'commit': {
          const card = pickCard();
          return [{ kind: 'commit', card: { id: card.id, name: card.name, cost: card.cost, imageSource: '' } }];
        }
        case 'vote':    return [{ kind: 'vote', result: inverseVote(msg.result) }];
        case 'rematch': return [{ kind: 'rematch' }];
        default:        return [];
      }
    },
    reset() { battlefield = []; },
  };
}
