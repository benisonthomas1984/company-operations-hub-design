'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { empById, type ActivityStatus } from '@/lib/fixtures'
import { Callout, IdChip, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable, DueCell } from './activity-table'

const filters: { id: string; label: string; test: (s: ActivityStatus) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'open', label: 'Open', test: (s) => ['Not started', 'In progress', 'Blocked', 'Reopened'].includes(s) },
  { id: 'review', label: 'Awaiting review', test: (s) => s === 'Submitted' },
  { id: 'done', label: 'Accepted', test: (s) => s === 'Accepted' },
  { id: 'cancelled', label: 'Cancelled', test: (s) => s === 'Cancelled' },
]

export function ActivitiesWorkspace() {
  const params = useSearchParams()
  const { activities, perspective, updateActivity } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id') ?? 'ACT-1042')
  const [filter, setFilter] = useState('all')
  const [mine, setMine] = useState(false)
  const [note, setNote] = useState('')
  const a = activities.find((x) => x.id === selectedId)
  const f = filters.find((x) => x.id === filter)!

  const isReviewer = a?.reviewerId === perspective.id
  const isOwner = a?.ownerId === perspective.id
  const dep = a?.dependsOn ? activities.find((x) => x.id === a.dependsOn) : null

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Panel
        title="Activities"
        action={
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine
          </label>
        }
      >
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2" role="group" aria-label="Status filter">
          {filters.map((x) => (
            <button key={x.id} type="button" aria-pressed={filter === x.id} onClick={() => setFilter(x.id)} className={`rounded px-2 py-1 text-xs ${filter === x.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              {x.label}
            </button>
          ))}
        </div>
        <ActivityTable caption="All activities" filter={(x) => f.test(x.status) && (!mine || x.ownerId === perspective.id || x.reviewerId === perspective.id)} onSelect={setSelectedId} selectedId={selectedId} />
      </Panel>

      {a ? (
        <Panel title={a.title} description={`${a.id} · revision ${a.revision}`}>
          <div className="flex flex-col gap-4 p-4">
            <StatusPill status={a.status === 'Submitted' ? 'Submitted · awaiting acceptance' : a.status} className="self-start" />
            <dl className="grid grid-cols-2 gap-4">
              <KV label="Owner">
                <PersonLink id={a.ownerId} />
              </KV>
              <KV label="Reviewer">
                <PersonLink id={a.reviewerId} />
              </KV>
              <KV label="Due">
                <DueCell a={a} />
              </KV>
              <KV label="Context">
                <span className="flex flex-wrap gap-1">
                  {a.projectId && <IdChip href={`/projects/${a.projectId}`}>{a.projectId}</IdChip>}
                  {a.backlogId && <IdChip href={`/backlog?id=${a.backlogId}`}>{a.backlogId}</IdChip>}
                  {!a.projectId && <span className="text-xs text-muted-foreground">Department work</span>}
                </span>
              </KV>
            </dl>
            {a.revisionReason && (
              <Callout tone="muted" title="Due date revised">
                {a.revisionReason}. Original date kept for history.
              </Callout>
            )}
            {a.blocker && <Callout tone="danger" title="Blocked">{a.blocker}</Callout>}
            {dep && (
              <p className="text-sm text-muted-foreground">
                Depends on{' '}
                <button type="button" className="font-mono text-foreground hover:underline" onClick={() => setSelectedId(dep.id)}>
                  {dep.id}
                </button>{' '}
                — <StatusPill status={dep.status} />
              </p>
            )}
            {a.evidence && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Evidence</span>
                <p className="rounded-md border border-border bg-background p-2.5 text-sm text-foreground">{a.evidence}</p>
              </div>
            )}

            {a.status === 'Submitted' && isReviewer && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <label htmlFor="review-note" className="text-xs font-medium text-muted-foreground">
                  Review note (required to reopen)
                </label>
                <Textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs to change?" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateActivity(a.id, { status: 'Accepted' })
                      toast.success(`${a.id} accepted`, { description: 'Counts toward Ana’s accepted work. Visible in project, profile and dossier.' })
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!note.trim()}
                    onClick={() => {
                      updateActivity(a.id, { status: 'Reopened', evidence: `Reopened: ${note}` })
                      setNote('')
                      toast(`${a.id} reopened`, { description: 'Owner notified with your note.' })
                    }}
                  >
                    Reopen
                  </Button>
                </div>
              </div>
            )}
            {a.status === 'Submitted' && isOwner && <Callout tone="info" title="Awaiting acceptance">{empById(a.reviewerId)?.fullName} reviews this. You can&apos;t accept your own work.</Callout>}
            {(a.status === 'In progress' || a.status === 'Reopened') && isOwner && (
              <div className="flex gap-2 border-t border-border pt-4">
                <Button size="sm" onClick={() => { updateActivity(a.id, { status: 'Submitted' }); toast.success(`${a.id} submitted for review`) }}>
                  Submit for review
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast('Due-date revision requested', { description: 'Sent to project manager. Original date is preserved.' })}>
                  Request date change
                </Button>
              </div>
            )}
            {!isOwner && !isReviewer && <p className="text-xs text-muted-foreground">Read-only for your role. Owner submits; reviewer accepts or reopens.</p>}
            <Link href={`/employees/${a.ownerId}`} className="text-sm font-medium text-info hover:underline">
              Open owner profile
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel title="No activity selected">
          <p className="p-4 text-sm text-muted-foreground">Select an activity to see evidence, dependencies and review actions.</p>
        </Panel>
      )}
    </div>
  )
}
