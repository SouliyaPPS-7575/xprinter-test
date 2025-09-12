import { useCallback, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import html2canvas from 'html2canvas'
import { printBitmapXprinter, testXprinter } from '../utils/xprinter'

export function useXprinterConfig(lsKey = 'xprinter:config') {
  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(lsKey)
      if (!raw) return null
      const cfg = JSON.parse(raw)
      return { host: cfg?.host as string | undefined, port: Number(cfg?.port) || 9100 }
    } catch {
      return null
    }
  }, [lsKey])

  const save = useCallback((host: string, port: number) => {
    try { localStorage.setItem(lsKey, JSON.stringify({ host, port })) } catch {}
  }, [lsKey])

  return useMemo(() => ({ load, save }), [load, save])
}

export function useTestXprinterMutation() {
  return useMutation({
    mutationKey: ['xprinter', 'test'],
    mutationFn: async (vars: { host: string; port: number; timeoutMs?: number }) => {
      const { host, port, timeoutMs } = vars
      return testXprinter(host, port, timeoutMs)
    },
  })
}

export function usePrintBitmapMutation() {
  return useMutation({
    mutationKey: ['xprinter', 'print', 'bitmap'],
    mutationFn: async (vars: { host: string; port: number; element: HTMLElement; threshold?: number; timeoutMs?: number }) => {
      const { host, port, element, threshold = 200, timeoutMs } = vars
      // Ensure a brief delay for fonts
      await new Promise((r) => setTimeout(r, 100))
      const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 })
      const dataUrl = canvas.toDataURL('image/png')
      return printBitmapXprinter(host, port, dataUrl, threshold, timeoutMs)
    },
  })
}
