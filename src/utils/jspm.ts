// Utility helpers for JSPrintManager usage.
// This code uses the global `JSPM` namespace provided by jsprintmanager types.

type BillItem = { name: string; qty: number; price: number }
type Bill = {
  title: string
  items: BillItem[]
  taxRate?: number
  footer?: string
}

export function getWsStatusLabel(status?: number): string {
  const s = status ?? (globalThis as any)?.JSPM?.JSPrintManager?.WS?.status
  const WS = (globalThis as any)?.JSPM?.WSStatus
  if (WS == null) return 'Unavailable'
  switch (s) {
    case WS.Open: return 'Open'
    case WS.Closed: return 'Closed'
    case WS.Connecting: return 'Connecting'
    default: return 'Unknown'
  }
}

/**
 * Subscribes to JSPrintManager websocket status changes and returns an unsubscribe.
 */
export function watchJspmStatus(onStatus: (label: string) => void): () => void {
  const g: any = globalThis as any
  const JSPM = g.JSPM
  if (!JSPM) {
    onStatus('Not loaded')
    return () => {}
  }

  const update = () => {
    const s = JSPM.JSPrintManager.WS.status
    onStatus(getWsStatusLabel(s))
  }

  // initial emit
  update()

  // subscribe and return cleanup
  const ws = JSPM.JSPrintManager.WS
  const prev = ws.onStatusChanged
  ws.onStatusChanged = () => { prev?.(); update() }
  return () => { ws.onStatusChanged = prev }
}

/**
 * Attempts to start JSPrintManager and watch status changes.
 * Returns true when the websocket is open.
 */
export async function connectJspm(opts?: {
  watchOnly?: boolean
  onStatus?: (label: string) => void
}): Promise<boolean> {
  const g: any = globalThis as any
  const JSPM = g.JSPM
  if (!JSPM) {
    opts?.onStatus?.('Not loaded')
    return false
  }
  try {
    JSPM.JSPrintManager.auto_reconnect = true
    if (!opts?.watchOnly) {
      await JSPM.JSPrintManager.start()
    }
  } catch {}

  if (opts?.onStatus) {
    const update = () => {
      const s = JSPM.JSPrintManager.WS.status
      opts.onStatus!(getWsStatusLabel(s))
    }
    // initial
    update()
    // subscribe
    const ws = JSPM.JSPrintManager.WS
    const prev = ws.onStatusChanged
    ws.onStatusChanged = () => { prev?.(); update() }
  }

  return JSPM.JSPrintManager.WS.status === JSPM.WSStatus.Open
}

/**
 * Prints a simple text bill to the default printer using JSPrintManager.
 */
export async function printSampleBill(bill: Bill): Promise<void> {
  const g: any = globalThis as any
  const JSPM = g.JSPM
  if (!JSPM) throw new Error('JSPM namespace not available. Ensure jsprintmanager is installed.')

  // Ensure connection
  try { await JSPM.JSPrintManager.start() } catch {}
  if (JSPM.JSPrintManager.WS.status !== JSPM.WSStatus.Open) {
    throw new Error('JSPrintManager is not connected. Open the client app.')
  }

  const lines: string[] = []
  lines.push(center(bill.title.toUpperCase()))
  lines.push('-'.repeat(32))
  let subtotal = 0
  bill.items.forEach(it => {
    const lineTotal = it.qty * it.price
    subtotal += lineTotal
    lines.push(
      `${padRight(it.name, 18)}${padLeft(it.qty.toString(), 3)} x ${padLeft(it.price.toFixed(2), 6)}`
    )
  })
  lines.push('-'.repeat(32))
  const tax = bill.taxRate ? subtotal * bill.taxRate : 0
  const total = subtotal + tax
  lines.push(`${padRight('Subtotal', 24)}${padLeft(subtotal.toFixed(2), 8)}`)
  if (bill.taxRate) lines.push(`${padRight(`Tax (${(bill.taxRate*100).toFixed(0)}%)`, 24)}${padLeft(tax.toFixed(2), 8)}`)
  lines.push(`${padRight('TOTAL', 24)}${padLeft(total.toFixed(2), 8)}`)
  if (bill.footer) {
    lines.push('')
    lines.push(center(bill.footer))
  }
  lines.push('\n')

  // Create a text file print job
  const txt = new JSPM.PrintFileTXT(lines.join('\n'), 'bill.txt', 1)
  const job = new JSPM.ClientPrintJob()
  job.clientPrinter = new JSPM.DefaultPrinter()
  job.files.push(txt)
  await job.sendToClient()
}

function padRight(s: string, n: number) {
  return (s.length >= n) ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}
function padLeft(s: string, n: number) {
  return (s.length >= n) ? s.slice(-n) : ' '.repeat(n - s.length) + s
}
function center(s: string, width = 32) {
  const pad = Math.max(0, Math.floor((width - s.length) / 2))
  return ' '.repeat(pad) + s
}
