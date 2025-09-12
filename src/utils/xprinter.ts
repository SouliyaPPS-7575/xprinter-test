export type BillItem = { name: string; qty: number; price: number }
export type Bill = {
  title: string
  items: BillItem[]
  taxRate?: number
  footer?: string
}

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || ''

async function postJson(path: string, body: any) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data?.error ? ` - ${data.error}` : ''
    } catch {}
    throw new Error(`${path} failed: ${res.status}${detail}`)
  }
  const data = await res.json()
  if (!data?.ok) throw new Error(data?.error || 'Request failed')
  return data
}

export async function testXprinter(host: string, port = 9100, timeoutMs?: number) {
  const body: any = { host, port }
  if (typeof timeoutMs === 'number') body.timeoutMs = timeoutMs
  return postJson('/api/printers/xprinter/test', body)
}

export async function printBillXprinter(host: string, port: number, bill: Bill, timeoutMs?: number) {
  const body: any = { host, port, bill }
  if (typeof timeoutMs === 'number') body.timeoutMs = timeoutMs
  return postJson('/api/printers/xprinter/print', body)
}

export async function printBitmapXprinter(host: string, port: number, pngBase64OrDataUrl: string, threshold = 200, timeoutMs?: number) {
  const isDataUrl = /^data:image\/png;base64,/i.test(pngBase64OrDataUrl)
  const data: any = { host, port, threshold }
  if (isDataUrl) data.dataUrl = pngBase64OrDataUrl
  else data.pngBase64 = pngBase64OrDataUrl
  if (typeof timeoutMs === 'number') data.timeoutMs = timeoutMs
  return postJson('/api/printers/xprinter/print_png', data)
}
