'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import { AdminGate } from './admin-gate'
import { KV, Panel, SourceChip } from '@/components/hub/primitives'

const connectors = [
  { name: 'Central directory', purpose: 'Employees, departments, reporting lines', freshness: '5 min ago', state: 'ok' as const },
  { name: 'Bank feed', purpose: 'Expenses and vendor invoices', freshness: '1h ago', state: 'ok' as const },
  { name: 'Revenue feed', purpose: 'Product revenue (Orion Receipt Reader)', freshness: '26h ago', state: 'stale' as const },
  { name: 'Mail connector', purpose: 'Owner-only mailbox sync (read-only)', freshness: '2 min ago', state: 'ok' as const },
  { name: 'Video meetings', purpose: 'Meeting links and guest invites', freshness: 'not connected', state: 'sim' as const },
]

export function Integrations() {
  const { aiCreditsUsed, aiCreditsLimit, setAiExhausted } = useStore()
  const pct = Math.min(100, Math.round((aiCreditsUsed / aiCreditsLimit) * 100))
  const exhausted = aiCreditsUsed >= aiCreditsLimit

  return (
    <AdminGate>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Connectors" description="Each source shows freshness. Stale data is labeled wherever it appears.">
          <ul className="divide-y divide-border">
            {connectors.map((c) => (
              <li key={c.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.purpose}</span>
                </span>
                <SourceChip label={c.state === 'ok' ? 'Healthy' : c.state === 'stale' ? 'Stale' : 'Simulated'} freshness={c.freshness} state={c.state} />
                {c.state === 'stale' && (
                  <Button size="sm" variant="outline" onClick={() => toast('Refresh requested', { description: `${c.name} will retry now.` })}>
                    Retry
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Subscription">
            <dl className="grid grid-cols-2 gap-4 p-4">
              <KV label="Plan">Team · annual</KV>
              <KV label="Seats">14 of 20</KV>
              <KV label="Renews">2027-03-01</KV>
              <KV label="Billing contact">Maya Okafor</KV>
            </dl>
          </Panel>
          <Panel title="AI credits" description="Shared company pool. Duplicate requests are not charged twice.">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-foreground">
                  {aiCreditsUsed}
                  <span className="text-sm text-muted-foreground"> / {aiCreditsLimit}</span>
                </span>
                <span className="text-xs text-muted-foreground">{pct}% used</span>
              </div>
              <div className="h-2 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI credits used">
                <div className={exhausted ? 'h-full bg-destructive' : 'h-full bg-primary'} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <Label htmlFor="exhaust" className="text-xs font-normal text-muted-foreground">
                  Simulate exhausted pool (design review)
                </Label>
                <Switch id="exhaust" checked={exhausted} onCheckedChange={setAiExhausted} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AdminGate>
  )
}
