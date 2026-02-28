/**
 * save-server.js — Egypt Journal 本地开发服务器
 * 静态文件服务 + 编辑模式 CMS 端点
 * 运行：node tools/save-server.js
 *
 * 端点：
 *   POST /em-save      — 写入整页 HTML
 *   POST /em-upload     — 上传图片（base64）
 *   POST /em-save-json  — 更新 data/days.json 字段
 *   POST /em-rotate     — 旋转图片（macOS sips）
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;
const ROOT = path.resolve(__dirname, '..');   // 项目根目录
const MAX_BODY = 10 * 1024 * 1024;           // 10 MB body limit

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

/* ── 工具函数 ────────────────────────────────────────────────────── */

/** 安全路径检查：返回项目内的绝对路径，或 null 表示拒绝 */
function safePath(relPath) {
  const cleaned  = relPath.replace(/\.\./g, '').replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT, cleaned);
  if (!fullPath.startsWith(ROOT + path.sep) && fullPath !== ROOT) return null;
  return fullPath;
}

/** 读取 POST body（带大小限制） */
function readBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Body exceeds 10 MB' }));
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/** JSON 响应 */
function jsonReply(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** 按 dot-path 设置嵌套对象的值 */
function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = /^\d+$/.test(keys[i]) ? parseInt(keys[i], 10) : keys[i];
    if (cur[k] === undefined) cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  }
  const last = /^\d+$/.test(keys[keys.length - 1])
    ? parseInt(keys[keys.length - 1], 10) : keys[keys.length - 1];
  cur[last] = value;
}

/* ── HTTP 服务器 ────────────────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  // ── CORS（仅允许 localhost）──────────────────────────────────────
  const origin = req.headers.origin || '';
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── POST 路由 ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = await readBody(req, res); } catch { return; }

    // ── /em-save — 写入整页 HTML ──────────────────────────────────
    if (req.url === '/em-save') {
      try {
        const { filePath, html } = JSON.parse(body);
        const fp = safePath(filePath);
        if (!fp) return jsonReply(res, 403, { ok: false, error: 'Path traversal denied' });
        fs.writeFile(fp, html, 'utf8', err => {
          if (err) { console.error('[em-save] Error:', err.message); return jsonReply(res, 500, { ok: false, error: err.message }); }
          console.log('[em-save] Wrote:', path.relative(ROOT, fp));
          jsonReply(res, 200, { ok: true });
        });
      } catch (e) { jsonReply(res, 400, { ok: false, error: e.message }); }
      return;
    }

    // ── /em-upload — 上传图片（base64）─────────────────────────────
    if (req.url === '/em-upload') {
      try {
        const { dir, filename, base64 } = JSON.parse(body);
        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const dirPath = safePath(dir);
        if (!dirPath) return jsonReply(res, 403, { ok: false, error: 'Path traversal denied' });
        fs.mkdirSync(dirPath, { recursive: true });

        const fullPath = path.join(dirPath, safeFilename);
        if (!fullPath.startsWith(ROOT + path.sep)) return jsonReply(res, 403, { ok: false, error: 'Path traversal denied' });

        const buffer = Buffer.from(base64, 'base64');
        fs.writeFile(fullPath, buffer, err => {
          if (err) { console.error('[em-upload] Error:', err.message); return jsonReply(res, 500, { ok: false, error: err.message }); }
          const relFromRoot = '/' + path.relative(ROOT, fullPath);
          console.log('[em-upload] Wrote:', relFromRoot, `(${Math.round(buffer.length / 1024)} KB)`);
          jsonReply(res, 200, { ok: true, path: relFromRoot });
        });
      } catch (e) { jsonReply(res, 400, { ok: false, error: e.message }); }
      return;
    }

    // ── /em-save-json — 更新 data/days.json ──────────────────────
    if (req.url === '/em-save-json') {
      try {
        const { changes } = JSON.parse(body);
        const jsonPath = path.resolve(ROOT, 'data', 'days.json');
        const raw  = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        for (const [dotPath, value] of Object.entries(changes)) {
          setByPath(data, dotPath, value);
        }
        fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8', err => {
          if (err) { console.error('[em-save-json] Error:', err.message); return jsonReply(res, 500, { ok: false, error: err.message }); }
          console.log('[em-save-json] Patched:', Object.keys(changes).join(', '));
          jsonReply(res, 200, { ok: true });
        });
      } catch (e) { jsonReply(res, 400, { ok: false, error: e.message }); }
      return;
    }

    // ── /em-rotate — 旋转图片（macOS sips）───────────────────────
    if (req.url === '/em-rotate') {
      try {
        const { imagePath, degrees } = JSON.parse(body);
        const deg = parseInt(degrees, 10);
        if (![90, -90, 180, 270, -270].includes(deg)) {
          return jsonReply(res, 400, { ok: false, error: 'Invalid degrees (±90, 180, ±270)' });
        }
        const fp = safePath(imagePath);
        if (!fp) return jsonReply(res, 403, { ok: false, error: 'Path traversal denied' });
        if (!fs.existsSync(fp)) return jsonReply(res, 404, { ok: false, error: 'File not found' });

        execSync(`sips --rotate ${deg} "${fp}"`, { timeout: 15000 });
        console.log('[em-rotate] Rotated:', path.relative(ROOT, fp), deg + '°');
        jsonReply(res, 200, { ok: true });
      } catch (e) { jsonReply(res, 500, { ok: false, error: e.message }); }
      return;
    }

    // 未知 POST 端点
    jsonReply(res, 404, { ok: false, error: 'Unknown endpoint' });
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
