export type BillItem = { name: string; qty: number; price: number }
export type Bill = {
  title: string
  items: BillItem[]
  taxRate?: number
  footer?: string
}

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || ''

async function postJson(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  const data = await res.json()
  if (!data?.ok) throw new Error(data?.error || 'Request failed')
  return data
}

export async function testXprinter(host: string, port = 9100) {
  return postJson('/api/printers/xprinter/test', { host, port })
}

export async function printBillXprinter(host: string, port: number, bill: Bill) {
  return postJson('/api/printers/xprinter/print', { host, port, bill })
}
