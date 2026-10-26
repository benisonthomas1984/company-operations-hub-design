'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { connectorProviders, packages, type ConnectorProvider, type SourceKind } from '@/lib/fixtures'
import { connectorsOf, sourceOf } from '@/lib/derive'
import { Field, Select, TextInput } from '@/components/hub/form'
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
      <McpConnectors />
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

const kindLabel: Record<SourceKind, string> = { clients: 'Clients', tickets: 'Tickets', revenue: 'Revenue' }

function McpConnectors() {
  const { company: c, mutate } = useHub()
  const list = connectorsOf(c)
  const [provider, setProvider] = useState<ConnectorProvider>('Zendesk')
  const preset = connectorProviders.find((p) => p.provider === provider)!
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [types, setTypes] = useState<SourceKind[]>(preset.dataTypes)

  const pickProvider = (p: ConnectorProvider) => {
    const next = connectorProviders.find((x) => x.provider === p)!
    setProvider(p)
    setUrl(next.url)
    setTypes(next.dataTypes)
  }

  const add = () => {
    const finalUrl = (url || preset.url).trim()
    if (!/^https:\/\//.test(finalUrl)) return toast.error('Enter the MCP server URL (https://…)')
    if (!types.length) return toast.error('Choose at least one data type this connector provides')
    mutate((co, { id, now, audit, me }) => {
      const cid = id('mcp').toLowerCase()
      co.connectors = [...connectorsOf(co), { id: cid, name: name.trim() || provider, provider, url: finalUrl, dataTypes: types, status: 'Connected', addedBy: me.id, at: now }]
      audit('Added MCP connector', cid, provider)
    })
    toast.success(`${name.trim() || provider} connected`, { description: 'Pick it per product under Products → Data sources.' })
    setName('')
  }

  const toggle = (cid: string) =>
    mutate((co) => {
      co.connectors = connectorsOf(co).map((x) => (x.id === cid ? { ...x, status: x.status === 'Connected' ? 'Disconnected' : 'Connected' } : x))
    })

  return (
    <Panel title="MCP connectors" description="Where product data comes from — clients, support tickets and revenue. Each product chooses its source per data type." action={<SimLabel>Connections simulated</SimLabel>}>
      <ul className="flex flex-col divide-y divide-border">
        {list.map((x) => {
          const used = c.products.filter((p) => (['clients', 'tickets', 'revenue'] as SourceKind[]).some((k) => sourceOf(c, p, k).link.connectorId === x.id))
          return (
            <li key={x.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-foreground">{x.name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{x.url}</span>
              </span>
              <span className="flex flex-wrap gap-1">
                {x.dataTypes.map((t) => (
                  <span key={t} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{kindLabel[t]}</span>
                ))}
              </span>
              <span className="text-xs text-muted-foreground">used by {used.length ? used.map((p) => p.name).join(', ') : 'no products'}</span>
              <span className="ml-auto flex items-center gap-2">
                <StatusPill status={x.status} tone={x.status === 'Connected' ? 'success' : 'danger'} />
                <Button size="sm" variant="ghost" onClick={() => toggle(x.id)}>{x.status === 'Connected' ? 'Disconnect' : 'Reconnect'}</Button>
              </span>
            </li>
          )
        })}
      </ul>
      <form noValidate onSubmit={(e) => (e.preventDefault(), add())} className="grid gap-3 border-t border-border p-4 md:grid-cols-[1fr_1fr_1.5fr] md:items-end">
        <Field label="Provider">
          <Select options={connectorProviders.map((p) => ({ value: p.provider, label: p.provider }))} value={provider} onChange={(e) => pickProvider(e.target.value as ConnectorProvider)} />
        </Field>
        <Field label="Display name">
          <TextInput placeholder={provider} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="MCP server URL">
          <TextInput placeholder={preset.url || 'https://your-mcp-server.example'} value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <fieldset className="flex flex-wrap items-center gap-3 md:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-foreground">Provides</legend>
          {(['clients', 'tickets', 'revenue'] as SourceKind[]).map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={types.includes(t)} onChange={(e) => setTypes((p) => (e.target.checked ? [...p, t] : p.filter((x) => x !== t)))} />
              {kindLabel[t]}
            </label>
          ))}
        </fieldset>
        <Button type="submit" size="sm" className="justify-self-end">Add connector</Button>
      </form>
    </Panel>
  )
}

export { Subscription as Integrations }
