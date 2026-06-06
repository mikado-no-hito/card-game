// ============================================================
// server.js  —  起動エントリ
// 静的ファイル(public/)の配信 + WebSocket サーバーの起動。
// 実行:  node server.js     既定で http://localhost:3001
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WSServer } from './server/wsserver.js';
import { Lobby } from './server/lobby.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

// --- 静的ファイル配信 ---------------------------------------
const httpServer = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // ディレクトリ脱出を防ぐ
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- WebSocket / ロビー -------------------------------------
const wss = new WSServer(httpServer);
const lobby = new Lobby();

wss.on('connection', (conn) => {
  const id = lobby.addPlayer(conn);
  console.log(`[ws] connected: ${id}`);
});

httpServer.listen(PORT, () => {
  console.log(`カードゲームサーバー起動: http://localhost:${PORT}  (PORT 環境変数で変更可)`);

});
