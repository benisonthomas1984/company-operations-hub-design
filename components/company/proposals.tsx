'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Pencil, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import type { AnalysisReport, Proposal } from '@/lib/fixtures'
import { ApprovalProgress, Callout, IdChip, Panel, SimLabel, StatusPill } from '@/components/hub/primitives'
import { Field, FormSheet, PeoplePicker, Select, TextArea, TextInput, required, useForm, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { buildRound } from '@/components/approvals/approvals'
import { ANALYSIS_CREDITS, AnalysisEditor, AnalysisView, ProposalDetails, requestAnalysis } from '@/components/company/proposal-report'
import { cn } from '@/lib/utils'

const blank = { title: '', kind: 'Product', idea: '', problem: '', solution: '', targetCustomer: '', geography: '', industry: '', benefit: '', marketingPlan: '', budgetDev: '', timeline: '' }
const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

export function Proposals() {
  const { company: c, me, mutate } = useHub()
  const visible = c.proposals.filter((p) => p.status !== 'Draft' || p.authorId === me.id)
  const [sel, setSel] = useParam('id', visible[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const [approvers, setApprovers] = useState<string[]>(c.committees.find((m) => /board/i.test(m.name))?.memberIds ?? [])
  const [draftReport, setDraftReport] = useState<AnalysisReport | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<AnalysisReport | null>(null)
  const f = useForm(blank)
  const p = visible.find((x) => x.id === sel) ?? visible[0]
  const round = p && c.approvals.find((r) => r.id === p.approvalId)
  const editable = (x: Proposal) => x.authorId === me.id && (x.status === 'Draft' || x.status === 'Changes requested')

  const hasCredits = () => {
    if (c.credits.limit - c.credits.used >= ANALYSIS_CREDITS) return true
    toast.error('AI credits exhausted', { description: 'Ask an admin to add credits. Core features keep working.' })
    return false
  }
  const charge = (op: string, target: string) =>
    mutate((co, ctx) => {
      co.credits.used += ANALYSIS_CREDITS
      co.credits.ops.push(op)
      ctx.audit('Generated AI analysis', target, `${ANALYSIS_CREDITS} credits`)
    })

  const analyseDraft = async () => {
    if (!f.validate({ title: required('Title'), problem: required('Problem'), solution: required('Solution'), targetCustomer: required('Target customer') })) return toast.error('Fill in the required fields before running the analysis')
    if (!hasCredits()) return
    setBusy('form')
    try {
      const v = f.values
      const report = await requestAnalysis(c, { ...v, kind: v.kind as Proposal['kind'], budgetDev: v.budgetDev ? Number(v.budgetDev) : undefined }, 1, stamp())
      setDraftReport(report)
      charge(`analysis-draft-${Date.now()}`, 'new proposal')
      toast.success('AI analysis ready', { description: 'Review and edit the report below before submitting.' })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const create = (submit: boolean) => {
    if (!f.validate({ title: required('Title'), problem: required('Problem'), solution: required('Solution'), targetCustomer: required('Target customer') })) return
    if (submit && approvers.length === 0) return toast.error('Choose at least one approver')
    let newId = ''
    mutate((co, ctx) => {
      newId = ctx.id('PRP')
      const v = f.values
      const prop: Proposal = {
        id: newId,
        title: v.title,
        kind: v.kind as Proposal['kind'],
        idea: v.idea,
        problem: v.problem,
        solution: v.solution,
        targetCustomer: v.targetCustomer,
        geography: v.geography,
        industry: v.industry,
        benefit: v.benefit,
        marketingPlan: v.marketingPlan,
        steps: '',
        skills: '',
        dependencies: '',
        timeline: v.timeline,
        risks: '',
        docs: [],
        budgetMode: v.budgetDev ? 'cash' : 'none',
        budgetDev: v.budgetDev ? Number(v.budgetDev) : undefined,
        currency: 'EUR',
        authorId: ctx.me.id,
        status: submit ? 'Submitted' : 'Draft',
        revision: 1,
        revisions: [{ rev: 1, at: ctx.now, by: ctx.me.id, note: 'Created' }],
        analysis: draftReport ?? undefined,
        approverMode: 'named',
        approverIds: approvers,
        updated: ctx.now,
      }
      co.proposals.unshift(prop)
      if (submit) prop.approvalId = buildRound(co, { id: ctx.id('APR'), itemType: 'Proposal', itemId: newId, itemTitle: v.title, revision: 'r1', approverIds: approvers, submittedBy: ctx.me.id, now: ctx.now, summary: v.problem, amount: prop.budgetDev })
      ctx.audit(submit ? 'Submitted proposal' : 'Saved proposal draft', newId, v.title)
    })
    toast.success(submit ? 'Proposal submitted for approval' : 'Draft saved')
    setOpen(false)
    setDraftReport(null)
    f.reset()
    setSel(newId)
  }

  const submitExisting = (x: Proposal) => {
    if (!x.approverIds.length) return toast.error('No approvers configured on this proposal')
    mutate((co, ctx) => {
      const t = co.proposals.find((y) => y.id === x.id)!
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
    toast.success('Submitted for approval')
  }

  const analyse = async (x: Proposal) => {
    const op = `analysis-${x.id}-r${x.revision}`
    if (c.credits.ops.includes(op) && x.analysis?.rev === x.revision) return toast('Already analysed for this revision', { description: 'Edit the report instead — no extra credits charged.' })
    if (!hasCredits()) return
    setBusy(x.id)
    try {
      const report = await requestAnalysis(c, x, x.revision, stamp())
      mutate((co) => {
        const t = co.proposals.find((y) => y.id === x.id)
        if (t) t.analysis = report
      })
      charge(op, x.id)
      toast.success('AI analysis generated', { description: `${ANALYSIS_CREDITS} credits used. Review before relying on it.` })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const saveReport = () => {
    if (!p || !editing) return
    mutate((co, ctx) => {
      const t = co.proposals.find((y) => y.id === p.id)!
      t.analysis = { ...editing, editedBy: ctx.me.id, editedAt: ctx.now }
      t.updated = ctx.now
      ctx.audit('Edited AI analysis', t.id, `r${t.revision}`)
    })
    setEditing(null)
    toast.success('Report updated')
  }

  return (
    <>
      {!p ? (
        <StateBlock title="No proposals yet" body="Anyone can propose a product, service or process change." action={<Button onClick={() => setOpen(true)}><Plus /> New proposal</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Panel title="Proposals" action={<Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus /> New</Button>}>
            <ul className="divide-y divide-border">
              {visible.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setSel(x.id)} aria-current={p.id === x.id} className={cn('flex w-full flex-col gap-1 px-4 py-3 text-left', p.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                    <span className="flex items-center gap-2">
                      <IdChip>{x.id}</IdChip>
                      <span className="text-xs text-muted-foreground">by {empOf(c, x.authorId)?.fullName}</span>
                    </span>
                    <span className="text-sm font-medium text-foreground">{x.title}</span>
                    <StatusPill status={x.status} className="self-start" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <div className="flex min-w-0 flex-col gap-4">
            <Panel
              title={p.title}
              description={`${p.id} · revision ${p.revision} · updated ${p.updated}`}
              action={
                <span className="flex items-center gap-2">
                  <StatusPill status={p.status} />
                  {editable(p) && (
                    <Button size="sm" onClick={() => submitExisting(p)}>
                      {p.status === 'Draft' ? 'Submit' : 'Resubmit'}
                    </Button>
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
                  {editable(p) && p.analysis && !editing && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(p.analysis!)}><Pencil /> Edit report</Button>
                  )}
                </span>
              }
            >
              <div className="flex flex-col gap-4 p-4">
                {editing ? (
                  <>
                    <AnalysisEditor value={editing} onChange={setEditing} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveReport}>Save report</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </>
                ) : p.analysis ? (
                  <AnalysisView a={p.analysis} />
                ) : (
                  <p className="text-sm text-muted-foreground">No analysis for this proposal yet.</p>
                )}
                {!editing && (p.authorId === me.id ? editable(p) : true) && p.analysis?.rev !== p.revision && (
                  <Button size="sm" variant="outline" className="self-start" disabled={busy === p.id} onClick={() => analyse(p)}>
                    {busy === p.id ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy === p.id ? 'Analysing…' : p.analysis ? 'Re-analyse this revision' : 'Run AI analysis'}
                  </Button>
                )}
                {!editable(p) && p.authorId === me.id && p.analysis && <p className="text-xs text-muted-foreground">The report is locked while the proposal is under review or decided.</p>}
              </div>
            </Panel>
          </div>
        </div>
      )}
      <FormSheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraftReport(null) }} title="New proposal" description="Run the AI analysis, adjust the report if needed, then save as a draft or submit." onSubmit={() => create(true)} submitLabel="Submit for approval" secondary={<Button type="button" variant="outline" onClick={() => create(false)}>Save draft</Button>} wide>
        <Field label="Title" required error={f.errors.title}><TextInput {...f.bind('title')} /></Field>
        <Field label="Type">
          <Select {...f.bind('kind')} options={['Product', 'Service', 'Process'].map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="Problem" required error={f.errors.problem}><TextArea rows={3} {...f.bind('problem')} /></Field>
        <Field label="Proposed solution" required error={f.errors.solution}><TextArea rows={3} {...f.bind('solution')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Target customer" required error={f.errors.targetCustomer}><TextInput {...f.bind('targetCustomer')} /></Field>
          <Field label="Geography"><TextInput {...f.bind('geography')} /></Field>
          <Field label="Industry"><TextInput {...f.bind('industry')} /></Field>
        </div>
        <Field label="Expected benefit"><TextArea rows={2} {...f.bind('benefit')} /></Field>
        <Field label="Marketing plan" hint="Channels, campaigns and budget. The AI uses this to estimate new customer acquisition."><TextArea rows={3} {...f.bind('marketingPlan')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Development budget (EUR)" hint="Leave empty for effort-only"><TextInput type="number" min={0} inputMode="numeric" {...f.bind('budgetDev')} /></Field>
          <Field label="Timeline"><TextInput {...f.bind('timeline')} /></Field>
        </div>
        <section className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">AI analysis</span>
              <span className="text-xs text-muted-foreground">Attached to the proposal so approvers see it. {ANALYSIS_CREDITS} credits per run.</span>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={busy === 'form'} onClick={analyseDraft}>
              {busy === 'form' ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy === 'form' ? 'Analysing…' : draftReport ? 'Run again' : 'Run AI analysis'}
            </Button>
          </div>
          {draftReport && <AnalysisEditor value={draftReport} onChange={setDraftReport} />}
        </section>
        <PeoplePicker label="Approvers (all must approve)" value={approvers} onChange={setApprovers} />
      </FormSheet>
    </>
  )
}
