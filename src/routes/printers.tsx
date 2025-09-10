import React, { useState } from 'react'
import { scanNetworkPrinters, type DiscoveredPrinter } from '../utils/printers'

export const Printers: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<DiscoveredPrinter[]>([])

  const handleScan = async () => {
    setLoading(true)
    setError(null)
    try {
      const found = await scanNetworkPrinters()
      setResults(found)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Network Printers</h1>
      <p>Scan your local network for Bonjour/AirPrint-capable printers.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleScan} disabled={loading}>{loading ? 'Scanning…' : 'Scan Printers'}</button>
        <button onClick={() => setResults([])} disabled={loading || results.length === 0}>Clear</button>
      </div>
      {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
      <ul style={{ marginTop: 16, padding: 0, listStyle: 'none' }}>
        {results.map((p, i) => (
          <li key={i} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>{displayName(p)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {p.type || 'Unknown service'} • {p.host || 'Unknown host'}{p.port ? `:${p.port}` : ''}
            </div>
            {webUrl(p) && (
              <div style={{ marginTop: 6 }}>
                <a href={webUrl(p)!} target="_blank" rel="noreferrer">Open Web UI</a>
              </div>
            )}
            {p.addresses?.length ? (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Addrs: {p.addresses.join(', ')}
              </div>
            ) : null}
            {Object.keys(p.txt || {}).length ? (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {Object.entries(p.txt).map(([k, v]) => (
                  <span key={k} style={{ marginRight: 8 }}>
                    <strong>{k}:</strong> {v}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
        {!loading && results.length === 0 && (
          <li style={{ marginTop: 12, opacity: 0.9 }}>No printers found yet. Try Scan.</li>
        )}
      </ul>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Note: This discovers printers on your current network using mDNS (Bonjour). Configuring a
        printer to join Wi‑Fi requires vendor-specific methods and isn’t covered by this scan.
      </p>
    </div>
  )
}

function displayName(p: DiscoveredPrinter) {
  const ty = p.txt?.ty || p.txt?.product || ''
  if (ty) return ty.replace(/[\(\)]/g, '')
  // Fallback to instance name without service suffix
  return p.name?.replace(/\._[a-z]+\._tcp\.local\.*/i, '') || 'Printer'
}

function webUrl(p: DiscoveredPrinter): string | null {
  const host = p.addresses?.[0] || p.host
  if (!host) return null
  const isHttps = (p.type || '').toLowerCase().includes('_ipps._tcp')
  const scheme = isHttps ? 'https' : 'http'
  const port = p.port && p.port !== (isHttps ? 443 : 80) ? `:${p.port}` : ''
  return `${scheme}://${host}${port}`
}
