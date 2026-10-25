'use client'

import Link from 'next/link'
import { backlog, businessProducts, finance, fmtEUR, projects, tickets } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Callout, IdChip, KV, Panel, PersonLink, SourceChip, StatusPill } from '@/components/hub/primitives'

export function ProductList() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {businessProducts.map((b) => (
        <Link key={b.business_product_service_id} href={`/products/${b.business_product_service_id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 hover:border-ring">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{b.kind}</span>
            <StatusPill status={b.stage} />
          </div>
          <h2 className="text-base font-semibold text-foreground">{b.name}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{b.summary}</p>
          <span className="font-mono text-[11px] text-muted-foreground">{b.business_product_service_id}</span>
        </Link>
      ))}
    </div>
  )
}

export function ProductDetail({ id }: { id: string }) {
  const { can } = useStore()
  const b = businessProducts.find((x) => x.business_product_service_id === id)
  if (!b) return <Callout tone="danger" title="Not found">This product or service isn&apos;t in Comet Works.</Callout>
  const items = backlog.filter((x) => x.productId === id)
  const prjs = projects.filter((p) => p.productIds.includes(id))
  const tix = tickets.filter((t) => t.product === id)
  const isReader = id === 'bps_orion_reader'

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Panel title="Backlog">
          <ul className="divide-y divide-border">
            {items.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <IdChip href={`/backlog?id=${x.id}`}>{x.id}</IdChip>
                <span className="font-medium text-foreground">{x.title}</span>
                <span className="text-xs text-muted-foreground">{x.targetPeriod}</span>
                <StatusPill status={x.status} className="ml-auto" />
              </li>
            ))}
            {!items.length && <li className="px-4 py-3 text-sm text-muted-foreground">No backlog items.</li>}
          </ul>
        </Panel>
        <Panel title="Support tickets" description="Read-only from the help desk connector." action={<SourceChip label="Help desk" freshness="4 min ago" />}>
          <ul className="divide-y divide-border">
            {tix.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <IdChip>{t.id}</IdChip>
                <span className="text-foreground">{t.subject}</span>
                <span className="text-xs text-muted-foreground">{t.priority}</span>
                <StatusPill status={t.status} className="ml-auto" />
              </li>
            ))}
            {!tix.length && <li className="px-4 py-3 text-sm text-muted-foreground">No tickets for this item.</li>}
          </ul>
        </Panel>
      </div>
      <div className="flex flex-col gap-4">
        <Panel title="Overview">
          <dl className="grid gap-4 p-4">
            <KV label="Owner">
              <PersonLink id={b.ownerId} showRole />
            </KV>
            <KV label="Stage">{b.stage}</KV>
            <KV label="Projects">
              {prjs.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block hover:underline">
                  {p.id} · {p.name}
                </Link>
              ))}
            </KV>
            <KV label="Canonical ID">
              <span className="font-mono text-xs">{b.business_product_service_id}</span>
            </KV>
          </dl>
        </Panel>
        <Panel title={`Contribution · ${finance.period}`}>
          {!can('finance.read') ? (
            <p className="p-4 text-sm text-muted-foreground">Financial figures require finance authorization.</p>
          ) : isReader ? (
            <dl className="grid grid-cols-2 gap-4 p-4">
              <KV label="Revenue">
                <span className="font-mono">{fmtEUR(finance.reader.revenue)}</span>
              </KV>
              <KV label="Attributable expense">
                <span className="font-mono">{fmtEUR(finance.reader.attributableExpense)}</span>
              </KV>
              <KV label="Contribution">
                <span className="font-mono font-semibold">{fmtEUR(finance.reader.contribution)}</span>
              </KV>
              <KV label="Shared hosting share">
                <span className="font-mono">{fmtEUR(finance.reader.hostingAllocation)}</span>
              </KV>
              <p className="col-span-2 text-xs text-muted-foreground">Provisional — revenue feed is stale (26h). Not profit.</p>
            </dl>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Revenue mapping not yet configured for this item.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
