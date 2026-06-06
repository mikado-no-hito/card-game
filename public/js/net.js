// ============================================================
// net.js
// WebSocket クライアントの薄いラッパ。
//   net.connect()                接続
//   net.send(type, payload)      送信
//   net.on(type, handler)        種別ごとに受信ハンドラを登録
//   net.onState(handler)         接続状態の変化を購読
// ============================================================

import { NET_STATE } from './protocol.js';

class Net {
  constructor() {
    this.ws = null;
    this.state = NET_STATE.DISCONNECTED;
    this.handlers = new Map();   // type -> Set<fn>
    this.stateHandlers = new Set();
    this.playerId = null;
  }

  connect() {
    if (this.ws && (this.state === NET_STATE.CONNECTED || this.state === NET_STATE.CONNECTING)) {
      return;
    }
    this._setState(NET_STATE.CONNECTING);
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}`);

    this.ws.addEventListener('open', () => this._setState(NET_STATE.CONNECTED));
    this.ws.addEventListener('close', () => this._setState(NET_STATE.DISCONNECTED));
    this.ws.addEventListener('error', () => this._setState(NET_STATE.DISCONNECTED));
    this.ws.addEventListener('message', (ev) => this._onMessage(ev.data));
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const { type, payload } = msg || {};
    if (type === 'sys:welcome') this.playerId = payload?.playerId || null;
    const set = this.handlers.get(type);
    if (set) for (const fn of set) fn(payload || {}, msg);
  }

  send(type, payload = {}) {
    if (this.state !== NET_STATE.CONNECTED) {
      console.warn('未接続のため送信できません:', type);
      return false;
    }
    this.ws.send(JSON.stringify({ type, payload }));
    return true;
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type)?.delete(handler); // 解除関数
  }

  onState(handler) {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => this.stateHandlers.delete(handler);
  }

  _setState(s) {
    this.state = s;
    for (const fn of this.stateHandlers) fn(s);
  }

  disconnect() {
    try { this.ws?.close(); } catch { /* noop */ }
  }
}

export const net = new Net();
