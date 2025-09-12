const net = require('net');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function connectSocket(host, port, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;
    const onError = (err) => { if (!done) { done = true; try { socket.destroy(); } catch {} reject(err); } };
    const onConnect = () => { if (!done) { done = true; try { socket.setNoDelay(true); socket.setKeepAlive(false); } catch {} resolve(socket); } };
    socket.once('error', onError);
    socket.setTimeout(timeoutMs, () => onError(new Error('Connection timeout')));
    socket.connect(port, host, onConnect);
  });
}

async function testXprinterConnection({ host, port = 9100, timeoutMs = 1500 }) {
  const sock = await connectSocket(host, port, timeoutMs);
  try {
    // Send DLE EOT 2 (Real-time status transmission request for printer)
    // Many low-cost printers ignore this, but connect success is enough.
    sock.write(Buffer.from([0x10, 0x04, 0x02]));
    await delay(100);
  } finally {
    try { sock.end(); } catch {}
    try { sock.destroy(); } catch {}
  }
  return true;
}

function esc(...bytes) { return Buffer.from(bytes); }
function text(s) { return Buffer.from(s, 'utf8'); }
function lf(n = 1) { return Buffer.alloc(n, 0x0A); }

function padRight(s, n) { return (s.length >= n) ? s.slice(0, n) : s + ' '.repeat(n - s.length); }
function padLeft(s, n) { return (s.length >= n) ? s.slice(-n) : ' '.repeat(n - s.length) + s; }
function center(s, width = 32) { const pad = Math.max(0, Math.floor((width - s.length) / 2)); return ' '.repeat(pad) + s; }

// Very simple ESC/POS receipt builder for 58/80mm printers
function buildEscPosReceipt(bill, opts = {}) {
  const width = opts.width || 32; // characters per line (32 for 58mm, 48 for 80mm)
  const chunks = [];
  // Initialize
  chunks.push(esc(0x1B, 0x40)); // ESC @ initialize
  // Center title
  chunks.push(esc(0x1B, 0x61, 0x01)); // ESC a 1 (center)
  // Default title in Lao: ໃບບິນ (Receipt)
  chunks.push(text(center((bill.title || 'ໃບບິນ'), width)));
  chunks.push(lf());
  // Left align
  chunks.push(esc(0x1B, 0x61, 0x00));
  chunks.push(text('-'.repeat(width)));
  chunks.push(lf());

  let subtotal = 0;
  (bill.items || []).forEach((it) => {
    const lineTotal = (it.qty || 0) * (it.price || 0);
    subtotal += lineTotal;
    const left = padRight(String(it.name || ''), Math.max(0, width - 10));
    const qtyPrice = `${padLeft(String(it.qty || 0), 3)} x ${padLeft((it.price || 0).toFixed(2), 6)}`;
    chunks.push(text(left + qtyPrice));
    chunks.push(lf());
  });

  chunks.push(text('-'.repeat(width)));
  chunks.push(lf());
  const tax = bill.taxRate ? subtotal * bill.taxRate : 0;
  const total = subtotal + tax;
  // Lao: ລວມຍ່ອຍ (Subtotal)
  chunks.push(text(`${padRight('ລວມຍ່ອຍ', width - 8)}${padLeft(subtotal.toFixed(2), 8)}`));
  chunks.push(lf());
  if (bill.taxRate) {
    // Lao: ພາສີ (Tax)
    const label = `ພາສີ (${(bill.taxRate * 100).toFixed(0)}%)`;
    chunks.push(text(`${padRight(label, width - 8)}${padLeft(tax.toFixed(2), 8)}`));
    chunks.push(lf());
  }
  // Lao: ລວມທັງໝົດ (Total)
  chunks.push(text(`${padRight('ລວມທັງໝົດ', width - 8)}${padLeft(total.toFixed(2), 8)}`));
  chunks.push(lf(2));

  if (bill.footer) {
    chunks.push(esc(0x1B, 0x61, 0x01)); // center
    chunks.push(text(bill.footer));
    chunks.push(lf());
  }

  chunks.push(lf(3));
  // Cut (partial) if supported
  chunks.push(esc(0x1D, 0x56, 0x42, 0x00));

  return Buffer.concat(chunks);
}

async function printToXprinter({ host, port = 9100, data, timeoutMs = 2000 }) {
  if (!Buffer.isBuffer(data)) data = Buffer.from(data);
  const sock = await connectSocket(host, port, timeoutMs);
  await new Promise((resolve, reject) => {
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      // Best-effort cleanup: remove listeners and schedule destroy slightly later
      try {
        sock.removeAllListeners('error');
        sock.removeAllListeners('timeout');
        sock.removeAllListeners('close');
      } catch {}
      if (err) {
        try { sock.destroy(); } catch {}
        return reject(err);
      }
      // Allow a brief linger to flush buffers then force close
      setTimeout(() => {
        try { sock.destroy(); } catch {}
      }, 250);
      resolve();
    };

    sock.once('error', (err) => finish(err));

    // Guard against printers that hold the connection open forever
    sock.setTimeout(timeoutMs, () => finish(new Error('Write timeout')));

    // Write and resolve on successful callback; do not wait for 'close'
    sock.write(data, (err) => {
      if (err) return finish(err);
      try { sock.end(); } catch {}
      // Resolve immediately; rely on linger timer for cleanup
      finish();
    });
  });
}

module.exports = {
  testXprinterConnection,
  buildEscPosReceipt,
  printToXprinter,
};
