// Minimal HTTP server exposing /api/printers/scan
// Run with: npm run server

const http = require('http');
const url = require('url');
const { testXprinterConnection, buildEscPosReceipt, printToXprinter } = require('./xprinter.cjs');
const { buildEscPosFromPngBuffer } = require('./escpos-image.cjs');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

function sendJson(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Basic CORS for local dev (Vite default port 5173)
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
  try { return JSON.parse(buf); } catch (e) { throw new Error('Invalid JSON body'); }
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname || '/';
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
  if (method === 'POST' && path === '/api/printers/xprinter/test') {
    try {
      const body = await readJson(req);
      const { host, port = 9100, timeoutMs = 1500 } = body || {};
      if (!host) return sendJson(res, 400, { ok: false, error: 'Missing host' });
      await testXprinterConnection({ host, port, timeoutMs });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String((err && err.message) || err) });
    }
    return;
  }

  // XPRINTER: print a bill via ESC/POS over TCP
  if (method === 'POST' && path === '/api/printers/xprinter/print') {
    try {
      const body = await readJson(req);
      const { host, port = 9100, bill, opts } = body || {};
      if (!host) return sendJson(res, 400, { ok: false, error: 'Missing host' });
      if (!bill) return sendJson(res, 400, { ok: false, error: 'Missing bill' });
      const data = buildEscPosReceipt(bill, opts);
      await printToXprinter({ host, port, data });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) });
    }
    return;
  }

  // XPRINTER: print bitmap (PNG data URL or base64)
  if (method === 'POST' && path === '/api/printers/xprinter/print_png') {
    try {
      const body = await readJson(req);
      const { host, port = 9100, pngBase64, dataUrl, threshold = 200 } = body || {};
      if (!host) return sendJson(res, 400, { ok: false, error: 'Missing host' });
      const b64 = pngBase64 || (typeof dataUrl === 'string' && dataUrl.includes('base64,') ? dataUrl.split('base64,').pop() : null);
      if (!b64) return sendJson(res, 400, { ok: false, error: 'Missing PNG data' });
      const pngBuf = Buffer.from(String(b64), 'base64');
      const data = buildEscPosFromPngBuffer(pngBuf, { threshold });
      await printToXprinter({ host, port, data });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String((err && err.message) || err) });
    }
    return;
  }

  // Removed HTMLDocs-based printing endpoint

  if (method === 'GET' && path === '/healthz') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  notFound(res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[printer-server] listening on http://localhost:${PORT}`);
});
