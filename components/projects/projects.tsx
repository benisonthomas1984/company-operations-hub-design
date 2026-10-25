'use client'

import Link from 'next/link'
import { backlog, businessProducts, decisions, documents, meetings, projects, expenses, fmtEUR } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Avatar, Callout, IdChip, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'

export function ProjectList() {
  const { activities } = useStore()
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => {
        const acts = activities.filter((a) => a.projectId === p.id && a.status !== 'Cancelled')
        const done = acts.filter((a) => a.status === 'Accepted').length
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 hover:border-ring">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <IdChip>{p.id}</IdChip>
                <h2 className="text-base font-semibold text-foreground">{p.name}</h2>
              </div>
              <StatusPill status={p.health} />
            </div>
            <p className="text-sm text-muted-foreground">{p.stage}</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Accepted activities</span>
                <span className="font-mono text-foreground">
                  {done}/{acts.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${acts.length ? (done / acts.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-1.5">
                {p.memberIds.slice(0, 5).map((m) => (
                  <Avatar key={m} id={m} size="sm" className="ring-2 ring-card" />
                ))}
              </div>
              <span className="font-mono text-xs text-muted-foreground">target {p.target}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function ProjectDetail({ id }: { id: string }) {
  const { can, approvals } = useStore()
  const p = projects.find((x) => x.id === id)
  if (!p) return <Callout tone="danger" title="Project not found">It may belong to another company or you lack access.</Callout>
  const items = backlog.filter((b) => p.backlogIds.includes(b.id))
  const docs = documents.filter((d) => d.context === id)
  const decs = decisions.filter((d) => d.context === id)
  const mtgs = meetings.filter((m) => m.context === id)
  const spend = expenses.filter((e) => e.projectId === id)
  const gate = approvals.find((r) => items.some((b) => b.approvalId === r.id))

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Panel title="Activities" description="Same records as in profiles and the Activities workspace.">
          <ActivityTable filter={(a) => a.projectId === id} caption={`Activities in ${p.name}`} />
        </Panel>
        <Panel title="Linked backlog">
          <ul className="divide-y divide-border">
            {items.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <IdChip href={`/backlog?id=${b.id}`}>{b.id}</IdChip>
                <span className="font-medium text-foreground">{b.title}</span>
                <StatusPill status={b.status} className="ml-auto" />
              </li>
            ))}
          </ul>
        </Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Decisions">
            <ul className="divide-y divide-border">
              {decs.map((d) => (
                <li key={d.id} className="flex flex-col gap-0.5 px-4 py-2.5">
                  <span className="text-sm text-foreground">{d.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.id} · {d.at} · from {d.source}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Documents">
            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="truncate text-foreground">{d.name}</span>
                  <StatusPill status={d.state} className="ml-auto" />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Overview">
          <dl className="grid grid-cols-2 gap-4 p-4">
            <KV label="Project manager">
              <PersonLink id={p.pmId} />
            </KV>
            <KV label="Sponsor">
              <PersonLink id={p.sponsorId} />
            </KV>
            <KV label="Stage">{p.stage}</KV>
            <KV label="Target">
              <span className="font-mono">{p.target}</span>
            </KV>
            <KV label="Products">
              {p.productIds.map((pid) => (
                <Link key={pid} href={`/products/${pid}`} className="block hover:underline">
                  {businessProducts.find((b) => b.business_product_service_id === pid)?.name}
                </Link>
              ))}
            </KV>
            <KV label="Health">
              <StatusPill status={p.health} />
            </KV>
          </dl>
        </Panel>
        {gate && (
          <Panel title="Stage gate">
            <div className="flex flex-col gap-2 p-4 text-sm">
              <Link href={`/approvals?id=${gate.id}`} className="font-medium text-foreground hover:underline">
                {gate.id} · {gate.itemTitle}
              </Link>
              <StatusPill status={gate.status} className="self-start" />
              <p className="text-xs text-muted-foreground">{gate.summary}</p>
            </div>
          </Panel>
        )}
        <Panel title="Meetings">
          <ul className="divide-y divide-border">
            {mtgs.map((m) => (
              <li key={m.id} className="flex flex-col gap-0.5 px-4 py-2.5">
                <span className="text-sm text-foreground">{m.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.when}</span>
              </li>
            ))}
            {!mtgs.length && <li className="px-4 py-3 text-sm text-muted-foreground">No meetings scheduled.</li>}
          </ul>
        </Panel>
        <Panel title="Project spend" description={can('finance.read') ? 'Approved and submitted expenses tagged to this project.' : undefined}>
          {can('finance.read') ? (
            <ul className="divide-y divide-border">
              {spend.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <IdChip>{e.id}</IdChip>
                  <span className="truncate text-foreground">{e.description}</span>
                  <span className="ml-auto font-mono">{fmtEUR(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Financial details require finance authorization.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
