'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { backlog, businessProducts } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { ApprovalProgress, DeptTag, IdChip, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'
import { cn } from '@/lib/utils'

export function Backlog() {
  const params = useSearchParams()
  const { approvals } = useStore()
  const [sel, setSel] = useState(params.get('id') ?? 'BLI-88')
  const b = backlog.find((x) => x.id === sel) ?? backlog[0]
  const round = approvals.find((r) => r.id === b.approvalId)
  const releases = Array.from(new Set(backlog.map((x) => x.targetPeriod)))

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-4">
        {releases.map((rel) => (
          <Panel key={rel} title={rel}>
            <ul className="divide-y divide-border">
              {backlog
                .filter((x) => x.targetPeriod === rel)
                .map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setSel(x.id)} aria-current={b.id === x.id} className={cn('flex w-full flex-col gap-1 px-4 py-2.5 text-left', b.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                      <span className="flex items-center gap-2">
                        <IdChip>{x.id}</IdChip>
                        <span className="truncate text-sm font-medium text-foreground">{x.title}</span>
                      </span>
                      <StatusPill status={x.status} className="self-start" />
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Panel title={b.title} description={`${b.id} · ${businessProducts.find((p) => p.business_product_service_id === b.productId)?.name}`} action={<StatusPill status={b.status} />}>
          <div className="flex flex-col gap-4 p-4">
            <p className="text-sm leading-relaxed text-foreground">{b.benefit}</p>
            <dl className="grid gap-4 md:grid-cols-3">
              <KV label="Owner">
                <PersonLink id={b.ownerId} />
              </KV>
              <KV label="Target">{b.targetPeriod}</KV>
              <KV label="Origin">{b.originProposalId ? <IdChip href="/proposals">{b.originProposalId}</IdChip> : 'Direct entry'}</KV>
              <KV label="Teams">
                <span className="flex flex-wrap gap-2">
                  {b.teams.map((t) => (
                    <DeptTag key={t} id={t} />
                  ))}
                </span>
              </KV>
              <KV label="Projects">
                <span className="flex gap-1">
                  {b.projectIds.map((p) => (
                    <IdChip key={p} href={`/projects/${p}`}>
                      {p}
                    </IdChip>
                  ))}
                  {!b.projectIds.length && '—'}
                </span>
              </KV>
            </dl>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Acceptance criteria</span>
              <ul className="flex flex-col gap-1 text-sm text-foreground">
                {b.criteria.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
        {round && (
          <Panel title="Execution approval" description={`${round.id} · ${round.workflowVersion}`}>
            <ul className="divide-y divide-border">
              {round.stages.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-sm text-foreground">{s.name}</span>
                  <ApprovalProgress decisions={s.decisions} compact />
                </li>
              ))}
            </ul>
            <Link href={`/approvals?id=${round.id}`} className="border-t border-border px-4 py-2.5 text-sm font-medium text-info hover:underline">
              Open approval
            </Link>
          </Panel>
        )}
        <Panel title="Delivery activities">
          <ActivityTable filter={(a) => a.backlogId === b.id} caption={`Activities for ${b.id}`} />
        </Panel>
      </div>
    </div>
  )
}
