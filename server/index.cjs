// Minimal HTTP server exposing /api/printers/scan
// Run with: npm run server

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const {
  testXprinterConnection,
  buildEscPosReceipt,
  printToXprinter,
} = require('./xprinter.cjs');
const { buildEscPosFromPngBuffer } = require('./escpos-image.cjs');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const CLIENT_DIR = path.join(__dirname, '..', 'dist');
const INDEX_HTML = path.join(CLIENT_DIR, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function notFound(res) {
  res.statusCode = 404;
  res.end('Not Found');
}

async function readJson(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const buf = Buffer.concat(chunks).toString('utf8');
  if (!buf) return {};
  try {
    return JSON.parse(buf);
  } catch (e) {
    throw new Error('Invalid JSON body');
  }
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const parsed = url.parse(req.url, true);
  // normalize path and remove trailing slashes except for root
  let pathname = parsed.pathname || '/';
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/g, '');
  // Set permissive CORS for dev, or use explicit CORS_ORIGIN
  const origin = req.headers.origin || process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Removed /api/printers/scan endpoint

  // XPRINTER: test TCP connectivity
  if (method === 'POST' && pathname === '/api/printers/xprinter/test') {
    try {
      const body = await readJson(req);
      const { host, port = 9100, timeoutMs = 1500 } = body || {};
      if (!host)
        return sendJson(res, 400, { ok: false, error: 'Missing host' });
      await testXprinterConnection({ host, port, timeoutMs });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      const code = err && err.code;
      const isNet = code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH';
      sendJson(res, isNet ? 502 : 500, {
        ok: false,
        error: String((err && err.message) || err),
      });
    }
    return;
  }

  // XPRINTER: print a bill via ESC/POS over TCP
  if (method === 'POST' && pathname === '/api/printers/xprinter/print') {
    try {
      const body = await readJson(req);
      const { host, port = 9100, bill, opts } = body || {};
      if (!host)
        return sendJson(res, 400, { ok: false, error: 'Missing host' });
      if (!bill)
        return sendJson(res, 400, { ok: false, error: 'Missing bill' });
      const data = buildEscPosReceipt(bill, opts);
      await printToXprinter({ host, port, data });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      const code = err && err.code;
      const isNet = code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH';
      sendJson(res, isNet ? 502 : 500, {
        ok: false,
        error: String((err && err.message) || err),
      });
    }
    return;
  }

  // XPRINTER: print bitmap (PNG data URL or base64)
  if (method === 'POST' && pathname === '/api/printers/xprinter/print_png') {
    try {
      const body = await readJson(req);
      const {
        host,
        port = 9100,
        pngBase64,
        dataUrl,
        threshold = 200,
      } = body || {};
      if (!host)
        return sendJson(res, 400, { ok: false, error: 'Missing host' });
      const b64 =
        pngBase64 ||
        (typeof dataUrl === 'string' && dataUrl.includes('base64,')
          ? dataUrl.split('base64,').pop()
          : null);
      if (!b64)
        return sendJson(res, 400, { ok: false, error: 'Missing PNG data' });
      let pngBuf;
      try {
        pngBuf = Buffer.from(String(b64), 'base64');
        if (!pngBuf || pngBuf.length < 8) throw new Error('Empty PNG buffer');
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: 'Invalid base64 PNG' });
      }
      let data;
      try {
        data = buildEscPosFromPngBuffer(pngBuf, { threshold });
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: 'Invalid PNG image data' });
      }
      await printToXprinter({ host, port, data });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      const code = err && err.code;
      const isNet = code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH';
      sendJson(res, isNet ? 502 : 500, {
        ok: false,
        error: String((err && err.message) || err),
      });
    }
    return;
  }

  // Removed HTMLDocs-based printing endpoint

  if (method === 'GET' && pathname === '/healthz') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  // Serve static frontend (SPA) for non-API requests
  if (method === 'GET' || method === 'HEAD') {
    if (!pathname.startsWith('/api')) {
      // Normalize and prevent path traversal
      const safePath = pathname.replace(/\0/g, '').replace(/\.\./g, '');
      const relPath = safePath.startsWith('/') ? safePath.slice(1) : safePath;
      let filePath = pathname === '/' ? INDEX_HTML : pathModuleJoin(CLIENT_DIR, relPath);
      try {
        const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        if (!stat || stat.isDirectory()) filePath = INDEX_HTML;
      } catch {
        filePath = INDEX_HTML;
      }
      try {
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        const stream = fs.createReadStream(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        stream.on('error', () => notFound(res));
        stream.pipe(res);
        return;
      } catch {
        // fallthrough to 404
      }
    }
  }

  notFound(res);

  function pathModuleJoin(base, p) {
    try {
      return path.join(base, decodeURIComponent(p));
    } catch {
      return path.join(base, p);
    }
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[printer-server] listening on http://localhost:${PORT}`);
});
