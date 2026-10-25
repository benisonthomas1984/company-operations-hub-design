'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { empById, type ApprovalRound, type Decision } from '@/lib/fixtures'
import { ApprovalProgress, Avatar, Callout, IdChip, KV, Panel, StatusPill, decisionMeta } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

function involves(r: ApprovalRound, id: string) {
  return r.submittedBy === id || r.stages.some((s) => s.decisions.some((d) => d.personId === id))
}

export function Approvals() {
  const params = useSearchParams()
  const { approvals, perspective, decide, can } = useStore()
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [note, setNote] = useState('')

  const visible = approvals.filter((r) => (r.restricted ? involves(r, perspective.id) : tab === 'all' ? can('settings.manage') || involves(r, perspective.id) : involves(r, perspective.id)))
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'))
  const r = visible.find((x) => x.id === selectedId) ?? visible[0]

  const myDecision = r?.stages.flatMap((s) => s.decisions).find((d) => d.personId === perspective.id)
  const isSubmitter = r?.submittedBy === perspective.id
  const awaitingMe = (x: ApprovalRound) => x.stages.some((s) => s.decisions.some((d) => d.personId === perspective.id && d.decision === 'pending'))

  const act = (decision: Decision) => {
    if (!r) return
    decide(r.id, perspective.id, decision, note || undefined)
    setNote('')
    toast.success(`Decision recorded on ${r.id}`, { description: `${decisionMeta[decision].label} · bound to ${r.revision}, round ${r.round}` })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Panel>
        <div className="flex gap-1 border-b border-border p-2" role="tablist" aria-label="Approval scope">
          {(['mine', 'all'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={cn('rounded px-2.5 py-1 text-xs', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
              {t === 'mine' ? 'Involving me' : 'All I can see'}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-border">
          {visible.map((x) => {
            const all = x.stages.flatMap((s) => s.decisions)
            return (
              <li key={x.id}>
                <button type="button" onClick={() => setSelectedId(x.id)} aria-current={r?.id === x.id} className={cn('flex w-full flex-col gap-1.5 px-4 py-3 text-left', r?.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                  <div className="flex items-center gap-2">
                    <IdChip>{x.id}</IdChip>
                    <span className="text-xs text-muted-foreground">{x.itemType}</span>
                    {awaitingMe(x) && <span className="ml-auto rounded-sm bg-warning px-1.5 text-[10px] font-semibold text-primary-foreground">YOUR TURN</span>}
                  </div>
                  <span className="text-sm font-medium text-foreground">{x.restricted ? 'Restricted complaint case' : x.itemTitle}</span>
                  <div className="flex items-center justify-between gap-2">
                    <ApprovalProgress decisions={all} compact />
                    <StatusPill status={x.status} />
                  </div>
                </button>
              </li>
            )
          })}
          {!visible.length && <li className="p-4 text-sm text-muted-foreground">Nothing needs your decision.</li>}
        </ul>
      </Panel>

      {r ? (
        <div className="flex flex-col gap-4">
          <Panel title={r.itemTitle} description={`${r.itemType} ${r.itemId} · ${r.revision} · round ${r.round}`} action={<StatusPill status={r.status} />}>
            <div className="flex flex-col gap-4 p-4">
              <p className="text-sm leading-relaxed text-foreground">{r.summary}</p>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KV label="Submitted by">{empById(r.submittedBy)?.fullName}</KV>
                <KV label="Submitted">{r.submittedAt}</KV>
                <KV label="Workflow version">{r.workflowVersion}</KV>
                <KV label="Rule">Every required approver</KV>
              </dl>
              {r.restricted && <Callout tone="warning" title="Restricted case">Notifications are in-app only. Conflicted members are excluded from this committee.</Callout>}
            </div>
          </Panel>

          {r.stages.map((s) => (
            <Panel key={s.name} title={s.name} description={s.mode === 'Ordered stage' ? 'Ordered: opens after the previous stage is fully approved.' : 'Concurrent: everyone decides in any order. One rejection or change request stops approval.'} action={<ApprovalProgress decisions={s.decisions} />}>
              <ul className="divide-y divide-border">
                {s.decisions.map((d) => {
                  const m = decisionMeta[d.decision]
                  return (
                    <li key={d.personId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Avatar id={d.personId} />
                      <div className="flex min-w-40 flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {empById(d.personId)?.fullName}
                          {d.personId === perspective.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">{empById(d.personId)?.designation}</span>
                      </div>
                      <StatusPill status={m.label} tone={m.tone} />
                      {d.at && <span className="font-mono text-xs text-muted-foreground">{d.at}</span>}
                      {d.note && <p className="w-full rounded-md bg-muted p-2 text-xs text-foreground">{d.note}</p>}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ))}

          <Panel title="Your decision">
            <div className="flex flex-col gap-3 p-4">
              {isSubmitter ? (
                <Callout tone="muted" title="You submitted this item">Self-approval is not allowed. You&apos;ll be notified when all approvers decide.</Callout>
              ) : myDecision?.decision === 'pending' ? (
                <>
                  <label htmlFor="decision-note" className="text-xs font-medium text-muted-foreground">
                    Note (required for changes or rejection)
                  </label>
                  <Textarea id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain your decision" />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => act('approved')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={!note.trim()} onClick={() => act('changes')}>
                      Request changes
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" disabled={!note.trim()} onClick={() => act('rejected')}>
                      Reject
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Your decision is bound to {r.revision}. Material edits start a new round.</p>
                </>
              ) : myDecision?.decision === 'blocked' ? (
                <Callout tone="muted" title="Waiting on an earlier stage">You can decide once the previous stage is fully approved.</Callout>
              ) : myDecision ? (
                <Callout tone="success" title={`You decided: ${decisionMeta[myDecision.decision].label}`}>Recorded {myDecision.at}. Decisions are immutable; history is kept.</Callout>
              ) : (
                <p className="text-sm text-muted-foreground">You are not an approver on this round.</p>
              )}
              {r.status === 'Blocked — approver inactive' && can('settings.manage') && (
                <Button size="sm" variant="outline" className="self-start" onClick={() => toast('Replacement flow', { description: 'Pick an eligible replacement and record a reason. The required count stays the same.' })}>
                  Replace inactive approver
                </Button>
              )}
            </div>
          </Panel>

          {r.priorRounds && (
            <Panel title="Earlier rounds">
              <ul className="divide-y divide-border">
                {r.priorRounds.map((p) => (
                  <li key={p.round} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">Round {p.round}</span>
                      <span className="text-muted-foreground">{p.revision}</span>
                      <StatusPill status={p.status} className="ml-auto" />
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{p.note}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      ) : (
        <Panel title="No approval selected">
          <p className="p-4 text-sm text-muted-foreground">Nothing to show for this perspective.</p>
        </Panel>
      )}
    </div>
  )
}
