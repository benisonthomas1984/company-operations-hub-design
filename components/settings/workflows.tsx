'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { AdminGate } from './admin-gate'
import { Avatar, Callout, IdChip, Panel, StatusPill } from '@/components/hub/primitives'

export function Workflows() {
  const { approvals } = useStore()
  const byVersion = new Map<string, typeof approvals>()
  approvals.forEach((r) => byVersion.set(r.workflowVersion, [...(byVersion.get(r.workflowVersion) ?? []), r]))

  return (
    <AdminGate>
      <div className="flex flex-col gap-4">
        <Callout tone="info" title="Versioned workflows">
          Publishing a new committee version applies to new rounds only. In-flight rounds keep the version they started with.
        </Callout>
        <div className="grid gap-4 lg:grid-cols-2">
          {[...byVersion.entries()].map(([version, rounds]) => {
            const template = rounds[0]
            const restricted = rounds.some((r) => r.restricted)
            return (
              <Panel
                key={version}
                title={version}
                description={restricted ? 'Restricted committee · conflicted members auto-excluded' : `Used by ${rounds.length} round${rounds.length > 1 ? 's' : ''}`}
                action={
                  <Button size="sm" variant="outline" onClick={() => toast(`Draft created from ${version}`, { description: 'Publish to apply to new rounds.' })}>
                    New version
                  </Button>
                }
              >
                <ol className="flex flex-col gap-3 p-4">
                  {template.stages.map((s, i) => (
                    <li key={s.name} className="flex flex-col gap-2 rounded-md border border-border p-3">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          Stage {i + 1} · {s.name}
                        </span>
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{s.mode}</span>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {restricted ? (
                          <span className="text-xs text-muted-foreground">{s.decisions.length} members · names hidden</span>
                        ) : (
                          s.decisions.map((d) => <Avatar key={d.personId} id={d.personId} />)
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
                <ul className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                  {rounds.map((r) => (
                    <li key={r.id}>
                      <Link href={`/approvals?id=${r.id}`} className="flex items-center gap-1.5">
                        <IdChip>{r.id}</IdChip>
                        <StatusPill status={r.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )
          })}
        </div>
      </div>
    </AdminGate>
  )
}
