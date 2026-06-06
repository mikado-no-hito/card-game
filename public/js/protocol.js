// ============================================================
// protocol.js
// クライアントとサーバーで共有するメッセージ種別の定義。
// （DOM やブラウザ専用 API を一切使わないので、サーバー側からも import できます）
//
// メッセージはすべて JSON 文字列で送受信し、形式は次の通り:
//   { "type": "<種別>", "payload": { ... } }
// ============================================================

// クライアント → サーバー
export const C2S = {
  CREATE_ROOM: 'lobby:create', // パスワード部屋を作成 { deck, password }
  JOIN_ROOM:   'lobby:join',   // パスワード部屋へ参加 { deck, password }
  LEAVE:       'lobby:leave',  // 部屋/対戦から離脱
  GAME_ACTION: 'game:action',  // 対戦中の操作を相手へ中継 { ... 自由 }
};

// サーバー → クライアント
export const S2C = {
  WELCOME:      'sys:welcome',     // 接続確立      { playerId }
  WAITING:      'lobby:waiting',   // 相手待機中    { password }
  ROOM_CREATED: 'lobby:created',   // 部屋作成完了  { password }
  GAME_START:   'game:start',      // 対戦開始      { roomId, you, opponent, seed, first, opponentDeck }
  GAME_ACTION:  'game:action',     // 相手の操作を受信 { ... 自由 }
  OPPONENT_LEFT:'game:opponentLeft',
  ERROR:        'sys:error',       // エラー通知    { message }
};

// 接続状態（クライアント側の状態管理に利用）
export const NET_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING:   'connecting',
  CONNECTED:    'connected',
};
