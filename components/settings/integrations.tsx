'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { packages } from '@/lib/fixtures'
import { AdminGate } from './admin-gate'
import { Callout, KV, Panel, SimLabel, StatusPill } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

const connectors = [
  { id: 'mail', name: 'Company mail (IMAP)', scope: 'Per-person, read-only, private' },
  { id: 'support', name: 'Support desk', scope: 'Read-only tickets for products' },
  { id: 'billing', name: 'Billing provider', scope: 'Read-only revenue for finance' },
]

export function Subscription() {
  return (
    <AdminGate>
      <SubscriptionInner />
    </AdminGate>
  )
}

function SubscriptionInner() {
  const { company: c, mutate } = useHub()
  const pkg = packages.find((p) => p.id === c.packageId) ?? packages[0]
  const seats = c.employees.filter((e) => e.status === 'active' || e.status === 'invited').length
  const pct = Math.min(100, Math.round((c.credits.used / c.credits.limit) * 100))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Subscription" action={<SimLabel>Billing simulated</SimLabel>}>
          <dl className="grid grid-cols-2 gap-4 p-4">
            <KV label="Package">{pkg.name}</KV>
            <KV label="Price">€{pkg.price} / {pkg.interval}</KV>
            <KV label="Seats used">
              {seats} of {pkg.employees}
            </KV>
            <KV label="Status">
              <StatusPill status="Active" />
            </KV>
          </dl>
        </Panel>
        <Panel title="AI credits" description="Used by the Intelligence Dossier and proposal analysis.">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl text-foreground">{(c.credits.limit - c.credits.used).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">
                remaining of {c.credits.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI credits used">
              <div className={cn('h-full', pct > 90 ? 'bg-destructive' : 'bg-primary')} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  mutate((co, { audit }) => ((co.credits.limit += 1000), audit('Purchased AI credits', 'credits', '+1,000')))
                  toast.success('1,000 credits added (simulated)')
                }}
              >
                Add 1,000 credits
              </Button>
              <Button size="sm" variant="ghost" onClick={() => mutate((co) => void (co.credits.used = co.credits.limit))}>
                Simulate exhaustion
              </Button>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Read-only connectors" description="Connectors never write back to source systems.">
        <ul className="flex flex-col divide-y divide-border">
          {connectors.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{x.name}</span>
                <span className="text-xs text-muted-foreground">{x.scope}</span>
              </span>
              <StatusPill status="Connected · simulated" tone="success" />
            </li>
          ))}
        </ul>
      </Panel>
      <Callout tone="muted" title="Prototype">Payments and connectors are simulated. No card is charged and no external system is contacted.</Callout>
    </div>
  )
}

export { Subscription as Integrations }
