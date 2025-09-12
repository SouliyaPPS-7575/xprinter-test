import React, { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { type Bill } from '../utils/xprinter';
import { usePrintBitmapMutation, useTestXprinterMutation, useXprinterConfig } from '../hooks/useXprinter';

const LS_KEY = 'xprinter:config';
const DEFAULT_HOST = '192.168.66.190';

export const Xprinter: React.FC = () => {
  const [host, setHost] = useState(DEFAULT_HOST);
  const [port, setPort] = useState(9100);
  const [timeoutMs, setTimeoutMs] = useState(3000);
  const [msg, setMsg] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [bill, setBill] = useState<Bill>({
    title: 'ຮ້ານຕົວຢ່າງ',
    items: [
      { name: 'ກາເຟລາເຕ້', qty: 2, price: 3.5 },
      { name: 'ມັຟຟິນບລູເບີຣີ', qty: 1, price: 2.25 },
    ],
    taxRate: 0.07,
    footer: 'ຂອບໃຈ! ເຊີນອີກຄັ້ງ.',
  });

  const { load, save } = useXprinterConfig(LS_KEY);
  useEffect(() => {
    const cfg = load();
    if (cfg?.host) setHost(cfg.host);
    if (cfg?.port) setPort(cfg.port);
  }, [load]);

  // Ensure Lao-capable webfont is available for html2canvas render
  useEffect(() => {
    const id = 'noto-lao-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const saveCfg = (h: string, p: number) => save(h, p);

  const testMutation = useTestXprinterMutation();
  const handleTest = async () => {
    setMsg(null);
    try {
      await testMutation.mutateAsync({ host, port, timeoutMs });
      setMsg('ເຊື່ອມຕໍ່ສຳເລັດ');
      saveCfg(host, port);
    } catch (err: any) {
      setMsg(err?.message || String(err));
    }
  };

  const printMutation = usePrintBitmapMutation();
  const handlePrint = async () => {
    setMsg(null);
    try {
      const el = receiptRef.current;
      if (!el) throw new Error('Receipt element not ready');
      await printMutation.mutateAsync({ host, port, element: el, threshold: 200, timeoutMs });
      setMsg('ສົ່ງໄປຫາເຄື່ອງພິມແລ້ວ');
      saveCfg(host, port);
    } catch (err: any) {
      setMsg(err?.message || String(err));
    }
  };

  return (
    <div>
      <h1>Xprinter (Wi‑Fi)</h1>
      <p>
        ເຊື່ອມຕໍ່ໄປຫາ Xprinter ຜ່ານເຄືອຂ່າຍ ໂດຍໃຊ້ ESC/POS ທາງ TCP port 9100.
      </p>
      {/* Offscreen Lao HTML receipt for bitmap rendering */}
      <div style={{ position: 'absolute', left: -9999, top: 0 }}>
        <div
          ref={receiptRef}
          style={{
            width: 384,
            padding: 8,
            fontFamily: 'Noto Sans Lao, system-ui, sans-serif',
            color: '#000',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            ໃບບິນ
          </div>
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          {bill.items.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 14,
              }}
            >
              <div style={{ flex: '1 1 auto' }}>
                {it.name} × {it.qty}
              </div>
              <div>{it.price.toFixed(2)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          {(() => {
            const subtotal = bill.items.reduce(
              (s, it) => s + it.qty * it.price,
              0
            );
            const tax = bill.taxRate ? subtotal * bill.taxRate : 0;
            const total = subtotal + tax;
            return (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                  }}
                >
                  <div>ລວມຍ່ອຍ</div>
                  <div>{subtotal.toFixed(2)}</div>
                </div>
                {bill.taxRate ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                    }}
                  >
                    <div>ພາສີ ({(bill.taxRate * 100).toFixed(0)}%)</div>
                    <div>{tax.toFixed(2)}</div>
                  </div>
                ) : null}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <div>ລວມທັງໝົດ</div>
                  <div>{total.toFixed(2)}</div>
                </div>
              </div>
            );
          })()}
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          {bill.footer ? (
            <div style={{ textAlign: 'center', opacity: 0.9 }}>
              {bill.footer}
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: 8,
          maxWidth: 480,
        }}
      >
        <label>IP ເຄື່ອງພິມ</label>
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder='ຕົວຢ່າງ: 192.168.1.50'
        />
        <label>ພອດ</label>
        <input
          type='number'
          value={port}
          onChange={(e) => setPort(Number(e.target.value) || 9100)}
        />
        <label>Timeout (ms)</label>
        <input
          type='number'
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(Math.max(500, Number(e.target.value) || 3000))}
        />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button onClick={handleTest} disabled={!host || testMutation.isPending || printMutation.isPending}>
          {testMutation.isPending ? 'ກຳລັງທົດສອບ…' : 'ທົດສອບການເຊື່ອມຕໍ່'}
        </button>
        <button onClick={handlePrint} disabled={!host || testMutation.isPending || printMutation.isPending}>
          {printMutation.isPending ? 'ກຳລັງພິມ…' : 'ພິມໃບບິນຕົວຢ່າງ'}
        </button>
      </div>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      <p style={{ marginTop: 12, opacity: 0.85 }}>
        ແນະນຳ: ຖ້າທ່ານບໍ່ຮູ້ IP ເຄື່ອງພິມ, ກວດເບິ່ງ DHCP leases ຢູ່ໃນ router
        ຂອງທ່ານ.
      </p>
    </div>
  );
};

export const Route = createFileRoute('/xprinter')({
  component: Xprinter,
});
