// ============================================================
// server/wsserver.js
// 依存パッケージなしの最小 WebSocket サーバー。
// Node 標準の http / crypto だけで RFC 6455 のハンドシェイクと
// フレームの送受信を実装しています。
//
// 後で本格的にしたくなったら、npm の `ws` パッケージへ
// 差し替え可能なように、最小限の API（on('connection'), conn.send, conn.close,
// conn.on('message'/'close')）だけを公開しています。
// ============================================================

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const OP = { CONT: 0x0, TEXT: 0x1, BIN: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xa };

// 1 本の WebSocket 接続を表すクラス
class Connection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];       // 分割フレームの一時保管
    this.fragmentOp = null;
    this.closed = false;

    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => this._onClose());
    socket.on('error', () => this._onClose());
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // バッファから取り出せるだけフレームを処理する
    while (this._parseFrame()) { /* loop */ }
  }

  // 1 フレーム取り出せたら true、データ不足なら false
  _parseFrame() {
    const buf = this.buffer;
    if (buf.length < 2) return false;

    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let offset = 2;

    if (len === 126) {
      if (buf.length < offset + 2) return false;
      len = buf.readUInt16BE(offset);
      offset += 2;
    } else if (len === 127) {
      if (buf.length < offset + 8) return false;
      // 4GB 超は想定しないので下位 32bit のみ採用
      len = Number(buf.readBigUInt64BE(offset));
      offset += 8;
    }

    let maskKey;
    if (masked) {
      if (buf.length < offset + 4) return false;
      maskKey = buf.slice(offset, offset + 4);
      offset += 4;
    }

    if (buf.length < offset + len) return false; // ペイロード未着

    let payload = buf.slice(offset, offset + len);
    if (masked) {
      const out = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) out[i] = payload[i] ^ maskKey[i & 3];
      payload = out;
    }

    // 消費したぶんをバッファから取り除く
    this.buffer = buf.slice(offset + len);

    this._handleFrame(fin, opcode, payload);
    return true;
  }

  _handleFrame(fin, opcode, payload) {
    switch (opcode) {
      case OP.PING:
        this._sendFrame(OP.PONG, payload);
        break;
      case OP.PONG:
        break;
      case OP.CLOSE:
        this.close();
        break;
      case OP.TEXT:
      case OP.BIN:
      case OP.CONT: {
        if (opcode !== OP.CONT) this.fragmentOp = opcode;
        this.fragments.push(payload);
        if (fin) {
          const full = Buffer.concat(this.fragments);
          this.fragments = [];
          const op = this.fragmentOp;
          this.fragmentOp = null;
          if (op === OP.TEXT) this.emit('message', full.toString('utf8'));
          // バイナリは今回未使用
        }
        break;
      }
      default:
        this.close();
    }
  }

  _sendFrame(opcode, payload) {
    if (this.closed) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
      header = Buffer.allocUnsafe(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.allocUnsafe(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    try {
      this.socket.write(Buffer.concat([header, payload]));
    } catch { /* 切断済みなら無視 */ }
  }

  // 文字列メッセージ送信（通常はここに JSON 文字列を渡す）
  send(str) {
    this._sendFrame(OP.TEXT, Buffer.from(str, 'utf8'));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this._sendFrame(OP.CLOSE, Buffer.alloc(0));
      this.socket.end();
    } catch { /* noop */ }
  }

  _onClose() {
    if (this.closed) return;
    this.closed = true;
    this.emit('close');
  }
}

// http.Server にぶら下がる WebSocket サーバー本体
export class WSServer extends EventEmitter {
  constructor(httpServer) {
    super();
    httpServer.on('upgrade', (req, socket) => this._onUpgrade(req, socket));
  }

  _onUpgrade(req, socket) {
    const key = req.headers['sec-websocket-key'];
    if (req.headers['upgrade']?.toLowerCase() !== 'websocket' || !key) {
      socket.destroy();
      return;
    }
    const accept = crypto
      .createHash('sha1')
      .update(key + GUID)
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    const conn = new Connection(socket);
    this.emit('connection', conn, req);
  }
}
