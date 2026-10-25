'use client'

import Link from 'next/link'
import { fmtEUR, PERIOD, tickets } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { productFinance, productOf } from '@/lib/derive'
import { Callout, IdChip, KV, Panel, PersonLink, SourceChip, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'

export function ProductList() {
  const { company: c } = useHub()
  if (!c.products.length) return <StateBlock title="No products or services yet" body="Approved proposals can be converted into a product, or add them during onboarding." />
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {c.products.map((b) => (
        <Link key={b.id} href={`/products/${b.id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 hover:border-ring">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{b.kind}</span>
            <StatusPill status={b.lifecycle} />
          </div>
          <h2 className="text-base font-semibold text-foreground">{b.name}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
          <span className="text-xs text-muted-foreground">
            {b.clients.length} clients · {b.activeUsers.toLocaleString()} active users
          </span>
        </Link>
      ))}
    </div>
  )
}

export function ProductDetailPage({ id }: { id: string }) {
  const { company: c } = useHub()
  const b = productOf(c, id)
  return (
    <Page title={b?.name ?? 'Product'} description={b?.description} crumbs={[{ label: 'Products & Services', href: '/products' }]}>
      <ProductDetail id={id} />
    </Page>
  )
}

export function ProductDetail({ id }: { id: string }) {
  const { company: c, can } = useHub()
  const b = productOf(c, id)
  if (!b) return <Callout tone="danger" title="Not found">This product or service isn&apos;t in {c.name}.</Callout>
  const items = c.backlog.filter((x) => x.productId === id)
  const prjs = c.projects.filter((p) => p.productIds.includes(id))
  const rels = c.releases.filter((r) => r.productId === id)
  const tix = tickets.filter((t) => t.product === id)
  const fin = productFinance(c, id)

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Panel title="Backlog" action={<Link href={`/backlog?product=${id}`} className="text-xs font-medium text-info hover:underline">Open backlog</Link>}>
          <ul className="divide-y divide-border">
            {items.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <IdChip href={`/backlog?id=${x.id}`}>{x.id}</IdChip>
                <span className="font-medium text-foreground">{x.title}</span>
                <span className="text-xs text-muted-foreground">{x.committedTarget ?? x.proposedTarget}</span>
                <StatusPill status={x.status} className="ml-auto" />
              </li>
            ))}
            {!items.length && <li className="px-4 py-3 text-sm text-muted-foreground">No backlog items.</li>}
          </ul>
        </Panel>
        <Panel title="Releases">
          <ul className="divide-y divide-border">
            {rels.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <IdChip>{r.id}</IdChip>
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">target {r.target} · {r.backlogIds.length} items</span>
                <StatusPill status={r.status} className="ml-auto" />
              </li>
            ))}
            {!rels.length && <li className="px-4 py-3 text-sm text-muted-foreground">No releases planned.</li>}
          </ul>
        </Panel>
        <Panel title="Clients" description={b.clientDefinition}>
          <ul className="divide-y divide-border">
            {b.clients.map((cl) => (
              <li key={cl.name} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="font-medium text-foreground">{cl.name}</span>
                <span className="text-xs text-muted-foreground">{cl.plan} · {cl.seats} seats · since {cl.since}</span>
                {can('finance.read') && <span className="ml-auto font-mono text-xs">{fmtEUR(cl.mrr)}/mo</span>}
              </li>
            ))}
            {!b.clients.length && <li className="px-4 py-3 text-sm text-muted-foreground">No clients recorded.</li>}
          </ul>
        </Panel>
        <Panel title="Support tickets" description="Read-only from the help desk connector." action={<SourceChip label="Help desk" freshness="simulated" state="sim" />}>
          <ul className="divide-y divide-border">
            {tix.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <IdChip>{t.id}</IdChip>
                <span className="text-foreground">{t.subject}</span>
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
            <KV label="Owner"><PersonLink id={b.ownerId} showRole /></KV>
            <KV label="Lifecycle">{b.lifecycle}</KV>
            <KV label="Target customers">{b.targetCustomers}</KV>
            <KV label="Projects">
              {prjs.length ? prjs.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="block hover:underline">{p.name}</Link>) : '—'}
            </KV>
          </dl>
        </Panel>
        <Panel title={`Profit · ${PERIOD.label}`}>
          {!can('finance.read') ? (
            <p className="p-4 text-sm text-muted-foreground">Financial figures require finance access.</p>
          ) : !fin.hasRevenue && !fin.totalExpense ? (
            <p className="p-4 text-sm text-muted-foreground">No revenue or allocated costs recorded this period.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 p-4">
              <KV label="Revenue recognized"><span className="font-mono">{fmtEUR(fin.recognized)}</span></KV>
              <KV label="Cost of delivery"><span className="font-mono">{fmtEUR(fin.costOfDelivery)}</span></KV>
              <KV label="Operating cost"><span className="font-mono">{fmtEUR(fin.opex)}</span></KV>
              <KV label="Operating profit"><span className="font-mono font-semibold">{fmtEUR(fin.operatingProfit)}</span></KV>
              {fin.pending.length > 0 && <p className="col-span-2 text-xs text-muted-foreground">{fin.pending.length} pending expense(s) excluded until approved.</p>}
              <Link href={`/finance?product=${id}`} className="col-span-2 text-xs font-medium text-info hover:underline">Open in Finance</Link>
            </dl>
          )}
        </Panel>
      </div>
    </div>
  )
}
