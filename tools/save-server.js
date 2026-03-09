/**
 * save-server.js — Egypt Journal 本地开发服务器
 * 静态文件服务 + POST /em-save 写文件端点
 * 运行：node tools/save-server.js
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.resolve(__dirname, '..');   // 项目根目录

const MIME = {
  '.html'  : 'text/html; charset=utf-8',
  '.css'   : 'text/css',
  '.js'    : 'application/javascript',
  '.json'  : 'application/json',
  '.png'   : 'image/png',
  '.jpg'   : 'image/jpeg',
  '.jpeg'  : 'image/jpeg',
  '.gif'   : 'image/gif',
  '.svg'   : 'image/svg+xml',
  '.ico'   : 'image/x-icon',
  '.woff'  : 'font/woff',
  '.woff2' : 'font/woff2',
  '.ttf'   : 'font/ttf',
  '.mp4'   : 'video/mp4',
  '.webm'  : 'video/webm',
};

const server = http.createServer((req, res) => {
  // ── CORS（仅允许 localhost）──────────────────────────────────────
  const origin = req.headers.origin || '';
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── POST /em-save — 写文件 ───────────────────────────────────────
  if (req.method === 'POST' && req.url === '/em-save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filePath, html } = JSON.parse(body);

        // 安全检查：确保路径在项目根目录内
        const safePath   = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
        const fullPath   = path.resolve(ROOT, safePath);
        if (!fullPath.startsWith(ROOT + path.sep) && fullPath !== ROOT) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Path traversal denied' }));
          return;
        }

        fs.writeFile(fullPath, html, 'utf8', err => {
          if (err) {
            console.error('[em-save] Error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          } else {
            console.log('[em-save] Wrote:', safePath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── GET — 静态文件服务 ───────────────────────────────────────────
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = path.join(ROOT, urlPath);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// 只监听本机，外部无法访问写文件端点
server.listen(PORT, '127.0.0.1', () => {
  console.log('\n  🏺  Egypt Journal  →  http://localhost:' + PORT + '\n');
});
