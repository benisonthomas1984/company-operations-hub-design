'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { businessProducts, expenses, finance, fmtEUR, type Expense } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Callout, DeptTag, IdChip, KV, Panel, PersonLink, SourceChip, StatusPill } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

const productName = (id: string) => businessProducts.find((b) => b.business_product_service_id === id)?.name ?? id

export function Finance() {
  const params = useSearchParams()
  const { can, perspective } = useStore()
  const [tab, setTab] = useState(params.get('tab') ?? 'overview')
  const [sel, setSel] = useState<string>('EXP-5510')

  if (!can('finance.read')) {
    const mine = expenses.filter((e) => e.submittedBy === perspective.id)
    return (
      <div className="flex flex-col gap-4">
        <Callout tone="muted" title="Finance is restricted">
          Company figures, allocations and product contribution need finance authorization. You can still see expenses you submitted.
        </Callout>
        <Panel title="My submitted expenses">
          <ExpenseRows rows={mine} onSelect={() => undefined} />
          {!mine.length && <p className="p-4 text-sm text-muted-foreground">You haven&apos;t submitted any expenses.</p>}
        </Panel>
      </div>
    )
  }

  const e = expenses.find((x) => x.id === sel)!
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'products', label: 'Product contribution' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn('-mb-px border-b-2 px-3 py-2 text-sm', tab === t.id ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title={`Company expense · ${finance.period}`} action={<SourceChip label="Bank feed" freshness="1h ago" />}>
            <div className="flex flex-col gap-1 p-4">
              <span className="font-mono text-3xl font-semibold text-foreground">{fmtEUR(finance.companyExpense)}</span>
              <span className="text-xs text-muted-foreground">Excludes held duplicate EXP-5511 ({fmtEUR(1000)})</span>
            </div>
          </Panel>
          <Panel title="Orion Receipt Reader revenue" action={<SourceChip label="Revenue feed" freshness="26h ago" state="stale" />}>
            <div className="flex flex-col gap-1 p-4">
              <span className="font-mono text-3xl font-semibold text-foreground">{fmtEUR(finance.reader.revenue)}</span>
              <span className="text-xs text-warning">Provisional — feed stale. Figures may change.</span>
            </div>
          </Panel>
          <Panel title="Needs attention">
            <ul className="divide-y divide-border text-sm">
              {expenses
                .filter((x) => ['Submitted', 'Changes requested', 'Duplicate — held'].includes(x.status))
                .map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => { setSel(x.id); setTab('expenses') }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/50">
                      <IdChip>{x.id}</IdChip>
                      <StatusPill status={x.status} className="ml-auto" />
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <Panel title="Expenses" description={finance.period}>
            <ExpenseRows rows={expenses} onSelect={setSel} selectedId={sel} />
          </Panel>
          <ExpenseDetail e={e} canManage={can('finance.manage')} />
        </div>
      )}

      {tab === 'products' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Panel title="Orion Receipt Reader · contribution" description="Revenue minus attributable expense. Not profit — shared overhead is not allocated." action={<SourceChip label="Revenue feed" freshness="26h ago" state="stale" />}>
            <div className="flex flex-col gap-4 p-4">
              {[
                { label: 'Revenue', value: finance.reader.revenue, w: 100, cls: 'bg-success' },
                { label: 'Attributable expense', value: finance.reader.attributableExpense, w: 60, cls: 'bg-warning' },
                { label: 'Contribution', value: finance.reader.contribution, w: 40, cls: 'bg-primary' },
              ].map((r) => (
                <div key={r.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono font-medium text-foreground">{fmtEUR(r.value)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-sm bg-muted">
                    <div className={cn('h-full', r.cls)} style={{ width: `${r.w}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-xs leading-relaxed text-muted-foreground">Includes {fmtEUR(finance.reader.hostingAllocation)} of shared hosting (EXP-5510, 60% by policy AP-2), {fmtEUR(2400)} labeling and {fmtEUR(1800)} launch ads. Unsubmitted and held items are excluded.</p>
            </div>
          </Panel>
          <Panel title="Shared cost allocation" description="EXP-5510 · Nimbus Cloud · €1,000">
            <ul className="divide-y divide-border">
              {expenses[0].allocations.map((a) => (
                <li key={a.productId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-foreground">{productName(a.productId)}</span>
                  <span className="font-mono">{fmtEUR(a.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">Allocations must sum to the expense total. Changes are audited.</p>
          </Panel>
        </div>
      )}
    </div>
  )
}

function ExpenseRows({ rows, onSelect, selectedId }: { rows: Expense[]; onSelect: (id: string) => void; selectedId?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Description</th>
            <th className="px-4 py-2 font-medium">Dept</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((x) => (
            <tr key={x.id} onClick={() => onSelect(x.id)} className={cn('cursor-pointer', selectedId === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
              <td className="px-4 py-2.5">
                <button type="button" className="font-mono text-xs" onClick={() => onSelect(x.id)}>
                  {x.id}
                </button>
              </td>
              <td className="px-4 py-2.5 text-foreground">{x.description}</td>
              <td className="px-4 py-2.5">
                <DeptTag id={x.dept} />
              </td>
              <td className={cn('px-4 py-2.5 text-right font-mono', x.status === 'Duplicate — held' && 'text-muted-foreground line-through')}>{fmtEUR(x.amount)}</td>
              <td className="px-4 py-2.5">
                <StatusPill status={x.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExpenseDetail({ e, canManage }: { e: Expense; canManage: boolean }) {
  return (
    <Panel title={e.description} description={`${e.id} · ${e.vendor}`} action={<StatusPill status={e.status} />}>
      <div className="flex flex-col gap-4 p-4">
        <dl className="grid grid-cols-2 gap-4">
          <KV label="Amount">
            <span className="font-mono">{fmtEUR(e.amount)}</span>
          </KV>
          <KV label="Submitted by">
            <PersonLink id={e.submittedBy} />
          </KV>
          <KV label="Source">{e.source}</KV>
          <KV label="Project">{e.projectId ? <IdChip href={`/projects/${e.projectId}`}>{e.projectId}</IdChip> : '—'}</KV>
          {e.recurring && <KV label="Recurring">{e.recurring}</KV>}
        </dl>
        {e.allocations.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Product allocation</span>
            {e.allocations.map((a) => (
              <div key={a.productId} className="flex justify-between text-sm">
                <span className="text-foreground">{productName(a.productId)}</span>
                <span className="font-mono">{fmtEUR(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {e.status === 'Duplicate — held' && <Callout tone="warning" title="Possible duplicate">Same invoice INV-2207 as EXP-5510. Excluded from totals until resolved.</Callout>}
        {e.status === 'Changes requested' && <Callout tone="warning" title="Changes requested by Nina">Attach the itemized hotel invoice.</Callout>}
        {canManage ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {e.status === 'Submitted' && (
              <Button size="sm" onClick={() => toast.success(`${e.id} approved`, { description: 'Added to product contribution.' })}>
                Approve expense
              </Button>
            )}
            {e.status === 'Duplicate — held' && (
              <Button size="sm" variant="outline" onClick={() => toast(`${e.id} voided as duplicate`, { description: 'Audit entry recorded.' })}>
                Void duplicate
              </Button>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden /> Read-only. Approving and voiding needs finance management.
          </p>
        )}
      </div>
    </Panel>
  )
}
