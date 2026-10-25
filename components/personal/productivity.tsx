'use client'

import Link from 'next/link'
import { useStore } from '@/lib/store'
import { Callout, IdChip, Panel, StatusPill } from '@/components/hub/primitives'

const TODAY = '2026-10-25'

export function Productivity() {
  const { perspective, activities, approvals } = useStore()
  const mine = activities.filter((a) => a.ownerId === perspective.id)
  const open = mine.filter((a) => !['Accepted', 'Cancelled'].includes(a.status))
  const accepted = mine.filter((a) => a.status === 'Accepted')
  const late = open.filter((a) => (a.revisedDue ?? a.originalDue) < TODAY)
  const revised = mine.filter((a) => a.revisedDue)
  const pendingDecisions = approvals.filter(
    (r) => r.status === 'Pending' && r.stages.some((s) => s.decisions.some((d) => d.personId === perspective.id && d.decision === 'pending')),
  )

  const facts = [
    { label: 'Open activities', value: open.length },
    { label: 'Accepted', value: accepted.length },
    { label: 'Past due', value: late.length },
    { label: 'Due date revised', value: revised.length },
    { label: 'Decisions waiting on you', value: pendingDecisions.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="muted" title="Private to you">
        These are factual counts from your own records, not a score. Managers see delivery on shared work, never this page.
      </Callout>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="font-mono text-2xl font-semibold text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="My open work">
          <ul className="divide-y divide-border">
            {open.map((a) => (
              <li key={a.id}>
                <Link href={`/activities?id=${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                  <IdChip>{a.id}</IdChip>
                  <span className="flex-1 truncate text-sm text-foreground">{a.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{a.revisedDue ?? a.originalDue}</span>
                  <StatusPill status={a.status} />
                </Link>
              </li>
            ))}
            {!open.length && <li className="px-4 py-3 text-sm text-muted-foreground">Nothing open. Switch to Ana Ribeiro or Noor Haddad to see a fuller example.</li>}
          </ul>
        </Panel>
        <Panel title="Revision history" description="Original dates are kept; revisions carry a reason.">
          <ul className="divide-y divide-border">
            {revised.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm">
                  <IdChip>{a.id}</IdChip>
                  <span className="font-mono text-xs text-muted-foreground line-through">{a.originalDue}</span>
                  <span className="font-mono text-xs text-foreground">{a.revisedDue}</span>
                </span>
                {a.revisionReason && <span className="text-xs text-muted-foreground">{a.revisionReason}</span>}
              </li>
            ))}
            {!revised.length && <li className="px-4 py-3 text-sm text-muted-foreground">No revised due dates.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
