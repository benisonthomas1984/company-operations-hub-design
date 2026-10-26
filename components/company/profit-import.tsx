'use client'

import { useRef, useState } from 'react'
import { FileSpreadsheet, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { fmtEUR, type BusinessProduct } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { monthLabel } from '@/lib/derive'
import { Callout } from '@/components/hub/primitives'
import { FormSheet } from '@/components/hub/form'
import { readRows } from './spreadsheet-import'
import { cn } from '@/lib/utils'

type Kind = 'Income' | 'Delivery cost' | 'Operating cost'
type Line = { month: string; kind: Kind; amount: number; description: string; reference: string }
const kinds: Kind[] = ['Income', 'Delivery cost', 'Operating cost']

export function ProfitImport({ b, open, onOpenChange }: { b: BusinessProduct; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate } = useHub()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [notes, setNotes] = useState<string[]>([])

  const reset = () => (setLines([]), setNotes([]), setFile(''))

  const pick = async (f?: File) => {
    if (!f) return
    setBusy(true)
    reset()
    try {
      const rows = (await readRows(f)).slice(0, 301).map((r) => r.slice(0, 30).map((x) => x.slice(0, 300)))
      if (rows.length < 2) throw new Error('The file needs a header row and at least one data row.')
      const res = await fetch('/api/products/profit-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: b.name, fileName: f.name, rows }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const clean = (data.lines as Line[]).filter((l) => /^\d{4}-\d{2}$/.test(l.month) && l.amount > 0)
      setLines(clean)
      setNotes(data.notes ?? [])
      setFile(f.name)
      if (!clean.length) toast.error('No income or cost rows found in that file')
    } catch (e) {
      toast.error('Could not analyse that file', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const total = (k: Kind) => lines.filter((l) => l.kind === k).reduce((s, l) => s + l.amount, 0)
  const income = total('Income')
  const delivery = total('Delivery cost')
  const operating = total('Operating cost')
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const apply = () => {
    if (!lines.length) return
    const ownerDept = b.dept
    mutate((co, { id, now, me, audit }) => {
      for (const l of lines) {
        if (l.kind === 'Income') {
          co.revenue.push({ id: id('REV'), productId: b.id, period: l.month, recognized: l.amount, invoiced: l.amount, collected: l.amount, source: l.reference || `${file}: ${l.description}`, history: [{ at: now, by: me.id, text: `Imported from ${file} (AI-classified)` }] })
        } else {
          co.expenses.push({
            id: id('EXP'),
            description: l.description,
            payee: l.reference || 'Imported',
            category: l.kind === 'Delivery cost' ? 'Other' : 'Marketing',
            amount: l.amount,
            currency: 'EUR',
            date: `${l.month}-01`,
            dept: ownerDept,
            allocations: [{ productId: b.id, amount: l.amount, kind: l.kind === 'Delivery cost' ? 'Delivery' : 'Operating' }],
            approvalRequired: false,
            status: 'Paid',
            submittedBy: me.id,
            source: `Spreadsheet import · ${file}`,
            history: [{ at: now, by: me.id, text: `Imported from ${file} (AI-classified)` }],
          })
        }
      }
      audit('Imported profit data', b.id, `${lines.length} lines from ${file}`)
    })
    toast.success(`Imported ${lines.length} lines into ${b.name}`)
    reset()
    onOpenChange(false)
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => (o || reset(), onOpenChange(o))}
      title={`Import profit data · ${b.name}`}
      description="Upload any Excel or CSV export — bank statement, accounting ledger or sales report. AI reads the columns, classifies each row, and you review before anything is saved."
      onSubmit={apply}
      submitLabel={lines.length ? `Import ${lines.length} lines` : 'Import'}
    >
      <div className="flex flex-col gap-4">
        <input ref={input} type="file" accept=".xlsx,.csv" className="sr-only" aria-label="Spreadsheet file" onChange={(e) => pick(e.target.files?.[0])} />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm transition-colors hover:bg-muted disabled:opacity-60"
        >
          {busy ? <Sparkles className="size-5 animate-pulse text-primary" aria-hidden /> : <FileSpreadsheet className="size-5 text-muted-foreground" aria-hidden />}
          <span className="font-medium text-foreground">{busy ? 'AI is reading your spreadsheet…' : file ? `Analysed ${file} — choose another file` : 'Choose an .xlsx or .csv file'}</span>
          <span className="text-xs text-muted-foreground">Any column layout works. Up to 300 rows.</span>
        </button>

        {lines.length > 0 && (
          <>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
              {[
                ['Income', income],
                ['Delivery cost', delivery],
                ['Operating cost', operating],
                ['Profit', income - delivery - operating],
              ].map(([label, v]) => (
                <div key={label as string} className="bg-card px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className={cn('font-mono text-sm font-semibold', label === 'Profit' && ((v as number) >= 0 ? 'text-success' : 'text-destructive'))}>{fmtEUR(v as number)}</dd>
                </div>
              ))}
            </dl>

            {notes.length > 0 && (
              <Callout tone="info" title="AI notes">
                <ul className="list-disc pl-4">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </Callout>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Rows to import — change the type if the AI got it wrong</caption>
                <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Month</th>
                    <th scope="col" className="px-3 py-2 font-medium">Description</th>
                    <th scope="col" className="px-3 py-2 font-medium">Type</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                    <th scope="col" className="w-8 px-1"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">{monthLabel(l.month)} {l.month.slice(0, 4)}</td>
                      <td className="max-w-40 truncate px-3 py-1.5 text-foreground" title={l.description}>{l.description}</td>
                      <td className="px-3 py-1.5">
                        <select aria-label={`Type for ${l.description}`} value={l.kind} onChange={(e) => update(i, { kind: e.target.value as Kind })} className="rounded-md border border-input bg-background px-1.5 py-1 text-xs">
                          {kinds.map((k) => <option key={k}>{k}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtEUR(l.amount)}</td>
                      <td className="px-1">
                        <Button type="button" size="icon" variant="ghost" className="size-7" aria-label={`Remove ${l.description}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </FormSheet>
  )
}
