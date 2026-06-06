// ============================================================
// server/lobby.js
// パスワード部屋によるマッチングと、対戦操作の中継。
// （ランダムマッチは廃止。CPU 対戦はクライアント側だけで完結するため
//  サーバーは関与しません）
//
// 勝敗判定やカード効果などのルール本体は、あとで _handleAction() の
// あたりに足していく想定です。
// ============================================================

import { C2S, S2C } from '../public/js/protocol.js';

let nextPlayerId = 1;
let nextRoomSeq = 1;

export class Lobby {
  constructor() {
    this.players = new Map();   // playerId -> { id, conn, deck, roomId }
    this.rooms = new Map();     // password -> { id, password, players:[playerId] }
  }

  addPlayer(conn) {
    const id = `p${nextPlayerId++}`;
    const player = { id, conn, deck: null, roomId: null };
    this.players.set(id, player);

    conn.on('message', (raw) => this._onMessage(player, raw));
    conn.on('close', () => this._onClose(player));

    this._send(player, S2C.WELCOME, { playerId: id });
    return id;
  }

  _onMessage(player, raw) {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { return this._send(player, S2C.ERROR, { message: '不正なメッセージ形式です' }); }
    const { type, payload = {} } = msg || {};

    switch (type) {
      case C2S.CREATE_ROOM: return this._createRoom(player, payload);
      case C2S.JOIN_ROOM:   return this._joinRoom(player, payload);
      case C2S.GAME_ACTION: return this._handleAction(player, payload);
      case C2S.STAMP:       return this._handleStamp(player, payload);
      case C2S.LEAVE:       return this._leave(player);
      default:
        this._send(player, S2C.ERROR, { message: `未知のメッセージ種別: ${type}` });
    }
  }

  // --- パスワード部屋を作成 ---------------------------------
  _createRoom(player, { deck, password, profile }) {
    const pw = String(password || '').trim();
    if (!pw) return this._send(player, S2C.ERROR, { message: 'パスワードを入力してください' });
    if (this.rooms.has(pw)) {
      return this._send(player, S2C.ERROR, { message: 'そのパスワードの部屋は既にあります' });
    }
    player.deck = deck || null;
    player.profile = profile || null;
    const room = { id: `room${nextRoomSeq++}`, password: pw, players: [player.id] };
    this.rooms.set(pw, room);
    player.roomId = pw;
    this._send(player, S2C.ROOM_CREATED, { password: pw });
    this._send(player, S2C.WAITING, { password: pw });
  }

  // --- パスワード部屋へ参加 ---------------------------------
  _joinRoom(player, { deck, password, profile }) {
    const pw = String(password || '').trim();
    const room = this.rooms.get(pw);
    if (!room) return this._send(player, S2C.ERROR, { message: '部屋が見つかりません（パスワード違い）' });
    if (room.players.length >= 2) {
      return this._send(player, S2C.ERROR, { message: 'その部屋は満員です' });
    }
    player.deck = deck || null;
    player.profile = profile || null;
    const opponent = this.players.get(room.players[0]);
    room.players.push(player.id);
    player.roomId = pw;
    this._startMatch(room, player, opponent);
  }

  // --- 対戦開始 ---------------------------------------------
  _startMatch(room, a, b) {
    const seed = Math.floor(Math.random() * 2 ** 31);   // 双方が同じ乱数で初期化できる共有シード
    const firstId = Math.random() < 0.5 ? a.id : b.id;  // 先攻をランダム決定

    this._send(a, S2C.GAME_START, {
      roomId: room.id, seed, you: a.id, opponent: b.id,
      first: firstId === a.id, opponentDeck: b.deck,
      opponentProfile: b.profile || null,
    });
    this._send(b, S2C.GAME_START, {
      roomId: room.id, seed, you: b.id, opponent: a.id,
      first: firstId === b.id, opponentDeck: a.deck,
      opponentProfile: a.profile || null,
    });
  }

  // --- 対戦中の操作中継 -------------------------------------
  // いまは相手へそのまま転送するだけ。サーバーでルール検証したく
  // なったら、ここで盤面状態を持って判定する形に発展させます。
  _handleAction(player, payload) {
    const room = player.roomId && this.rooms.get(player.roomId);
    if (!room) return;
    for (const pid of room.players) {
      if (pid === player.id) continue;
      const opp = this.players.get(pid);
      if (opp) this._send(opp, S2C.GAME_ACTION, { from: player.id, ...payload });
    }
  }

  // --- スタンプ中継 -----------------------------------------
  _handleStamp(player, payload) {
    const room = player.roomId && this.rooms.get(player.roomId);
    if (!room) return;
    for (const pid of room.players) {
      if (pid === player.id) continue;
      const opp = this.players.get(pid);
      if (opp) this._send(opp, S2C.STAMP, { stamp: payload.stamp });
    }
  }

  // --- 離脱・切断 -------------------------------------------
  _leave(player) {
    const room = player.roomId && this.rooms.get(player.roomId);
    if (room) {
      for (const pid of room.players) {
        if (pid === player.id) continue;
        const opp = this.players.get(pid);
        if (opp) { this._send(opp, S2C.OPPONENT_LEFT, {}); opp.roomId = null; }
      }
      this.rooms.delete(room.password);
    }
    player.roomId = null;
  }

  _onClose(player) {
    this._leave(player);
    this.players.delete(player.id);
  }

  _send(player, type, payload) {
    try { player.conn.send(JSON.stringify({ type, payload })); }
    catch { /* 切断済みは無視 */ }
  }
}
