'use client'

import { useRef, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',' || ch === ';') row.push(cell), (cell = '')
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell), rows.push(row), (row = []), (cell = '')
    } else cell += ch
  }
  if (cell || row.length) row.push(cell), rows.push(row)
  return rows.filter((r) => r.some((x) => x.trim()))
}

async function readRows(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    const data = await readSheet(file)
    return data.map((r) => r.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : String(v)))).filter((r) => r.some((x) => x.trim()))
  }
  return parseCsv(await file.text())
}

/** Maps rows to objects by header name (case-insensitive), so column order in the sheet doesn't matter. */
export function rowsToRecords(rows: string[][], headers: string[]) {
  const [head, ...body] = rows
  if (!head) return []
  const idx = headers.map((h) => head.findIndex((x) => x.trim().toLowerCase() === h.toLowerCase()))
  return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, idx[i] >= 0 ? (r[idx[i]] ?? '').trim() : ''])) as Record<string, string>)
}

export function SpreadsheetImport({ headers, sample, templateName, onRecords, label = 'Import from Excel' }: { headers: string[]; sample: string[]; templateName: string; onRecords: (records: Record<string, string>[], fileName: string) => number; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const download = () => {
    const csv = [headers, sample].map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const records = rowsToRecords(await readRows(file), headers)
      if (!records.length) toast.error('No rows found', { description: `Expected a header row with: ${headers.join(', ')}` })
      else {
        const added = onRecords(records, file.name)
        toast.success(`Imported ${added} row${added === 1 ? '' : 's'} from ${file.name}`, { description: added < records.length ? `${records.length - added} row(s) skipped — missing required columns.` : undefined })
      }
    } catch {
      toast.error('Could not read that file', { description: 'Use .xlsx or .csv with the template columns.' })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept=".xlsx,.csv" className="sr-only" aria-label={label} onChange={(e) => pick(e.target.files?.[0])} />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
        <FileSpreadsheet /> {busy ? 'Reading…' : label}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={download}>
        <Download /> Template
      </Button>
    </span>
  )
}
