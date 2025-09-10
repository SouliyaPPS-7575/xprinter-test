export type DiscoveredPrinter = {
  name: string
  type: string | null
  host: string | null
  port: number | null
  addresses: string[]
  txt: Record<string, string>
}

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || ''

export async function scanNetworkPrinters(opts?: {
  timeoutMs?: number
}): Promise<DiscoveredPrinter[]> {
  const t = Math.max(500, Math.min(5000, opts?.timeoutMs ?? 1500))
  const res = await fetch(`${API_BASE}/api/printers/scan?timeout=${t}`)
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
  const data = await res.json()
  if (!data?.ok) throw new Error(data?.error || 'Scan failed')
  return (data.results ?? []) as DiscoveredPrinter[]
}
