'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Lock, Pencil, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import type { Proposal } from '@/lib/fixtures'
import { ApprovalProgress, Callout, IdChip, Panel, SimLabel, StatusPill } from '@/components/hub/primitives'
import { useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { buildRound } from '@/components/approvals/approvals'
import { ANALYSIS_CREDITS, AnalysisView, ProposalDetails, requestAnalysis } from '@/components/company/proposal-report'
import { proposalEditable } from '@/components/company/proposal-editor'
import { cn } from '@/lib/utils'

const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

function NewProposalButton({ size = 'sm', variant = 'outline' }: { size?: 'sm' | 'default'; variant?: 'outline' | 'default' }) {
  return (
    <Link href="/proposals/new" className={buttonVariants({ size, variant })}><Plus /> New proposal</Link>
  )
}

export function Proposals() {
  const { company: c, me, mutate } = useHub()
  const visible = c.proposals.filter((p) => p.status !== 'Draft' || p.authorId === me.id)
  const [sel, setSel] = useParam('id', visible[0]?.id ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const p = visible.find((x) => x.id === sel) ?? visible[0]
  const round = p && c.approvals.find((r) => r.id === p.approvalId)
  const editable = (x: Proposal) => proposalEditable(x, me.id)

  const submitExisting = (x: Proposal) => {
    if (!x.approverIds.length) return toast.error('No approvers configured', { description: 'Open the proposal editor to choose approvers.' })
    mutate((co, ctx) => {
      const t = co.proposals.find((y) => y.id === x.id)!
      if (t.status !== 'Draft' && t.status !== 'Changes requested') return
      if (t.status === 'Changes requested') {
        t.revision++
        t.revisions.push({ rev: t.revision, at: ctx.now, by: ctx.me.id, note: 'Resubmitted' })
        if (t.analysis) t.analysis.rev = t.revision
      }
      t.status = 'Submitted'
      t.updated = ctx.now
      t.approvalId = buildRound(co, { id: ctx.id('APR'), itemType: 'Proposal', itemId: t.id, itemTitle: t.title, revision: `r${t.revision}`, approverIds: t.approverIds, submittedBy: ctx.me.id, now: ctx.now, summary: t.problem, amount: t.budgetDev })
      ctx.audit('Submitted proposal', t.id, `r${t.revision}`)
    })
    toast.success('Submitted for approval', { description: 'The proposal is now locked.' })
  }

  const analyse = async (x: Proposal) => {
    const op = `analysis-${x.id}-r${x.revision}`
    if (c.credits.ops.includes(op) && x.analysis?.rev === x.revision) return toast('Already analysed for this revision')
    if (c.credits.limit - c.credits.used < ANALYSIS_CREDITS) return toast.error('AI credits exhausted', { description: 'Ask an admin to add credits. Core features keep working.' })
    setBusy(x.id)
    try {
      const report = await requestAnalysis(c, x, x.revision, stamp())
      mutate((co, ctx) => {
        const t = co.proposals.find((y) => y.id === x.id)
        if (t) t.analysis = report
        co.credits.used += ANALYSIS_CREDITS
        co.credits.ops.push(op)
        ctx.audit('Generated AI analysis', x.id, `${ANALYSIS_CREDITS} credits`)
      })
      toast.success('AI analysis generated', { description: `${ANALYSIS_CREDITS} credits used. Review before relying on it.` })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (!p) return <StateBlock title="No proposals yet" body="Anyone can propose a product, service or process change." action={<NewProposalButton size="default" variant="default" />} />

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Proposals" action={<NewProposalButton />}>
        <ul className="divide-y divide-border">
          {visible.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setSel(x.id)} aria-current={p.id === x.id} className={cn('flex w-full flex-col gap-1 px-4 py-3 text-left', p.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                <span className="flex items-center gap-2">
                  <IdChip>{x.id}</IdChip>
                  <span className="text-xs text-muted-foreground">by {empOf(c, x.authorId)?.fullName}</span>
                </span>
                <span className="text-sm font-medium text-foreground">{x.title || 'Untitled draft'}</span>
                <StatusPill status={x.status} className="self-start" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex min-w-0 flex-col gap-4">
        <Panel
          title={p.title || 'Untitled draft'}
          description={`${p.id} · revision ${p.revision} · updated ${p.updated}`}
          action={
            <span className="flex items-center gap-2">
              <StatusPill status={p.status} />
              {editable(p) && (
                <>
                  <Link href={`/proposals/${p.id}/edit`} className={buttonVariants({ size: 'sm', variant: 'outline' })}><Pencil /> Edit</Link>
                  <Button size="sm" onClick={() => submitExisting(p)}>{p.status === 'Draft' ? 'Submit' : 'Resubmit'}</Button>
                </>
              )}
            </span>
          }
        >
          <div className="flex flex-col gap-4 p-4">
            {p.converted && (
              <Callout tone="success" title={`Approved and converted to a ${p.converted.type}`}>
                <span className="flex items-center gap-2">
                  <IdChip href={p.converted.type === 'backlog' ? `/backlog?id=${p.converted.id}` : p.converted.type === 'project' ? `/projects/${p.converted.id}` : `/products/${p.converted.id}`}>{p.converted.id}</IdChip>
                  <span className="text-xs text-muted-foreground">on {p.converted.at}</span>
                </span>
              </Callout>
            )}
            {p.status === 'Draft' && p.authorId === me.id && <Callout tone="info" title="Draft — only you can see this">Edit any field as often as you like. Submitting sends it to approvers and locks it.</Callout>}
            {p.status === 'Changes requested' && p.authorId === me.id && <Callout tone="warning" title="Approvers requested changes">Edit the proposal and resubmit it as a new revision.</Callout>}
            {p.authorId === me.id && !editable(p) && (
              <Callout tone="muted" icon={<Lock className="size-4" />} title="Locked">Submitted proposals can&apos;t be edited by the author while under review or after a decision.</Callout>
            )}
            <ProposalDetails p={p} showAnalysis={false} />
          </div>
        </Panel>
        {round ? (
          <Panel title="Approval" description={`${round.id} · ${round.workflowVersion} · round ${round.round}`} action={<ApprovalProgress decisions={round.stages.flatMap((s) => s.decisions)} />}>
            <div className="flex flex-col gap-2 p-4">
              <p className="text-sm text-foreground">Every listed approver must approve. Once approved, the proposal is converted into a project automatically.</p>
              <Link href={`/approvals?id=${round.id}`} className="text-sm font-medium text-info hover:underline">Open approval {round.id}</Link>
            </div>
          </Panel>
        ) : (
          <Callout tone="muted" title="Not submitted">Drafts are private to the author until submitted.</Callout>
        )}
        <Panel
          title="AI analysis"
          description="Customers you have, customers you can reach, and new customers the marketing plan can win."
          action={
            <span className="flex items-center gap-2">
              <SimLabel>AI · {ANALYSIS_CREDITS} credits</SimLabel>
              {editable(p) && (
                <Link href={`/proposals/${p.id}/edit`} className={buttonVariants({ size: 'sm', variant: 'outline' })}><Pencil /> Edit report</Link>
              )}
            </span>
          }
        >
          <div className="flex flex-col gap-4 p-4">
            {p.analysis ? <AnalysisView a={p.analysis} /> : <p className="text-sm text-muted-foreground">No analysis for this proposal yet.</p>}
            {p.authorId !== me.id && p.analysis?.rev !== p.revision && (
              <Button size="sm" variant="outline" className="self-start" disabled={busy === p.id} onClick={() => analyse(p)}>
                {busy === p.id ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy === p.id ? 'Analysing…' : p.analysis ? 'Re-analyse this revision' : 'Run AI analysis'}
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
