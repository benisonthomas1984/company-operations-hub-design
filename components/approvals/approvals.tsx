'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import type { ApprovalRound } from '@/lib/fixtures'
import { empOf, sourceHref } from '@/lib/derive'
import { ApprovalProgress, Callout, IdChip, KV, Panel, PersonLink, StatusPill, decisionMeta } from '@/components/hub/primitives'
import { Field, TabBar, TextArea, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { ProposalDetails } from '@/components/company/proposal-report'
import { cn } from '@/lib/utils'

const mine = (r: ApprovalRound, id: string) => r.stages.some((s) => s.decisions.some((d) => d.personId === id))
const myPending = (r: ApprovalRound, id: string) => r.stages.some((s) => s.decisions.some((d) => d.personId === id && d.decision === 'pending'))

export function ApprovalsWorkspace() {
  const { company: c, me, can } = useHub()
  const [tab, setTab] = useParam('tab', 'pending')
  const [sel, setSel] = useParam('id')
  const canCase = can('complaints.case')
  const visible = c.approvals.filter((r) => (!r.restricted || canCase) && (mine(r, me.id) || r.submittedBy === me.id || can('manage')))
  const lists: Record<string, ApprovalRound[]> = {
    pending: visible.filter((r) => myPending(r, me.id) && r.status === 'Pending'),
    submitted: visible.filter((r) => r.submittedBy === me.id),
    decided: visible.filter((r) => mine(r, me.id) && !myPending(r, me.id)),
    all: visible,
  }
  const rows = lists[tab] ?? lists.pending
  const selected = c.approvals.find((r) => r.id === sel)
  const selectedAllowed = selected && visible.includes(selected)

  return (
    <div className="flex flex-col gap-4">
      <TabBar
        label="Approval lists"
        value={tab}
        onChange={(v) => setTab(v)}
        tabs={[
          { id: 'pending', label: 'Needs my decision', count: lists.pending.length },
          { id: 'submitted', label: 'Submitted by me', count: lists.submitted.length },
          { id: 'decided', label: 'I decided', count: lists.decided.length },
          ...(can('manage') ? [{ id: 'all', label: 'All rounds', count: lists.all.length }] : []),
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{tab === 'pending' ? 'Nothing needs your decision right now.' : 'No approval rounds here.'}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSel(r.id)} className={cn('flex w-full flex-col gap-1.5 px-4 py-3 text-left', sel === r.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                    <span className="flex flex-wrap items-center gap-2">
                      <IdChip>{r.id}</IdChip>
                      <span className="text-xs text-muted-foreground">{r.itemType}</span>
                      <StatusPill status={r.status} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{r.itemTitle}</span>
                    <ApprovalProgress compact decisions={r.stages.flatMap((s) => s.decisions)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {sel && !selectedAllowed ? (
          <StateBlock title="Approval unavailable" body="This approval round does not exist or is outside your permissions." />
        ) : selected ? (
          <RoundDetail r={selected} />
        ) : (
          <StateBlock title="Select an approval round" body="Pick a round to see each approver's decision and act on your own." />
        )}
      </div>
    </div>
  )
}

function RoundDetail({ r }: { r: ApprovalRound }) {
  const { company: c, me, decide } = useHub()
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const canAct = r.status === 'Pending' && myPending(r, me.id)
  const proposal = r.itemType === 'Proposal' ? c.proposals.find((p) => p.id === r.itemId) : undefined

  const act = (d: 'approved' | 'changes' | 'rejected') => {
    if (d !== 'approved' && !note.trim()) return setErr('A note is required when requesting changes or rejecting.')
    decide(r.id, d, note.trim() || undefined)
    setNote('')
    setErr('')
    toast.success(d === 'approved' ? 'Approved' : d === 'changes' ? 'Changes requested' : 'Rejected', { description: 'The source record was updated.' })
  }

  return (
    <Panel
      title={r.itemTitle}
      description={`${r.itemType} · ${r.revision} · round ${r.round} · ${r.workflowVersion}`}
      action={
        <Link href={sourceHref(r)} className="text-xs text-info hover:underline">
          Open source record
        </Link>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <dl className="grid grid-cols-2 gap-4">
          <KV label="Submitted by">
            <PersonLink id={r.submittedBy} />
          </KV>
          <KV label="Submitted">{r.submittedAt}</KV>
          <KV label="Status">
            <StatusPill status={r.status} />
          </KV>
          {r.amount !== undefined && <KV label="Amount">{new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(r.amount)}</KV>}
        </dl>
        {proposal ? (
          <div className="rounded-md border border-border p-4">
            <ProposalDetails p={proposal} />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground">{r.summary}</p>
        )}
        {proposal && r.status === 'Pending' && <p className="text-xs text-muted-foreground">On approval this proposal is converted into a project automatically.</p>}
        <Callout tone="info" title="Every listed approver must approve">
          One change request or rejection stops the round. Resubmission starts a new round against a new revision.
        </Callout>
        {r.stages.map((s, i) => (
          <section key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <h3 className="flex items-center justify-between text-sm font-semibold text-foreground">
              {s.name} <span className="text-xs font-normal text-muted-foreground">{s.mode}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {s.decisions.map((d) => {
                const m = decisionMeta[d.decision]
                return (
                  <li key={d.personId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <PersonLink id={d.personId} showRole />
                    <span className="flex flex-col items-end gap-0.5">
                      <StatusPill status={m.label} tone={m.tone} />
                      {d.at && <span className="font-mono text-[11px] text-muted-foreground">{d.at}</span>}
                      {d.note && <span className="text-xs text-muted-foreground">“{d.note}”</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {r.priorRounds && r.priorRounds.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-foreground">Earlier rounds</h3>
            {r.priorRounds.map((p) => (
              <p key={p.round} className="text-xs text-muted-foreground">
                Round {p.round} ({p.revision}): {p.status} — {p.note}
              </p>
            ))}
          </section>
        )}
        {canAct && (
          <section className="flex flex-col gap-3 rounded-md border border-ring/40 bg-accent/40 p-3">
            <h3 className="text-sm font-semibold text-foreground">Your decision</h3>
            {err && <Callout tone="danger" title={err} />}
            <Field label="Note" hint="Required for change requests and rejections.">
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => act('approved')}>Approve</Button>
              <Button variant="outline" onClick={() => act('changes')}>
                Request changes
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => act('rejected')}>
                Reject
              </Button>
            </div>
          </section>
        )}
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">History</h3>
          {r.history.map((h, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              <span className="font-mono">{h.at}</span> {empOf(c, h.by)?.fullName ?? 'System'}: {h.text}
            </p>
          ))}
        </section>
      </div>
    </Panel>
  )
}

/** Opens an approval round for any source record using the configured workflow; returns its id. */
export function buildRound(c: Parameters<Parameters<ReturnType<typeof useHub>['mutate']>[0]>[0], input: { id: string; itemType: ApprovalRound['itemType']; itemId: string; itemTitle: string; revision: string; approverIds: string[]; submittedBy: string; now: string; summary: string; amount?: number; restricted?: boolean }) {
  const prior = c.approvals.filter((r) => r.itemId === input.itemId && r.itemType === input.itemType)
  prior.forEach((r) => r.status === 'Pending' && (r.status = 'Superseded'))
  const wf = c.workflows.find((w) => w.appliesTo === input.itemType)
  const ids = Array.from(new Set(input.approverIds)).filter(Boolean)
  const round: ApprovalRound = {
    id: input.id,
    itemType: input.itemType,
    itemId: input.itemId,
    itemTitle: input.itemTitle,
    revision: input.revision,
    round: prior.length + 1,
    workflowVersion: wf ? `${wf.name} v${wf.version}` : 'Named approvers',
    status: 'Pending',
    submittedBy: input.submittedBy,
    submittedAt: input.now,
    summary: input.summary,
    amount: input.amount,
    restricted: input.restricted,
    stages: [
      {
        name: 'Approval',
        mode: 'Concurrent ALL',
        decisions: ids.map((personId) => {
          const e = c.employees.find((x) => x.id === personId)
          return { personId, decision: e?.status === 'active' ? 'pending' : 'inactive' }
        }),
      },
    ],
    priorRounds: prior.map((p) => ({ round: p.round, revision: p.revision, status: p.status, note: p.history.at(-1)?.text ?? '' })),
    history: [{ at: input.now, by: input.submittedBy, text: `Submitted to ${ids.length} approver(s)` }],
  }
  if (round.stages[0].decisions.some((d) => d.decision === 'inactive')) round.status = 'Blocked — approver inactive'
  c.approvals.unshift(round)
  return round.id
}
