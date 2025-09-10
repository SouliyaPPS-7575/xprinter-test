import React, { useEffect, useState } from 'react'
import { printBillXprinter, testXprinter, type Bill } from '../utils/xprinter'

const LS_KEY = 'xprinter:config'
const DEFAULT_HOST = '192.168.66.190'

export const Xprinter: React.FC = () => {
  const [host, setHost] = useState(DEFAULT_HOST)
  const [port, setPort] = useState(9100)
  const [busy, setBusy] = useState<'idle' | 'testing' | 'printing'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const cfg = JSON.parse(raw)
        if (cfg?.host) setHost(cfg.host)
        if (cfg?.port) setPort(Number(cfg.port) || 9100)
      }
    } catch {}
  }, [])

  const saveCfg = (h: string, p: number) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ host: h, port: p })) } catch {}
  }

  const handleTest = async () => {
    setMsg(null)
    setBusy('testing')
    try {
      await testXprinter(host, port)
      setMsg('ເຊື່ອມຕໍ່ສຳເລັດ')
      saveCfg(host, port)
    } catch (err: any) {
      setMsg(err?.message || String(err))
    } finally {
      setBusy('idle')
    }
  }

  const handlePrint = async () => {
    setMsg(null)
    setBusy('printing')
    try {
      const bill: Bill = {
        title: 'ຮ້ານຕົວຢ່າງ',
        items: [
          { name: 'ກາເຟລາເຕ້', qty: 2, price: 3.5 },
          { name: 'ມັຟຟິນບລູເບີຣີ', qty: 1, price: 2.25 },
        ],
        taxRate: 0.07,
        footer: 'ຂອບໃຈ! ເຊີນອີກຄັ້ງ.',
      }
      await printBillXprinter(host, port, bill)
      setMsg('ສົ່ງໄປຫາເຄື່ອງພິມແລ້ວ')
      saveCfg(host, port)
    } catch (err: any) {
      setMsg(err?.message || String(err))
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div>
      <h1>Xprinter (Wi‑Fi)</h1>
      <p>ເຊື່ອມຕໍ່ໄປຫາ Xprinter ຜ່ານເຄືອຂ່າຍ ໂດຍໃຊ້ ESC/POS ທາງ TCP port 9100.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, maxWidth: 480 }}>
        <label>IP ເຄື່ອງພິມ</label>
        <input value={host} onChange={e => setHost(e.target.value)} placeholder="ຕົວຢ່າງ: 192.168.1.50" />
        <label>ພອດ</label>
        <input type="number" value={port} onChange={e => setPort(Number(e.target.value) || 9100)} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button onClick={handleTest} disabled={!host || busy !== 'idle'}>{busy === 'testing' ? 'ກຳລັງທົດສອບ…' : 'ທົດສອບການເຊື່ອມຕໍ່'}</button>
        <button onClick={handlePrint} disabled={!host || busy !== 'idle'}>{busy === 'printing' ? 'ກຳລັງພິມ…' : 'ພິມໃບບິນຕົວຢ່າງ'}</button>
      </div>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      <p style={{ marginTop: 12, opacity: 0.85 }}>
        ແນະນຳ: ຖ້າທ່ານບໍ່ຮູ້ IP ເຄື່ອງພິມ, ກວດເບິ່ງ DHCP leases ຢູ່ໃນ router ຂອງທ່ານ.
      </p>
    </div>
  )
}
